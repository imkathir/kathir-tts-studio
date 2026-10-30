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

  // SpeechSynthesis state for client-side static playback
  private isSpeechActive: boolean = false;
  private speechTimer: any = null;
  private speechChunks: string[] = [];
  private currentChunkIndex: number = 0;

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
    this.stop();

    // Check if this is a server stream URL (e.g. /api/stream/...)
    const isServerStream = format.streamUrl.startsWith('/api/');

    if (isServerStream) {
      this.playHtmlAudio(job, format);
    } else {
      // In static client mode (GitHub Pages), use browser SpeechSynthesis
      // so the user hears authentic spoken speech in the detected language!
      this.playSpeechSynthesis(job);
    }
  }

  private playHtmlAudio(job: AudioJob, format: FormatItem): void {
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
        if (this.isLooping) {
          if (this.audio) {
            this.audio.currentTime = 0;
            this.audio.play().catch(() => {});
          }
        } else {
          this.isPlaying = false;
          this.currentTime = 0;
          this.notify();
        }
      });

      this.audio.addEventListener('error', (e) => {
        console.warn('Audio stream error, falling back to client speech synthesis:', e);
        if (this.currentJob) {
          this.playSpeechSynthesis(this.currentJob);
        }
      });
    }

    this.initAudioContext().then(() => {
      try {
        if (this.audio && this.audioContext && this.analyser && !this.sourceNode) {
          if (format.streamUrl.startsWith('blob:') || format.streamUrl.startsWith('/')) {
            this.sourceNode = this.audioContext.createMediaElementSource(this.audio);
            this.sourceNode.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
          }
        }
      } catch (err) {
        // already connected
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
        console.warn('Audio play() failed, falling back to speech synthesis:', err);
        if (this.currentJob) {
          this.playSpeechSynthesis(this.currentJob);
        }
      });
  }

  private playSpeechSynthesis(job: AudioJob): void {
    if (!('speechSynthesis' in window)) {
      console.warn('SpeechSynthesis is not supported in this browser.');
      return;
    }

    window.speechSynthesis.cancel();
    this.stopSpeechTimer();

    this.isSpeechActive = true;
    this.duration = job.durationSeconds || Math.max(2, Math.round(job.text.trim().split(/\s+/).length * 0.42));
    this.currentTime = 0;
    this.isPlaying = true;
    this.notify();

    // Split text into chunks to bypass Chrome's 15-second speech synthesis pause bug
    const rawChunks = job.text.match(/[^.!?\n]+[.!?\n]*/g) || [job.text];
    this.speechChunks = rawChunks.map((s) => s.trim()).filter(Boolean);
    if (this.speechChunks.length === 0) {
      this.speechChunks = [job.text];
    }
    this.currentChunkIndex = 0;

    this.startSpeechTimer();
    this.speakNextChunk(job);
  }

  private speakNextChunk(job: AudioJob): void {
    if (!this.isSpeechActive || this.currentChunkIndex >= this.speechChunks.length) {
      if (this.isLooping && this.isSpeechActive) {
        this.currentChunkIndex = 0;
        this.currentTime = 0;
        this.speakNextChunk(job);
      } else {
        this.isPlaying = false;
        this.isSpeechActive = false;
        this.stopSpeechTimer();
        this.currentTime = 0;
        this.notify();
      }
      return;
    }

    const chunkText = this.speechChunks[this.currentChunkIndex];
    const utterance = new SpeechSynthesisUtterance(chunkText);

    // Language resolution
    const langCode = (job.language || 'en').toLowerCase().split('-')[0];
    utterance.lang = job.language || 'en-US';
    utterance.rate = this.playbackRate;
    utterance.pitch = job.gender === 'female' ? 1.05 : 0.88;
    utterance.volume = this.volume;

    // Best matching voice search
    const voices = window.speechSynthesis.getVoices();
    const langMatches = voices.filter((v) => v.lang.toLowerCase().startsWith(langCode));

    if (langMatches.length > 0) {
      if (job.gender === 'female') {
        const femaleVoice = langMatches.find((v) =>
          /female|zira|samantha|karen|victoria|moira|fiona|susan|monica|kalpana|geeta/i.test(v.name)
        );
        utterance.voice = femaleVoice || langMatches[0];
      } else {
        const maleVoice = langMatches.find((v) =>
          /male|david|mark|george|rishi|daniel|alex|fred|thomas|diego|jorge|valluvar/i.test(v.name)
        );
        utterance.voice = maleVoice || langMatches[0];
      }
    }

    utterance.onend = () => {
      this.currentChunkIndex++;
      if (this.isSpeechActive) {
        this.speakNextChunk(job);
      }
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis utterance error:', e);
      this.currentChunkIndex++;
      if (this.isSpeechActive) {
        this.speakNextChunk(job);
      }
    };

    window.speechSynthesis.speak(utterance);
  }

  private startSpeechTimer(): void {
    this.stopSpeechTimer();
    const intervalMs = 100;
    this.speechTimer = setInterval(() => {
      if (this.isPlaying && this.isSpeechActive) {
        this.currentTime = Math.min(this.duration, this.currentTime + (intervalMs / 1000) * this.playbackRate);
        this.notify();
      }
    }, intervalMs);
  }

  private stopSpeechTimer(): void {
    if (this.speechTimer) {
      clearInterval(this.speechTimer);
      this.speechTimer = null;
    }
  }

  public togglePlayPause(): void {
    if (this.isSpeechActive) {
      if (this.isPlaying) {
        window.speechSynthesis.pause();
        this.isPlaying = false;
        this.stopSpeechTimer();
      } else {
        window.speechSynthesis.resume();
        this.isPlaying = true;
        this.startSpeechTimer();
      }
      this.notify();
      return;
    }

    if (!this.audio) {
      if (this.currentJob && this.activeFormat) {
        this.playFormat(this.currentJob, this.activeFormat);
      }
      return;
    }

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
    this.isSpeechActive = false;
    this.stopSpeechTimer();

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }

    this.currentTime = 0;
    this.isPlaying = false;
    this.notify();
  }

  public seek(seconds: number): void {
    this.currentTime = Math.max(0, Math.min(seconds, this.duration || 100));
    if (this.audio && !this.isSpeechActive) {
      this.audio.currentTime = this.currentTime;
    }
    this.notify();
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
