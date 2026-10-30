import React, { useEffect, useRef } from 'react';
import { Play, Pause, Square, Repeat, Volume2, VolumeX, Globe, User } from 'lucide-react';
import { audioService } from '../services/audio-service';
import { AudioJob, FormatItem } from '../types';

interface WaveformPlayerProps {
  currentJob: AudioJob | null;
  activeFormat: FormatItem | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  isLooping: boolean;
}

export const WaveformPlayer: React.FC<WaveformPlayerProps> = ({
  currentJob,
  activeFormat,
  isPlaying,
  currentTime,
  duration,
  volume,
  playbackRate,
  isLooping,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const mins = Math.floor(secs / 60);
    const remaining = Math.floor(secs % 60);
    return `${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const analyser = audioService.getAnalyser();
      const width = canvas.width;
      const height = canvas.height;

      // Read theme colors from computed styles
      const computed = getComputedStyle(canvas);
      const bgInput = computed.getPropertyValue('--bg-input').trim() || '#0d1217';
      const waveGrad1 = computed.getPropertyValue('--wave-gradient-1').trim() || '#6366f1';
      const waveGrad2 = computed.getPropertyValue('--wave-gradient-2').trim() || '#a5b4fc';
      const borderColor = computed.getPropertyValue('--border-color').trim() || '#263238';

      ctx.clearRect(0, 0, width, height);

      ctx.fillStyle = bgInput;
      ctx.fillRect(0, 0, width, height);

      if (analyser && isPlaying) {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        const barWidth = (width / bufferLength) * 2.2;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * (height * 0.85);

          const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
          gradient.addColorStop(0, waveGrad1);
          gradient.addColorStop(1, waveGrad2);

          ctx.fillStyle = gradient;
          ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);

          x += barWidth;
        }
      } else {
        const barCount = 48;
        const barWidth = width / barCount;
        for (let i = 0; i < barCount; i++) {
          const pseudoHeight = Math.sin((i / barCount) * Math.PI) * (height * 0.38) + 6;
          ctx.fillStyle = borderColor;
          ctx.fillRect(i * barWidth + 2, (height - pseudoHeight) / 2, barWidth - 3, pseudoHeight);
        }
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying]);

  if (!currentJob || !activeFormat) {
    return (
      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 text-center transition-colors">
        <p className="text-xs text-[var(--text-muted)]">
          Enter text above and click Convert to generate and preview speech audio across all formats.
        </p>
      </div>
    );
  }

  const genderLabel = currentJob.gender === 'female' ? 'Female 👩' : 'Male 👨';

  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 shadow-xl transition-colors">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
              Audio Player:
            </span>
            <span className="text-xs font-mono font-medium text-[var(--accent-primary)] bg-[var(--accent-subtle)] px-2 py-0.5 rounded border border-[var(--border-color)]">
              {activeFormat.fileName}
            </span>
            {/* Language & Gender indicator */}
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--text-muted)] bg-[var(--bg-input)] px-2 py-0.5 rounded border border-[var(--border-color)]">
              <Globe className="h-3 w-3 text-[var(--accent-primary)]" />
              <span>{currentJob.languageName || currentJob.language.toUpperCase()}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--text-muted)] bg-[var(--bg-input)] px-2 py-0.5 rounded border border-[var(--border-color)]">
              <User className="h-3 w-3 text-[var(--accent-primary)]" />
              <span>{genderLabel}</span>
            </span>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">
            Codec: <span className="text-[var(--text-primary)] font-mono">{activeFormat.codec}</span> · MIME: <span className="font-mono">{activeFormat.mimeType}</span>
          </p>
        </div>

        <div className="text-right">
          <span className="text-xs font-mono tabular-nums text-[var(--text-primary)] font-semibold">
            {formatTime(currentTime)} / {formatTime(duration || currentJob.durationSeconds)}
          </span>
          <div className="text-[10px] text-[var(--accent-primary)] mt-0.5">
            {currentJob.synthesizer} ({currentJob.voice})
          </div>
        </div>
      </div>

      {/* Waveform Canvas */}
      <div className="relative overflow-hidden rounded-lg border border-[var(--border-color)]">
        <canvas
          ref={canvasRef}
          width={700}
          height={80}
          className="h-20 w-full block"
        />

        {/* Scrubber */}
        <input
          type="range"
          min={0}
          max={duration || currentJob.durationSeconds || 10}
          step={0.05}
          value={currentTime}
          onChange={(e) => audioService.seek(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-label="Audio scrubber"
        />
      </div>

      {/* Playback Controls */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        {/* Play / Pause / Stop */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => audioService.togglePlayPause()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-primary)] hover:brightness-110 text-white shadow-md shadow-[var(--accent-primary)]/30 transition-all active:scale-95"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => audioService.stop()}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
            aria-label="Stop"
          >
            <Square className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => audioService.toggleLoop()}
            className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors ${
              isLooping
                ? 'border-[var(--accent-primary)] bg-[var(--accent-subtle)] text-[var(--accent-primary)]'
                : 'border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
            title="Loop playback"
          >
            <Repeat className="h-3.5 w-3.5" />
            <span>Loop Audio</span>
          </button>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center gap-1 bg-[var(--bg-input)] p-1 rounded-lg border border-[var(--border-color)]">
          <span className="text-[11px] text-[var(--text-muted)] px-1.5 font-medium">Speed:</span>
          {[0.75, 1.0, 1.25, 1.5].map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() => audioService.setPlaybackRate(rate)}
              className={`rounded px-2 py-0.5 text-xs font-mono font-medium transition-colors ${
                playbackRate === rate
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>

        {/* Volume Slider */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => audioService.setVolume(volume > 0 ? 0 : 1)}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => audioService.setVolume(parseFloat(e.target.value))}
            className="h-1.5 w-20 cursor-pointer appearance-none rounded-lg bg-[var(--border-color)] accent-[var(--accent-primary)]"
            aria-label="Volume slider"
          />
        </div>
      </div>
    </div>
  );
};
