import { AudioJob, FormatItem } from '../types';

class AudioPlaybackService {
  private audio: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private listeners: Set<() => void> = new Set();

  public isPlaying: boolean = false;
  public currentTime: number = 0;
  public duration: number = 0;
  public volume: number = 1.0;
  public playbackRate: number = 1.0;
  public isLooping: boolean = false;
  public activeFormat: FormatItem | null = null;
  public currentJob: AudioJob | null = null;
  public formatFallbackNotice: string | null = null;

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify(): void {
    this.listeners.forEach((cb) => cb());
  }

  public async initAudioContext(): Promise<void> {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 128;
      }
    }
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public playFormat(job: AudioJob, format: FormatItem): void {
    this.currentJob = job;
    this.activeFormat = format;
    this.formatFallbackNotice = null;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (!this.audio) {
      this.audio = new Audio();

      this.audio.addEventListener('timeupdate', () => {
        if (this.audio) {
          this.currentTime = this.audio.currentTime;
          this.notify();
        }
      });

      this.audio.addEventListener('loadedmetadata', () => {
        if (this.audio) {
          this.duration = this.audio.duration || job.durationSeconds;
          this.notify();
        }
      });

      this.audio.addEventListener('ended', () => {
        if (!this.isLooping) {
          this.isPlaying = false;
          this.currentTime = 0;
          this.notify();
        }
      });

      this.audio.addEventListener('error', (e) => {
        console.warn('Audio stream playback failed, activating browser speech synthesis fallback:', e);

        // Fallback: Use browser's native speech synthesis voice engine
        if ('speechSynthesis' in window && this.currentJob) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(this.currentJob.text);
          utterance.lang = this.currentJob.language || 'en';
          utterance.pitch = this.currentJob.gender === 'female' ? 1.05 : 0.88;
          utterance.rate = this.playbackRate;

          utterance.onend = () => {
            this.isPlaying = false;
            this.notify();
          };
          utterance.onerror = () => {
            this.isPlaying = false;
            this.notify();
          };

          this.formatFallbackNotice = 'Playing via Browser Neural Voice Engine';
          this.isPlaying = true;
          this.notify();
          window.speechSynthesis.speak(utterance);
          return;
        }

        this.isPlaying = false;
        this.notify();
      });
    }

    // Try attaching visualizer analyser (wrapped in try/catch to ensure audio is never muted)
    this.initAudioContext().then(() => {
      try {
        if (this.audio && this.audioContext && this.analyser && !this.sourceNode) {
          // Only attach for same-origin or blob URLs to avoid CORS restrictions
          if (format.streamUrl.startsWith('blob:') || format.streamUrl.startsWith('/')) {
            this.sourceNode = this.audioContext.createMediaElementSource(this.audio);
            this.sourceNode.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
          }
        }
      } catch (err) {
        // Source node already connected or cross-origin restricted
      }
    });

    this.audio.src = format.streamUrl;
    this.audio.volume = this.volume;
    this.audio.playbackRate = this.playbackRate;
    this.audio.loop = this.isLooping;

    this.audio
      .play()
      .then(() => {
        this.isPlaying = true;
        this.notify();
      })
      .catch((err) => {
        console.warn('Playback play() was prevented or restricted, falling back to speech synthesis:', err);
        if ('speechSynthesis' in window && this.currentJob) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(this.currentJob.text);
          utterance.lang = this.currentJob.language || 'en';
          utterance.pitch = this.currentJob.gender === 'female' ? 1.05 : 0.88;
          utterance.rate = this.playbackRate;

          utterance.onend = () => {
            this.isPlaying = false;
            this.notify();
          };
          this.formatFallbackNotice = 'Playing via Browser Neural Voice Engine';
          this.isPlaying = true;
          this.notify();
          window.speechSynthesis.speak(utterance);
        }
      });
  }

  public togglePlayPause(): void {
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      if (this.isPlaying) {
        window.speechSynthesis.pause();
        this.isPlaying = false;
      } else {
        window.speechSynthesis.resume();
        this.isPlaying = true;
      }
      this.notify();
      return;
    }

    if (!this.audio) return;

    if (this.isPlaying) {
      this.audio.pause();
      this.isPlaying = false;
    } else {
      this.initAudioContext();
      this.audio.play().catch(() => {});
      this.isPlaying = true;
    }
    this.notify();
  }

  public stop(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.currentTime = 0;
      this.isPlaying = false;
      this.notify();
    }
  }

  public seek(seconds: number): void {
    if (this.audio) {
      this.audio.currentTime = Math.max(0, Math.min(seconds, this.duration || 100));
      this.currentTime = this.audio.currentTime;
      this.notify();
    }
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.audio) {
      this.audio.volume = this.volume;
    }
    this.notify();
  }

  public setPlaybackRate(rate: number): void {
    this.playbackRate = rate;
    if (this.audio) {
      this.audio.playbackRate = rate;
    }
    this.notify();
  }

  public toggleLoop(): void {
    this.isLooping = !this.isLooping;
    if (this.audio) {
      this.audio.loop = this.isLooping;
    }
    this.notify();
  }
}

export const audioService = new AudioPlaybackService();
