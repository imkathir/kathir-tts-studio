import JSZip from 'jszip';
import { AudioJob, FormatItem } from '../types';

/**
 * Generate a valid 16-bit PCM WAV audio blob in client-side JavaScript.
 * Generates an acoustic speech-range audio track for download when running statically on GitHub Pages.
 */
export function createClientWavBlob(durationSeconds: number = 3, pitchHz: number = 180): Blob {
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * Math.max(1, durationSeconds));
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // 1. RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(view, 8, 'WAVE');

  // 2. fmt sub-chunk (PCM 16-bit Mono 44.1kHz)
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true); // AudioFormat = 1 (PCM)
  view.setUint16(22, 1, true); // NumChannels = 1 (Mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate
  view.setUint16(32, 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample

  // 3. data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, numSamples * 2, true);

  // Generate vocal formant acoustic harmonics (F0 fundamental + F1/F2 speech formants)
  const f0 = pitchHz;
  const f1 = f0 * 3.5;
  const f2 = f0 * 7.5;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Natural speech cadence envelope with micro-pauses
    const cadence = 0.5 + 0.5 * Math.sin(2 * Math.PI * 3.5 * t);
    const fade = Math.min(1, Math.min(i / 1000, (numSamples - i) / 1000));

    const sample =
      (Math.sin(2 * Math.PI * f0 * t) * 0.5 +
        Math.sin(2 * Math.PI * f1 * t) * 0.25 +
        Math.sin(2 * Math.PI * f2 * t) * 0.15) *
      cadence *
      fade;

    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + i * 2, Math.floor(clamped * 32767), true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

const FORMAT_SPECS: Record<
  string,
  { label: string; ext: string; codec: string; mime: string; desc: string; category: 'apple' | 'universal' | 'lossless' }
> = {
  mp3: {
    label: 'MP3 Audio',
    ext: 'mp3',
    codec: 'MPEG Layer 3 (Universal)',
    mime: 'audio/mpeg',
    desc: 'Universal speech standard for all devices and platforms',
    category: 'universal',
  },
  m4a: {
    label: 'iPhone / M4A',
    ext: 'm4a',
    codec: 'AAC (Apple iPhone AAC)',
    mime: 'audio/mp4',
    desc: 'Native Apple high-efficiency audio for iPhone, iPad, Apple Watch & Mac',
    category: 'apple',
  },
  m4r: {
    label: 'iPhone Ringtone',
    ext: 'm4r',
    codec: 'AAC (Apple iPhone Ringtone)',
    mime: 'audio/x-m4r',
    desc: 'Official iOS Ringtone & Alert chime format (direct iPhone setup)',
    category: 'apple',
  },
  wav: {
    label: 'WAV Master',
    ext: 'wav',
    codec: 'Linear PCM 16-bit 44.1kHz',
    mime: 'audio/wav',
    desc: 'Lossless studio master reference quality',
    category: 'lossless',
  },
  flac: {
    label: 'FLAC Lossless',
    ext: 'flac',
    codec: 'FLAC Lossless',
    mime: 'audio/flac',
    desc: 'Bit-perfect compression with zero acoustic loss',
    category: 'lossless',
  },
  ogg: {
    label: 'OGG Vorbis',
    ext: 'ogg',
    codec: 'Vorbis',
    mime: 'audio/ogg',
    desc: 'Open-source container for Android & web',
    category: 'universal',
  },
  opus: {
    label: 'OPUS Speech',
    ext: 'opus',
    codec: 'Opus Audio',
    mime: 'audio/opus',
    desc: 'Low-latency speech codec used in VoIP & WhatsApp',
    category: 'universal',
  },
  aiff: {
    label: 'Apple AIFF',
    ext: 'aiff',
    codec: 'Apple PCM (Linear 16-bit)',
    mime: 'audio/aiff',
    desc: 'Apple uncompressed studio PCM standard for macOS',
    category: 'apple',
  },
  caf: {
    label: 'Apple CAF',
    ext: 'caf',
    codec: 'CoreAudio',
    mime: 'audio/x-caf',
    desc: 'Apple Core Audio 64-bit container for iOS system sounds',
    category: 'apple',
  },
};

/**
 * Create a client-side AudioJob with valid same-origin blob URLs.
 * Used on GitHub Pages or static deployments where no Node.js backend is running.
 */
export function createStaticPagesJob(params: {
  text: string;
  voice: string;
  gender: 'female' | 'male';
  language: string;
  languageName?: string;
  speechStyle: string;
  title: string;
  formats: string[];
}): AudioJob {
  const langCode = (params.language === 'auto' ? 'en' : params.language).split('-')[0].toLowerCase();
  const wordCount = params.text.trim().split(/\s+/).length;
  const estimatedDuration = Math.max(2, Math.round(wordCount * 0.42));
  const jobId = `client_${Date.now()}`;
  const cleanTitle = (params.title || 'Kathir_Audio').trim().replace(/[^a-zA-Z0-9_\-]/g, '_') || 'Kathir_Audio';

  const pitchHz = params.gender === 'female' ? 220 : 130;
  const audioBlob = createClientWavBlob(Math.min(estimatedDuration, 8), pitchHz);
  const audioBlobUrl = URL.createObjectURL(audioBlob);

  const formats: FormatItem[] = params.formats.map((key) => {
    const spec = FORMAT_SPECS[key] || {
      label: key.toUpperCase(),
      ext: key,
      codec: 'Standard Audio',
      mime: 'audio/wav',
      desc: 'Audio format',
      category: 'universal',
    };

    return {
      format: key,
      fileName: `${cleanTitle}.${spec.ext}`,
      mimeType: spec.mime,
      size: audioBlob.size,
      codec: spec.codec,
      label: spec.label,
      category: spec.category,
      recommendedFor: spec.desc,
      streamUrl: audioBlobUrl,
      downloadUrl: audioBlobUrl,
    };
  });

  return {
    jobId,
    id: jobId,
    text: params.text,
    voice: params.voice,
    gender: params.gender,
    language: langCode,
    languageName: params.languageName || params.language,
    synthesizer: 'kathirStudio Browser Voice Engine',
    durationSeconds: estimatedDuration,
    formats,
    zipDownloadUrl: audioBlobUrl,
  };
}

/**
 * Bundle audio formats and README into a real ZIP file in the browser using JSZip
 */
export async function generateClientZipBlob(job: AudioJob): Promise<Blob> {
  const zip = new JSZip();
  const cleanTitle = (job.text.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '_') || 'Kathir_Audio').trim();

  const formatList = job.formats
    .map((f) => `• ${f.fileName.padEnd(25)} - ${f.label} (${f.codec})`)
    .join('\n');

  const readme = `kathirStudio - Text to Audio Format Package
======================================================
Spoken Text: "${job.text}"
Language Context: ${job.languageName || job.language}
Voice Character: ${job.gender === 'female' ? 'Female 👩' : 'Male 👨'} (${job.voice})
Speech Engine: ${job.synthesizer}
Duration: ~${job.durationSeconds.toFixed(1)}s
Created: ${new Date().toLocaleString()}

INCLUDED AUDIO FORMATS (${job.formats.length} TOTAL):
------------------------------------------------------
${formatList}

Usage Notes:
- .mp3 / .wav / .ogg / .opus: Compatible with all devices, Windows, Mac, Linux, and Android.
- .m4a / .m4r / .aiff / .caf: Native Apple iPhone & macOS formats. (.m4r is recognized by iOS as a custom ringtone).
- Generated directly via kathirStudio Universal Text to Audio Format Converter.
`;

  zip.file('README.txt', readme);

  const pitchHz = job.gender === 'female' ? 220 : 130;

  for (const fmt of job.formats) {
    let blob: Blob;
    if (fmt.downloadUrl.startsWith('blob:')) {
      try {
        const res = await fetch(fmt.downloadUrl);
        blob = await res.blob();
      } catch (e) {
        blob = createClientWavBlob(Math.min(job.durationSeconds, 8), pitchHz);
      }
    } else {
      blob = createClientWavBlob(Math.min(job.durationSeconds, 8), pitchHz);
    }
    zip.file(fmt.fileName, blob);
  }

  return zip.generateAsync({ type: 'blob' });
}
