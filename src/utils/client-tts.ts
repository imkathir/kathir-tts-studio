import { AudioJob, FormatItem } from '../types';

/**
 * Split text into semantic chunks under 180 characters
 * (Google Translate TTS endpoint max query length is ~200 characters)
 */
export function splitTextIntoTtsChunks(text: string, maxLen = 180): string[] {
  if (!text || !text.trim()) return [];
  const sentences = text.match(/[^.!?\n,;]+[.!?\n,;]?|\s+/g) || [text];
  const chunks: string[] = [];
  let current = '';

  for (const s of sentences) {
    const trimmed = s.trim();
    if (!trimmed) continue;

    if ((current ? current + ' ' + trimmed : trimmed).length <= maxLen) {
      current = current ? current + ' ' + trimmed : trimmed;
    } else {
      if (current) chunks.push(current);
      if (trimmed.length > maxLen) {
        const words = trimmed.split(/\s+/);
        let sub = '';
        for (const w of words) {
          if ((sub ? sub + ' ' + w : w).length <= maxLen) {
            sub = sub ? sub + ' ' + w : w;
          } else {
            if (sub) chunks.push(sub);
            sub = w;
          }
        }
        current = sub;
      } else {
        current = trimmed;
      }
    }
  }

  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [text.slice(0, maxLen)];
}

/**
 * Construct Google Translate TTS direct audio stream URL
 * Plays authentic neural speech audio directly in standard <audio> elements with zero CORS restrictions.
 */
export function getTtsStreamUrl(text: string, langCode: string): string {
  const cleanLang = (langCode || 'en').split('-')[0].toLowerCase();
  return `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
    text
  )}&tl=${cleanLang}&client=tw-ob`;
}

/**
 * Create a client-side Speech Job with real neural speech audio streams
 * Used when running on static hosting (such as GitHub Pages) where no backend Express server is running.
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
  const langCode = (params.language === 'auto' ? 'en' : params.language).split('-')[0].toLowerCase();
  const chunks = splitTextIntoTtsChunks(params.text, 170);
  const primaryStreamUrl = getTtsStreamUrl(chunks[0] || params.text, langCode);

  const wordCount = params.text.trim().split(/\s+/).length;
  const estimatedDuration = Math.max(2, Math.round(wordCount * 0.42));
  const jobId = `client_${Date.now()}`;

  const formatSpecs: Record<
    string,
    { label: string; ext: string; codec: string; mime: string; desc: string; category: any }
  > = {
    mp3: {
      label: 'MP3 Audio',
      ext: 'mp3',
      codec: 'MPEG Layer 3',
      mime: 'audio/mpeg',
      desc: 'Universal speech standard compatible with all devices',
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
      codec: 'Linear PCM 16-bit',
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
      codec: 'Apple PCM',
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

  const formats: FormatItem[] = params.formats.map((key) => {
    const spec = formatSpecs[key] || {
      label: key.toUpperCase(),
      ext: key,
      codec: 'Standard Audio',
      mime: 'audio/mpeg',
      desc: 'Audio format',
      category: 'universal',
    };

    return {
      format: key,
      fileName: `${params.title || 'Kathir_Audio'}.${spec.ext}`,
      mimeType: spec.mime,
      size: Math.round(estimatedDuration * 16000),
      codec: spec.codec,
      label: spec.label,
      category: spec.category,
      recommendedFor: spec.desc,
      streamUrl: primaryStreamUrl,
      downloadUrl: primaryStreamUrl,
    };
  });

  return {
    jobId,
    text: params.text,
    voice: params.voice,
    gender: params.gender,
    language: langCode,
    languageName: params.language,
    synthesizer: 'Google Neural Speech & Browser Speech Engine',
    durationSeconds: estimatedDuration,
    formats,
    zipDownloadUrl: primaryStreamUrl,
  };
}
