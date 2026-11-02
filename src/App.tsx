import React, { useState, useEffect, useRef } from 'react';
import { TopBar } from './components/TopBar';
import { AudioInputPanel } from './components/AudioInputPanel';
import { WaveformPlayer } from './components/WaveformPlayer';
import { FormatResultsGrid } from './components/FormatResultsGrid';
import { audioService } from './services/audio-service';
import { AudioJob, FormatItem, ColorTheme, ConversionProgressInfo } from './types';
import { Volume2, Sparkles, CheckCircle2, ShieldCheck, Music2, Apple, Smartphone, Info } from 'lucide-react';
import { createStaticPagesJob } from './utils/client-tts';
import { Logo } from './components/Logo';

export default function App() {
  const [theme, setTheme] = useState<ColorTheme>(() => {
    const saved = localStorage.getItem('kathir_tts_theme') as ColorTheme;
    return saved || 'indigo';
  });

  const [currentJob, setCurrentJob] = useState<AudioJob | null>(null);
  const [activeFormat, setActiveFormat] = useState<FormatItem | null>(null);
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [conversionProgress, setConversionProgress] = useState<string>('');
  const [progressInfo, setProgressInfo] = useState<ConversionProgressInfo | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1.0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [isLooping, setIsLooping] = useState<boolean>(false);

  const formatsRef = useRef<HTMLDivElement | null>(null);
  const studioRef = useRef<HTMLDivElement | null>(null);

  // Sync theme to root element and localStorage
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('kathir_tts_theme', theme);
  }, [theme]);

  useEffect(() => {
    const unsub = audioService.subscribe(() => {
      setIsPlaying(audioService.isPlaying);
      setCurrentTime(audioService.currentTime);
      setDuration(audioService.duration);
      setVolume(audioService.volume);
      setPlaybackRate(audioService.playbackRate);
      setIsLooping(audioService.isLooping);
      setActiveFormat(audioService.activeFormat);
      if (audioService.currentJob) {
        setCurrentJob(audioService.currentJob);
      }
    });
    return unsub;
  }, []);

  const handleConvert = async (params: {
    text: string;
    voice: string;
    gender: 'female' | 'male';
    language: string;
    languageName?: string;
    speechStyle: string;
    sampleRate: number;
    bitrate: string;
    title: string;
    formats: string[];
  }) => {
    setIsConverting(true);
    const initialText =
      params.text.length > 2000
        ? `Preparing full document (${Math.round(params.text.length / 1000)}k chars) across sections...`
        : 'Synthesizing speech from text...';
    setConversionProgress(initialText);
    setProgressInfo({
      status: 'analyzing',
      percent: 3,
      currentChunk: 0,
      totalChunks: Math.max(1, Math.ceil(params.text.length / 360)),
      statusText: initialText,
      charsProcessed: 0,
      totalChars: params.text.length,
    });

    const isGitHubPages = window.location.hostname.includes('github.io');
    const customBackend = localStorage.getItem('kathir_tts_backend_url') || '';

    // On GitHub Pages (or static hosting), execute the client-side speech engine with live chunk progress
    if (isGitHubPages && !customBackend) {
      try {
        const clientJob = await createStaticPagesJob(params, (info) => {
          setProgressInfo(info);
          setConversionProgress(info.statusText);
        });
        setCurrentJob(clientJob);
        audioService.currentJob = clientJob;

        const defaultFmt = clientJob.formats.find((f) => f.format === 'mp3') || clientJob.formats[0];
        if (defaultFmt) {
          setActiveFormat(defaultFmt);
          audioService.activeFormat = defaultFmt;
        }
      } catch (err: any) {
        console.error('Client speech synthesis error:', err);
      } finally {
        setIsConverting(false);
        setProgressInfo(null);
        setConversionProgress('');
      }
      return;
    }

    // Otherwise call backend server (local Express server or user-configured custom backend)
    const endpoint = customBackend
      ? `${customBackend.replace(/\/+$/, '')}/api/convert`
      : '/api/convert';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const clientJob = await createStaticPagesJob(params, (info) => {
          setProgressInfo(info);
          setConversionProgress(info.statusText);
        });
        setCurrentJob(clientJob);
        audioService.currentJob = clientJob;
        const defaultFmt = clientJob.formats.find((f) => f.format === 'mp3') || clientJob.formats[0];
        if (defaultFmt) {
          setActiveFormat(defaultFmt);
          audioService.activeFormat = defaultFmt;
        }
        return;
      }

      setConversionProgress(
        `Transcoding into ${params.formats.length} selected audio format${params.formats.length !== 1 ? 's' : ''}...`
      );
      const data: AudioJob = await res.json();

      setCurrentJob(data);
      audioService.currentJob = data;

      const defaultFmt = data.formats.find((f) => f.format === 'mp3') || data.formats[0];
      if (defaultFmt) {
        setActiveFormat(defaultFmt);
        audioService.activeFormat = defaultFmt;
      }
    } catch (err: any) {
      console.warn('Backend server unreachable, falling back to client-side speech engine:', err);
      const clientJob = await createStaticPagesJob(params, (info) => {
        setProgressInfo(info);
        setConversionProgress(info.statusText);
      });
      setCurrentJob(clientJob);
      audioService.currentJob = clientJob;
      const defaultFmt = clientJob.formats.find((f) => f.format === 'mp3') || clientJob.formats[0];
      if (defaultFmt) {
        setActiveFormat(defaultFmt);
        audioService.activeFormat = defaultFmt;
      }
    } finally {
      setIsConverting(false);
      setProgressInfo(null);
      setConversionProgress('');
    }
  };

  // Convert real spoken text on initial load with popular formats (MP3 & M4A)
  useEffect(() => {
    handleConvert({
      text: 'Welcome to kathirStudio. Convert any text into crystal clear audio files instantly.',
      voice: 'Kore',
      gender: 'female',
      language: 'auto',
      speechStyle: 'Clear, natural studio voice',
      sampleRate: 44100,
      bitrate: '192k',
      title: 'kathirStudio_Welcome',
      formats: ['mp3', 'm4a'],
    });
  }, []);

  const scrollToFormats = () => {
    formatsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToStudio = () => {
    studioRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] flex flex-col font-sans selection:bg-[var(--accent-primary)]/30 selection:text-white transition-colors duration-200">
      {/* Top Bar with Brand and Color Theme Switcher */}
      <TopBar
        onScrollToFormats={scrollToFormats}
        onScrollToStudio={scrollToStudio}
        currentTheme={theme}
        onSelectTheme={setTheme}
      />

      {/* Main Container */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        {/* Studio Hero with Logo */}
        <div ref={studioRef} className="mb-8">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--accent-primary)] mb-3 font-medium">
            <Volume2 className="h-4 w-4" />
            <span>Multi-Language Neural Speech Synthesis</span>
            <span>·</span>
            <span>9 Audio Formats</span>
            <span>·</span>
            <span className="flex items-center gap-1 text-rose-400 font-semibold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
              <Apple className="h-3 w-3" /> Full iPhone Coverage (M4R, M4A, AIFF, CAF)
            </span>
            <span>·</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              <ShieldCheck className="h-3 w-3" /> 100% Free &amp; Unlimited
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Logo size="xl" showText={false} className="hidden sm:flex shrink-0" />
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)]">
                <span>kathir</span>
                <span className="text-[var(--accent-primary)]">Studio</span>{' '}
                <span className="text-[var(--text-muted)] font-normal text-xl sm:text-2xl block sm:inline sm:ml-2">— Universal Text to Audio Format Converter</span>
              </h1>
              <p className="mt-2 text-sm sm:text-base text-[var(--text-muted)] max-w-3xl leading-relaxed">
                Convert text into natural speech across all 9 major audio formats. Full support for Apple iPhone native formats (<strong className="text-[var(--text-primary)]">M4R Ringtone, M4A AAC, Apple AIFF, Core Audio CAF</strong>) alongside Android &amp; Universal formats (<strong className="text-[var(--text-primary)]">MP3, WAV, FLAC, OGG, OPUS</strong>).
              </p>
            </div>
          </div>
        </div>

        {/* Studio Layout */}
        <div className="space-y-8">
          {/* Input Panel with Language Detection & Gender Switcher */}
          <AudioInputPanel
            onConvert={handleConvert}
            isConverting={isConverting}
            conversionProgress={conversionProgress}
            progressInfo={progressInfo}
          />

          {/* Waveform Player */}
          <WaveformPlayer
            currentJob={currentJob}
            activeFormat={activeFormat}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            volume={volume}
            playbackRate={playbackRate}
            isLooping={isLooping}
          />

          {/* Results Grid with Device Filter Pills */}
          {currentJob && (
            <div ref={formatsRef}>
              <FormatResultsGrid
                job={currentJob}
                activeFormat={activeFormat}
                isPlaying={isPlaying}
              />
            </div>
          )}

          {/* Features Highlights */}
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-6 shadow-sm transition-colors">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-subtle)] text-[var(--accent-primary)]">
                  <Apple className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Full iPhone &amp; Apple Coverage</h3>
                  <p className="mt-1 text-xs text-[var(--text-muted)] leading-relaxed">
                    Includes <strong>.m4r</strong> (official iPhone ringtone format for direct iOS syncing), <strong>.m4a</strong> (Apple AAC), <strong>.aiff</strong> (Apple uncompressed), and <strong>.caf</strong> (Core Audio Format).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-subtle)] text-[var(--accent-primary)]">
                  <Volume2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Acoustic Formant-Preserved Voices</h3>
                  <p className="mt-1 text-xs text-[var(--text-muted)] leading-relaxed">
                    Improved male voice engine preserves vocal tract formants and tempo, removing demonic distortion for clear, deep human articulation.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">100% Free &amp; Unlimited Engine</h3>
                  <p className="mt-1 text-xs text-[var(--text-muted)] leading-relaxed">
                    Powered by Google's public neural speech synthesis and local container FFmpeg transcoding. No subscriptions, no tokens, and no hidden costs.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border-color)] bg-[var(--bg-main)] py-6 text-center text-xs text-[var(--text-muted)] transition-colors">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Logo size="sm" showText={false} />
            <span className="font-semibold text-[var(--text-primary)]">
              <span>kathir</span>
              <span className="text-[var(--accent-primary)] font-bold">Studio</span>
            </span>
            <span>·</span>
            <span>Universal Text to Audio Format Converter</span>
          </div>
          <div className="text-[var(--text-muted)]">
            Client-Side Speech Synthesis Engine &amp; Multi-Format Audio Package
          </div>
        </div>
      </footer>
    </div>
  );
}
