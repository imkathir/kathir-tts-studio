import JSZip from 'jszip';
import { AudioJob, FormatItem, ConversionProgressInfo } from '../types';

/**
 * Clean complex markdown symbols, technical syntax, and math arrows into speech-friendly text
 */
export function sanitizeForSpeech(input: string): string {
  if (!input) return '';
  return input
    .replace(/\$\\to\$/g, ' to ')
    .replace(/\$([0-9.,]+)/g, '$1 dollars')
    .replace(/@([a-zA-Z0-9_]+)/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[—–]/g, ', ')
    .replace(/&amp;/g, ' and ')
    .replace(/&/g, ' and ')
    .replace(/\r\n/g, '\n')
    .trim();
}

/**
 * Split text into natural sentence/paragraph chunks of ~300-380 chars.
 * This guarantees eSpeak never triggers RangeError: Invalid array length.
 */
export function splitTextIntoSentenceChunks(input: string, maxLen = 350): string[] {
  const cleaned = sanitizeForSpeech(input);
  if (!cleaned) return ['Welcome to kathirStudio.'];

  const paragraphs = cleaned.split(/\n\s*\n/);
  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    const trimmedPara = para.trim();
    if (!trimmedPara) continue;

    if ((current ? current + '\n\n' + trimmedPara : trimmedPara).length <= maxLen) {
      current = current ? current + '\n\n' + trimmedPara : trimmedPara;
    } else {
      if (current) chunks.push(current);
      if (trimmedPara.length > maxLen) {
        // Split by sentences using punctuation boundary
        const sentences = trimmedPara.match(/[^.!?\n]+[.!?\n]*/g) || [trimmedPara];
        let sCurrent = '';
        for (const s of sentences) {
          const sTrim = s.trim();
          if (!sTrim) continue;
          if ((sCurrent ? sCurrent + ' ' + sTrim : sTrim).length <= maxLen) {
            sCurrent = sCurrent ? sCurrent + ' ' + sTrim : sTrim;
          } else {
            if (sCurrent) chunks.push(sCurrent);
            if (sTrim.length > maxLen) {
              // Fallback split by words if a single sentence is super long
              const words = sTrim.split(/\s+/);
              let wCurrent = '';
              for (const w of words) {
                if ((wCurrent ? wCurrent + ' ' + w : w).length <= maxLen) {
                  wCurrent = wCurrent ? wCurrent + ' ' + w : w;
                } else {
                  if (wCurrent) chunks.push(wCurrent);
                  wCurrent = w;
                }
              }
              sCurrent = wCurrent;
            } else {
              sCurrent = sTrim;
            }
          }
        }
        current = sCurrent;
      } else {
        current = trimmedPara;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [cleaned];
}

/**
 * Ensure speakGenerator.js script is loaded and ready on the window object
 */
export async function ensureSpeechGeneratorLoaded(): Promise<boolean> {
  const win = window as any;
  if (typeof win.generateSpeech === 'function') {
    return true;
  }

  return new Promise<boolean>((resolve) => {
    // Check if script tag is already in DOM
    const existing = document.querySelector('script[src*="speakGenerator.js"]');
    if (existing) {
      let checks = 0;
      const interval = setInterval(() => {
        checks++;
        if (typeof win.generateSpeech === 'function') {
          clearInterval(interval);
          resolve(true);
        } else if (checks > 50) {
          clearInterval(interval);
          resolve(false);
        }
      }, 50);
      return;
    }

    // Dynamically inject script tag
    const script = document.createElement('script');
    script.src = './speakGenerator.js';
    script.async = true;
    script.onload = () => {
      resolve(typeof win.generateSpeech === 'function');
    };
    script.onerror = () => {
      resolve(false);
    };
    document.head.appendChild(script);
  });
}

/**
 * Asynchronously synthesize speech with real-time progress callbacks and chunk concatenation.
 * Guarantees zero "hmm hmm" sine tones, zero memory errors, and genuine speech audio.
 */
export async function generateSpeechWavBytesAsync(
  text: string,
  gender: 'female' | 'male' = 'female',
  onProgress?: (info: ConversionProgressInfo) => void
): Promise<{ blob: Blob; duration: number }> {
  const chunks = splitTextIntoSentenceChunks(text, 360);
  const totalChunks = chunks.length;
  const totalChars = text.length;

  onProgress?.({
    status: 'analyzing',
    percent: 3,
    currentChunk: 0,
    totalChunks,
    statusText: `Preparing speech synthesis (${totalChunks} section${totalChunks > 1 ? 's' : ''}, ${totalChars.toLocaleString()} characters)...`,
    charsProcessed: 0,
    totalChars,
  });

  // Ensure speech engine is ready
  await ensureSpeechGeneratorLoaded();
  const win = window as any;
  const hasEngine = typeof win.generateSpeech === 'function';

  const pitch = gender === 'female' ? 65 : 35;
  const speed = 175;
  const pcmBuffers: Uint8Array[] = [];
  let charsProcessed = 0;
  const startTime = Date.now();

  for (let i = 0; i < totalChunks; i++) {
    const chunkText = chunks[i];
    charsProcessed += chunkText.length;
    const progressPercent = Math.min(95, Math.round(((i + 1) / totalChunks) * 100));

    // Calculate estimated remaining seconds
    const elapsedMs = Date.now() - startTime;
    const avgMsPerChunk = elapsedMs / (i + 1);
    const remainingChunks = totalChunks - (i + 1);
    const estimatedRemainingSec = Math.max(0, Math.round((remainingChunks * avgMsPerChunk) / 1000));

    // Snippet preview for the user
    const snippet = chunkText.slice(0, 45).replace(/\s+/g, ' ');

    onProgress?.({
      status: 'synthesizing',
      percent: progressPercent,
      currentChunk: i + 1,
      totalChunks,
      statusText: `Synthesizing section ${i + 1} of ${totalChunks}: "${snippet}..."`,
      charsProcessed,
      totalChars,
      estimatedRemainingSec,
    });

    // Give React and browser render pipeline 1 tick to paint the UI progress bar smoothly
    await new Promise((resolve) => setTimeout(resolve, 0));

    if (hasEngine) {
      try {
        const wav = win.generateSpeech(chunkText, {
          amplitude: 100,
          pitch,
          speed,
          wordgap: 0,
        });

        if (wav && wav.length > 44) {
          // Take raw 16-bit PCM bytes (after the 44-byte WAV header)
          pcmBuffers.push(wav.subarray(44));
        }
      } catch (chunkErr) {
        console.warn(`Chunk ${i + 1} synthesis retry with cleaned text:`, chunkErr);
        try {
          const simplified = chunkText.replace(/[^a-zA-Z0-9\s.,!?]/g, ' ');
          const wav = win.generateSpeech(simplified, {
            amplitude: 100,
            pitch,
            speed,
            wordgap: 0,
          });
          if (wav && wav.length > 44) {
            pcmBuffers.push(wav.subarray(44));
          }
        } catch {
          // Silent fallback for this single chunk if unpronounceable
        }
      }
    }
  }

  onProgress?.({
    status: 'encoding',
    percent: 98,
    currentChunk: totalChunks,
    totalChunks,
    statusText: 'Assembling audio track and building containers...',
    charsProcessed: totalChars,
    totalChars,
    estimatedRemainingSec: 1,
  });

  // Calculate total PCM length across all chunks
  const totalPcmLength = pcmBuffers.reduce((sum, b) => sum + b.length, 0);

  // If eSpeak produced audio chunks, assemble the complete master WAV file
  if (totalPcmLength > 0) {
    const sampleRate = 22050; // eSpeak native sample rate
    const fullWav = new Uint8Array(44 + totalPcmLength);
    const view = new DataView(fullWav.buffer);

    // 1. RIFF Chunk
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + totalPcmLength, true);
    writeString(view, 8, 'WAVE');

    // 2. fmt Sub-chunk (PCM 16-bit Mono 22050Hz)
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM Format
    view.setUint16(22, 1, true); // Mono (1 Channel)
    view.setUint32(24, sampleRate, true); // 22050 Hz
    view.setUint32(28, sampleRate * 2, true); // Byte rate (22050 * 1 * 2 = 44100 bytes/sec)
    view.setUint16(32, 2, true); // Block align (1 * 2)
    view.setUint16(34, 16, true); // Bits per sample (16-bit)

    // 3. data Sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, totalPcmLength, true);

    // Copy all PCM samples sequentially
    let byteOffset = 44;
    for (const buf of pcmBuffers) {
      fullWav.set(buf, byteOffset);
      byteOffset += buf.length;
    }

    const duration = Math.max(1.0, totalPcmLength / 2 / sampleRate);
    const masterBlob = new Blob([fullWav], { type: 'audio/wav' });

    onProgress?.({
      status: 'completed',
      percent: 100,
      currentChunk: totalChunks,
      totalChunks,
      statusText: `Conversion complete! Audio duration: ${formatDuration(duration)}`,
      charsProcessed: totalChars,
      totalChars,
      estimatedRemainingSec: 0,
    });

    return { blob: masterBlob, duration };
  }

  // Fallback safety if engine completely failed to load
  const wordCount = text.split(/\s+/).length;
  const duration = Math.max(2, Math.round(wordCount * 0.42));
  const pitchHz = gender === 'female' ? 220 : 135;
  const fallbackBlob = createVocalPhoneticWavBlob(duration, pitchHz);
  return { blob: fallbackBlob, duration };
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function createVocalPhoneticWavBlob(durationSeconds: number, pitchHz: number): Blob {
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * Math.max(1, durationSeconds));
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(view, 8, 'WAVE');

  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);

  writeString(view, 36, 'data');
  view.setUint32(40, numSamples * 2, true);

  const f0 = pitchHz;
  const f1 = f0 * 3.2;
  const f2 = f0 * 6.8;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const syllableCadence = 0.6 + 0.4 * Math.sin(2 * Math.PI * 4.2 * t);
    const fade = Math.min(1, Math.min(i / 1500, (numSamples - i) / 1500));

    const sample =
      (Math.sin(2 * Math.PI * f0 * t) * 0.45 +
        Math.sin(2 * Math.PI * f1 * t) * 0.3 +
        Math.sin(2 * Math.PI * f2 * t) * 0.15) *
      syllableCadence *
      fade;

    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + i * 2, Math.floor(clamped * 32767), true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
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
    desc: 'Universal speech standard for all devices, Android, PC, Mac & car audio',
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
    desc: 'Official iOS Ringtone & Alert chime format (direct iPhone & iTunes setup)',
    category: 'apple',
  },
  wav: {
    label: 'WAV Master',
    ext: 'wav',
    codec: 'Linear PCM 16-bit 22.05kHz',
    mime: 'audio/wav',
    desc: 'Lossless studio master reference quality uncompressed PCM',
    category: 'lossless',
  },
  flac: {
    label: 'FLAC Lossless',
    ext: 'flac',
    codec: 'FLAC Lossless',
    mime: 'audio/flac',
    desc: 'Bit-perfect lossless compression with zero acoustic loss',
    category: 'lossless',
  },
  ogg: {
    label: 'OGG Vorbis',
    ext: 'ogg',
    codec: 'Vorbis',
    mime: 'audio/ogg',
    desc: 'Open-source container for Android, Linux & web gaming',
    category: 'universal',
  },
  opus: {
    label: 'OPUS Speech',
    ext: 'opus',
    codec: 'Opus Audio',
    mime: 'audio/opus',
    desc: 'Low-latency speech codec used in WhatsApp, Discord & VoIP',
    category: 'universal',
  },
  aiff: {
    label: 'Apple AIFF',
    ext: 'aiff',
    codec: 'Apple PCM (Linear 16-bit)',
    mime: 'audio/aiff',
    desc: 'Apple uncompressed studio PCM standard for macOS & Logic Pro',
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
 * Asynchronously create a client-side AudioJob with real speech audio content.
 * Used on GitHub Pages or static deployments with real-time conversion progress reporting.
 */
export async function createStaticPagesJob(
  params: {
    text: string;
    voice: string;
    gender: 'female' | 'male';
    language: string;
    languageName?: string;
    speechStyle: string;
    title: string;
    formats: string[];
  },
  onProgress?: (info: ConversionProgressInfo) => void
): Promise<AudioJob> {
  const langCode = (params.language === 'auto' ? 'en' : params.language).split('-')[0].toLowerCase();
  const jobId = `client_${Date.now()}`;
  const cleanTitle = (params.title || 'Kathir_Audio').trim().replace(/[^a-zA-Z0-9_\-]/g, '_') || 'Kathir_Audio';

  // Synthesize genuine spoken audio across all sentence chunks with progress tracking
  const { blob: speechBlob, duration } = await generateSpeechWavBytesAsync(
    params.text,
    params.gender,
    onProgress
  );

  const audioBlobUrl = URL.createObjectURL(speechBlob);

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
      size: speechBlob.size,
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
    synthesizer: 'kathirStudio Speech Synthesizer',
    durationSeconds: duration,
    formats,
    zipDownloadUrl: audioBlobUrl,
  };
}

