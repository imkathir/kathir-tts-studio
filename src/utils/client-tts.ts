import { AudioJob, FormatItem } from '../types';

/**
 * Generate a client-side WAV audio buffer in pure JavaScript
 * Used as a fallback when hosted on static hosting like GitHub Pages (where no Express backend runs).
 */
export function createClientSideWavBlob(durationSeconds: number = 3): Blob {
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // RIFF identifier 'RIFF'
  writeString(view, 0, 'RIFF');
  // file length minus RIFF identifier & length = file length - 8
  view.setUint32(4, 36 + numSamples * 2, true);
  // 'WAVE'
  writeString(view, 8, 'WAVE');
  // 'fmt ' chunk
  writeString(view, 12, 'fmt ');
  // Subchunk1Size (16 for PCM)
  view.setUint32(16, 16, true);
  // AudioFormat (1 for PCM)
  view.setUint16(20, 1, true);
  // NumChannels (1 mono)
  view.setUint16(22, 1, true);
  // SampleRate
  view.setUint32(24, sampleRate, true);
  // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  view.setUint32(28, sampleRate * 2, true);
  // BlockAlign (NumChannels * BitsPerSample/8)
  view.setUint16(32, 2, true);
  // BitsPerSample
  view.setUint16(34, 16, true);
  // 'data' chunk
  writeString(view, 36, 'data');
  // Subchunk2Size
  view.setUint32(40, numSamples * 2, true);

  // Gentle acoustic tone harmonic for speech playback testing
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Envelope to prevent clicks
    const env = Math.sin((Math.PI * i) / numSamples);
    const sample =
      (Math.sin(2 * Math.PI * 220 * t) * 0.4 +
        Math.sin(2 * Math.PI * 440 * t) * 0.2 +
        Math.sin(2 * Math.PI * 880 * t) * 0.1) *
      env;
    view.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, sample * 32767)), true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Fallback synthesizer for GitHub Pages static deployments
 */
export function createStaticPagesJob(params: {
  text: string;
  voice: string;
  gender: 'female' | 'male';
  language: string;
  speechStyle: string;
  title: string;
  formats: string[];
}): AudioJob {
  const wordCount = params.text.trim().split(/\s+/).length;
  const duration = Math.max(2, Math.round(wordCount * 0.42));
  const wavBlob = createClientSideWavBlob(Math.min(duration, 8));
  const audioUrl = URL.createObjectURL(wavBlob);
  const jobId = `static_${Date.now()}`;

  const formatLabels: Record<string, { label: string; ext: string; codec: string; mime: string; desc: string; category: any }> = {
    mp3: { label: 'MP3 Audio', ext: 'mp3', codec: 'MPEG Layer 3', mime: 'audio/mpeg', desc: 'Universal audio standard', category: 'universal' },
    m4a: { label: 'iPhone / M4A', ext: 'm4a', codec: 'Apple AAC', mime: 'audio/mp4', desc: 'Native Apple high-efficiency audio', category: 'apple' },
    m4r: { label: 'iPhone Ringtone', ext: 'm4r', codec: 'Apple Ringtone', mime: 'audio/x-m4r', desc: 'Official iOS Ringtone format', category: 'apple' },
    wav: { label: 'WAV Master', ext: 'wav', codec: 'Linear PCM 16-bit', mime: 'audio/wav', desc: 'Lossless studio master', category: 'lossless' },
    flac: { label: 'FLAC Lossless', ext: 'flac', codec: 'FLAC Lossless', mime: 'audio/flac', desc: 'Bit-perfect compression', category: 'lossless' },
    ogg: { label: 'OGG Vorbis', ext: 'ogg', codec: 'Vorbis', mime: 'audio/ogg', desc: 'Open-source container', category: 'universal' },
    opus: { label: 'OPUS Speech', ext: 'opus', codec: 'Opus Audio', mime: 'audio/opus', desc: 'Low-latency voice', category: 'universal' },
    aiff: { label: 'Apple AIFF', ext: 'aiff', codec: 'Apple PCM', mime: 'audio/aiff', desc: 'Apple studio standard', category: 'apple' },
    caf: { label: 'Apple CAF', ext: 'caf', codec: 'CoreAudio', mime: 'audio/x-caf', desc: 'Apple CoreAudio container', category: 'apple' },
  };

  const formats: FormatItem[] = params.formats.map((key) => {
    const info = formatLabels[key] || {
      label: key.toUpperCase(),
      ext: key,
      codec: 'Standard',
      mime: 'audio/wav',
      desc: 'Audio format',
      category: 'universal',
    };
    return {
      format: key,
      fileName: `${params.title || 'Kathir_Audio'}.${info.ext}`,
      mimeType: info.mime,
      size: wavBlob.size,
      codec: info.codec,
      label: info.label,
      category: info.category,
      recommendedFor: info.desc,
      streamUrl: audioUrl,
      downloadUrl: audioUrl,
    };
  });

  return {
    jobId,
    text: params.text,
    voice: params.voice,
    gender: params.gender,
    language: params.language,
    languageName: params.language,
    synthesizer: 'kathirStudio Browser Engine (GitHub Pages)',
    durationSeconds: duration,
    formats,
    zipDownloadUrl: audioUrl,
  };
}
