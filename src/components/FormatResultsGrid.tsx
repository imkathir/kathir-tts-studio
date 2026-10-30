import React, { useState } from 'react';
import { Download, Play, FolderDown, Music, Check, Globe, User, Smartphone, Apple, Disc, Loader2 } from 'lucide-react';
import { AudioJob, FormatItem } from '../types';
import { audioService } from '../services/audio-service';
import { generateClientZipBlob } from '../utils/client-tts';

interface FormatResultsGridProps {
  job: AudioJob;
  activeFormat: FormatItem | null;
  isPlaying: boolean;
}

type CategoryFilter = 'all' | 'apple' | 'universal' | 'lossless';

export const FormatResultsGrid: React.FC<FormatResultsGridProps> = ({
  job,
  activeFormat,
  isPlaying,
}) => {
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [downloadingFormats, setDownloadingFormats] = useState<Record<string, 'downloading' | 'done' | 'error'>>({});
  const [isDownloadingZip, setIsDownloadingZip] = useState<boolean>(false);

  const handlePlay = (item: FormatItem) => {
    audioService.playFormat(job, item);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const safeJobId = job.jobId || job.id || 'Audio';

  const handleDownloadFormat = async (item: FormatItem) => {
    setDownloadingFormats((prev) => ({ ...prev, [item.format]: 'downloading' }));

    try {
      let downloadHref = item.downloadUrl;
      let shouldRevoke = false;

      // If it's not already a client-side blob URL, fetch as blob first to ensure direct download
      if (!item.downloadUrl.startsWith('blob:')) {
        const res = await fetch(item.downloadUrl);
        if (!res.ok) {
          throw new Error(`Server returned HTTP ${res.status}`);
        }
        const blob = await res.blob();
        downloadHref = window.URL.createObjectURL(blob);
        shouldRevoke = true;
      }

      // Programmatically create and trigger download link
      const link = document.createElement('a');
      link.href = downloadHref;
      link.download = item.fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (shouldRevoke) {
        setTimeout(() => window.URL.revokeObjectURL(downloadHref), 5000);
      }

      setDownloadingFormats((prev) => ({ ...prev, [item.format]: 'done' }));
      setTimeout(() => {
        setDownloadingFormats((prev) => {
          const updated = { ...prev };
          delete updated[item.format];
          return updated;
        });
      }, 2500);
    } catch (err) {
      console.warn('Direct blob download error:', err);
      // Fallback: create client-side download anchor
      try {
        const fallback = document.createElement('a');
        fallback.href = item.downloadUrl;
        fallback.download = item.fileName;
        fallback.target = '_blank';
        fallback.rel = 'noopener noreferrer';
        document.body.appendChild(fallback);
        fallback.click();
        document.body.removeChild(fallback);
      } catch (e) {
        console.error('Fallback download failed:', e);
      }

      setDownloadingFormats((prev) => ({ ...prev, [item.format]: 'error' }));
      setTimeout(() => {
        setDownloadingFormats((prev) => {
          const updated = { ...prev };
          delete updated[item.format];
          return updated;
        });
      }, 3000);
    }
  };

  const handleDownloadZip = async () => {
    setIsDownloadingZip(true);
    const zipFilename = `kathirStudio_${safeJobId}_All_Formats.zip`;

    try {
      const isGitHubPages = typeof window !== 'undefined' && window.location.hostname.includes('github.io');

      // On GitHub Pages or when zipDownloadUrl is a blob or points to client, bundle client-side with JSZip
      if (isGitHubPages || !job.zipDownloadUrl || job.zipDownloadUrl.startsWith('blob:')) {
        const zipBlob = await generateClientZipBlob(job);
        const blobUrl = window.URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = zipFilename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 5000);
        return;
      }

      // Otherwise fetch from server
      const res = await fetch(job.zipDownloadUrl);
      if (!res.ok) throw new Error(`Server returned HTTP ${res.status}`);

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = zipFilename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 5000);
    } catch (err) {
      console.warn('Server ZIP download failed, generating client-side ZIP fallback:', err);
      try {
        const zipBlob = await generateClientZipBlob(job);
        const blobUrl = window.URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = zipFilename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 5000);
      } catch (clientErr) {
        console.error('Client zip generation also failed:', clientErr);
      }
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const genderLabel = job.gender === 'female' ? 'Female 👩' : 'Male 👨';

  const filteredFormats = job.formats.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'apple') return item.category === 'apple' || ['m4a', 'm4r', 'aiff', 'caf'].includes(item.format);
    if (filter === 'universal') return item.category === 'universal' || ['mp3', 'ogg', 'opus'].includes(item.format);
    if (filter === 'lossless') return item.category === 'lossless' || ['wav', 'flac'].includes(item.format);
    return true;
  });

  const appleCount = job.formats.filter((f) => f.category === 'apple' || ['m4a', 'm4r', 'aiff', 'caf'].includes(f.format)).length;
  const universalCount = job.formats.filter((f) => f.category === 'universal' || ['mp3', 'ogg', 'opus'].includes(f.format)).length;
  const losslessCount = job.formats.filter((f) => f.category === 'lossless' || ['wav', 'flac'].includes(f.format)).length;

  return (
    <div className="space-y-6">
      {/* Header bar with Master Download Zip & Filters */}
      <div className="flex flex-col gap-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 shadow-lg transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-bold text-[var(--text-primary)]">Generated Audio Formats</span>
              <span className="rounded bg-[var(--accent-subtle)] px-2.5 py-0.5 text-xs font-mono font-semibold text-[var(--accent-primary)] border border-[var(--border-color)]">
                {job.formats.length} Formats Ready
              </span>
              <span className="inline-flex items-center gap-1 rounded bg-[var(--bg-input)] px-2 py-0.5 text-xs text-[var(--text-muted)] border border-[var(--border-color)]">
                <Globe className="h-3 w-3 text-[var(--accent-primary)]" />
                <span>{job.languageName || job.language}</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded bg-[var(--bg-input)] px-2 py-0.5 text-xs text-[var(--text-muted)] border border-[var(--border-color)]">
                <User className="h-3 w-3 text-[var(--accent-primary)]" />
                <span>{genderLabel}</span>
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1.5">
              Synthesized via <span className="text-[var(--text-primary)] font-medium">{job.synthesizer}</span> ({job.voice}) · Spoken Duration: <span className="font-mono text-[var(--text-primary)]">{job.durationSeconds.toFixed(1)}s</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadZip}
              disabled={isDownloadingZip}
              className="flex items-center gap-2 rounded-lg bg-[var(--accent-primary)] hover:brightness-110 px-4 py-2 text-xs font-bold text-white shadow-md shadow-[var(--accent-primary)]/20 transition-all active:scale-98 disabled:opacity-75 cursor-pointer"
            >
              {isDownloadingZip ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Bundling ZIP...</span>
                </>
              ) : (
                <>
                  <FolderDown className="h-4 w-4" />
                  <span>
                    {job.formats.length === 1
                      ? `Download ${job.formats[0].label} (.ZIP)`
                      : `Download Selected (${job.formats.length}) Formats (.ZIP)`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-color)] pt-3">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[var(--text-muted)] mr-1 font-medium">Filter by Device:</span>
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                  : 'bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
              }`}
            >
              All Formats ({job.formats.length})
            </button>

            <button
              type="button"
              onClick={() => setFilter('apple')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                filter === 'apple'
                  ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                  : 'bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
              }`}
            >
              <Apple className="h-3 w-3" />
              <span>iPhone &amp; Apple Native ({appleCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilter('universal')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                filter === 'universal'
                  ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                  : 'bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
              }`}
            >
              <Smartphone className="h-3 w-3" />
              <span>Universal &amp; Android ({universalCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilter('lossless')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                filter === 'lossless'
                  ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                  : 'bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
              }`}
            >
              <Disc className="h-3 w-3" />
              <span>Studio Lossless ({losslessCount})</span>
            </button>
          </div>

          <span className="text-[11px] text-[var(--text-muted)] font-mono">
            Showing {filteredFormats.length} of {job.formats.length} formats
          </span>
        </div>
      </div>

      {/* Formats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFormats.map((item) => {
          const isCurrent = activeFormat?.format === item.format;
          const isApple = item.category === 'apple' || ['m4a', 'm4r', 'aiff', 'caf'].includes(item.format);

          return (
            <div
              key={item.format}
              className={`relative flex flex-col justify-between rounded-xl border p-5 transition-all ${
                isCurrent
                  ? 'border-[var(--accent-primary)] bg-[var(--bg-surface)] shadow-lg shadow-[var(--accent-primary)]/10 ring-1 ring-[var(--accent-primary)]'
                  : 'border-[var(--border-color)] bg-[var(--bg-surface)] hover:border-[var(--accent-primary)]/50'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-[var(--text-primary)] tracking-wider font-mono flex items-center gap-1.5">
                        <span>{item.label || item.format.toUpperCase()}</span>
                        <span className="text-xs font-normal text-[var(--accent-primary)]">.{item.fileName.split('.').pop()}</span>
                      </h3>
                    </div>

                    {/* Device Tag */}
                    <div className="mt-1">
                      {isApple ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                          <Apple className="h-2.5 w-2.5" />
                          <span>iPhone / iOS Native</span>
                        </span>
                      ) : item.format === 'wav' || item.format === 'flac' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          <Disc className="h-2.5 w-2.5" />
                          <span>Lossless Studio Master</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          <Smartphone className="h-2.5 w-2.5" />
                          <span>Android &amp; Universal</span>
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[var(--text-muted)] mt-2 line-clamp-2 leading-relaxed">
                      {item.recommendedFor}
                    </p>
                  </div>

                  <span className="font-mono text-xs font-semibold tabular-nums text-[var(--text-primary)] bg-[var(--bg-input)] px-2.5 py-1 rounded border border-[var(--border-color)] shrink-0">
                    {formatFileSize(item.size)}
                  </span>
                </div>

                <div className="mt-4 space-y-1.5 text-[11px] text-[var(--text-muted)] border-t border-[var(--border-color)] pt-3 font-mono">
                  <div className="flex justify-between">
                    <span>Codec:</span>
                    <span className="text-[var(--text-primary)] truncate max-w-[170px]">{item.codec}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>MIME Type:</span>
                    <span className="text-[var(--text-primary)]">{item.mimeType}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 flex items-center gap-2.5 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => handlePlay(item)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                    isCurrent && isPlaying
                      ? 'bg-[var(--accent-primary)] text-white shadow-md shadow-[var(--accent-primary)]/30'
                      : 'border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-primary)] hover:border-[var(--accent-primary)]'
                  }`}
                >
                  <Play className={`h-3.5 w-3.5 ${isCurrent && isPlaying ? 'fill-white' : ''}`} />
                  <span>{isCurrent && isPlaying ? 'Playing' : 'Listen'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadFormat(item)}
                  disabled={downloadingFormats[item.format] === 'downloading'}
                  className={`flex items-center gap-1.5 rounded-lg border px-3.5 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                    downloadingFormats[item.format] === 'done'
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                      : downloadingFormats[item.format] === 'downloading'
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-subtle)] text-[var(--accent-primary)] opacity-85 cursor-wait'
                      : downloadingFormats[item.format] === 'error'
                      ? 'border-rose-500 bg-rose-500/10 text-rose-400'
                      : 'border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-muted)] hover:border-[var(--accent-primary)] hover:bg-[var(--accent-subtle)] hover:text-[var(--accent-primary)] active:scale-95'
                  }`}
                  title={`Download ${item.fileName} (${item.label})`}
                  aria-label={`Download ${item.format} file`}
                >
                  {downloadingFormats[item.format] === 'downloading' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-[var(--accent-primary)]" />
                      <span className="font-medium">Saving...</span>
                    </>
                  ) : downloadingFormats[item.format] === 'done' ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-400 stroke-[2.5]" />
                      <span className="font-medium text-emerald-400">Saved!</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      <span className="font-medium">Download</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