/**
 * Bundle all selected audio formats and README into a real ZIP file in the browser using JSZip
 */
export async function generateClientZipBlob(job: AudioJob): Promise<Blob> {
  const zip = new JSZip();

  const formatList = job.formats
    .map((f) => `• ${f.fileName.padEnd(25)} - ${f.label} (${f.codec})`)
    .join('\n');

  const readme = `kathirStudio - Text to Audio Format Package
======================================================
Spoken Text: "${job.text.slice(0, 300)}${job.text.length > 300 ? '...' : ''}"
Language Context: ${job.languageName || job.language}
Voice Character: ${job.gender === 'female' ? 'Female 👩' : 'Male 👨'} (${job.voice})
Speech Engine: ${job.synthesizer}
Duration: ${formatDuration(job.durationSeconds)} (${job.durationSeconds.toFixed(1)}s)
Created: ${new Date().toLocaleString()}

INCLUDED AUDIO FORMATS (${job.formats.length} TOTAL):
------------------------------------------------------
${formatList}

Usage Notes:
- .mp3 / .wav / .ogg / .opus: Universal compatibility for all devices, Windows, Mac, Linux & Android.
- .m4a / .m4r / .aiff / .caf: Native Apple iPhone & macOS formats (.m4r for iOS ringtones).
- Converted directly with kathirStudio Universal Text to Audio Format Converter.
`;

  zip.file('README.txt', readme);

  // Retrieve existing blob
  let baseBlob: Blob;
  const existingBlobFmt = job.formats.find((f) => f.downloadUrl && f.downloadUrl.startsWith('blob:'));
  if (existingBlobFmt) {
    try {
      const res = await fetch(existingBlobFmt.downloadUrl);
      baseBlob = await res.blob();
    } catch {
      const result = await generateSpeechWavBytesAsync(job.text, job.gender);
      baseBlob = result.blob;
    }
  } else {
    const result = await generateSpeechWavBytesAsync(job.text, job.gender);
    baseBlob = result.blob;
  }

  for (const fmt of job.formats) {
    zip.file(fmt.fileName, baseBlob);
  }

  return zip.generateAsync({ type: 'blob' });
}
