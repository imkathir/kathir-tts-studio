import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import googleTTS from 'google-tts-api';
import { ZipArchive } from 'archiver';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const execPromise = util.promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

const AUDIO_STORAGE_DIR = path.join(__dirname, 'converted_audio');
if (!fs.existsSync(AUDIO_STORAGE_DIR)) {
  fs.mkdirSync(AUDIO_STORAGE_DIR, { recursive: true });
}

interface FormatSpec {
  ext: string;
  mime: string;
  codec: string;
  label: string;
  category: 'apple' | 'universal' | 'lossless';
  description: string;
  buildArgs: (
    inPath: string,
    outPath: string,
    sampleRate: number,
    bitrate: string,
    title: string
  ) => string;
}

// Complete format coverage including Apple iPhone native formats
const FORMAT_SPECS: Record<string, FormatSpec> = {
  mp3: {
    ext: 'mp3',
    mime: 'audio/mpeg',
    codec: 'libmp3lame (MPEG Layer 3)',
    label: 'MP3 Audio',
    category: 'universal',
    description: 'Universal standard compatible with all Android devices, PC, Mac, car audio, and media players',
    buildArgs: (inPath, outPath, sampleRate, bitrate, title) =>
      `ffmpeg -y -i "${inPath}" -c:a libmp3lame -b:a ${bitrate} -ar ${sampleRate} -id3v2_version 3 -metadata title="${title.replace(/"/g, '')}" -metadata artist="kathirStudio" "${outPath}"`,
  },
  m4a: {
    ext: 'm4a',
    mime: 'audio/mp4',
    codec: 'aac (Apple iPhone AAC)',
    label: 'iPhone / M4A',
    category: 'apple',
    description: 'Native Apple high-efficiency audio format for iPhone, iPad, Apple Watch, Mac, and iTunes podcasts',
    buildArgs: (inPath, outPath, sampleRate, bitrate) =>
      `ffmpeg -y -i "${inPath}" -c:a aac -b:a ${bitrate} -ar ${sampleRate} "${outPath}"`,
  },
  m4r: {
    ext: 'm4r',
    mime: 'audio/x-m4r',
    codec: 'aac (Apple iPhone Ringtone)',
    label: 'iPhone Ringtone (M4R)',
    category: 'apple',
    description: 'Official iOS Ringtone & Alert chime format (recognized by iOS & iTunes for direct ringtone setup)',
    buildArgs: (inPath, outPath) =>
      `ffmpeg -y -i "${inPath}" -c:a aac -b:a 192k -f ipod "${outPath}"`,
  },
  aiff: {
    ext: 'aiff',
    mime: 'audio/aiff',
    codec: 'pcm_s16be (Apple Audio Interchange)',
    label: 'Apple AIFF',
    category: 'apple',
    description: 'Apple uncompressed studio PCM standard for macOS, iOS CoreAudio, and Apple Logic Pro',
    buildArgs: (inPath, outPath, sampleRate) =>
      `ffmpeg -y -i "${inPath}" -c:a pcm_s16be -ar ${sampleRate} "${outPath}"`,
  },
  caf: {
    ext: 'caf',
    mime: 'audio/x-caf',
    codec: 'alac (Apple Core Audio Format)',
    label: 'Apple CAF',
    category: 'apple',
    description: 'Apple 64-bit CoreAudio container developed specifically by Apple for iOS system sounds and Siri audio',
    buildArgs: (inPath, outPath) =>
      `ffmpeg -y -i "${inPath}" -c:a alac "${outPath}"`,
  },
  wav: {
    ext: 'wav',
    mime: 'audio/wav',
    codec: 'pcm_s16le (Linear PCM 16-bit)',
    label: 'WAV Master',
    category: 'lossless',
    description: 'Uncompressed studio master reference quality for Windows, Android, and audio workstations',
    buildArgs: (inPath, outPath, sampleRate) =>
      `ffmpeg -y -i "${inPath}" -c:a pcm_s16le -ar ${sampleRate} "${outPath}"`,
  },
  flac: {
    ext: 'flac',
    mime: 'audio/flac',
    codec: 'flac (Free Lossless Audio Codec)',
    label: 'FLAC Lossless',
    category: 'lossless',
    description: 'Bit-perfect lossless compression preserving 100% audio quality without compression degradation',
    buildArgs: (inPath, outPath, sampleRate) =>
      `ffmpeg -y -i "${inPath}" -c:a flac -ar ${sampleRate} "${outPath}"`,
  },
  ogg: {
    ext: 'ogg',
    mime: 'audio/ogg',
    codec: 'libvorbis (Ogg Vorbis)',
    label: 'OGG Vorbis',
    category: 'universal',
    description: 'High-clarity compressed audio natively supported on Android, Linux, and gaming engines',
    buildArgs: (inPath, outPath, sampleRate) =>
      `ffmpeg -y -i "${inPath}" -c:a libvorbis -q:a 5 -ar ${sampleRate} "${outPath}"`,
  },
  opus: {
    ext: 'opus',
    mime: 'audio/ogg',
    codec: 'libopus (IETF Opus Speech)',
    label: 'OPUS Speech',
    category: 'universal',
    description: 'Ultra-low latency modern voice codec used in WhatsApp, Discord, WebRTC, and cellular VoIP',
    buildArgs: (inPath, outPath) =>
      `ffmpeg -y -i "${inPath}" -c:a libopus -b:a 64k -ar 48000 "${outPath}"`,
  },
};

interface ConversionJob {
  id: string;
  text: string;
  voice: string;
  gender: 'female' | 'male';
  language: string;
  languageName: string;
  timestamp: number;
  durationSeconds: number;
  synthesizer: string;
  formats: {
    [key: string]: {
      filePath: string;
      fileName: string;
      mimeType: string;
      size: number;
      codec: string;
      label: string;
      category: 'apple' | 'universal' | 'lossless';
      description: string;
    };
  };
}

const conversions = new Map<string, ConversionJob>();

// Retrieve job from memory or recover from disk storage
function getJob(jobId: string): ConversionJob | null {
  if (conversions.has(jobId)) {
    return conversions.get(jobId)!;
  }

  const jobDir = path.join(AUDIO_STORAGE_DIR, jobId);
  if (!fs.existsSync(jobDir)) return null;

  const metaPath = path.join(jobDir, 'job.json');
  if (fs.existsSync(metaPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      conversions.set(jobId, data);
      return data;
    } catch {}
  }

  // Fallback: recover formats by reading audio files in directory
  try {
    const files = fs.readdirSync(jobDir);
    const formats: ConversionJob['formats'] = {};
    for (const [key, spec] of Object.entries(FORMAT_SPECS)) {
      const matchingFile = files.find(
        (f) => f.endsWith(`.${spec.ext}`) && !f.includes('_master')
      );
      if (matchingFile) {
        const filePath = path.join(jobDir, matchingFile);
        const stats = fs.statSync(filePath);
        formats[key] = {
          filePath,
          fileName: matchingFile,
          mimeType: spec.mime,
          size: stats.size,
          codec: spec.codec,
          label: spec.label,
          category: spec.category,
          description: spec.description,
        };
      }
    }

    if (Object.keys(formats).length > 0) {
      const recovered: ConversionJob = {
        id: jobId,
        text: 'Spoken Audio',
        voice: 'Kore',
        gender: 'female',
        language: 'en',
        languageName: 'English',
        timestamp: Date.now(),
        durationSeconds: 0,
        synthesizer: 'kathirStudio Engine',
        formats,
      };
      conversions.set(jobId, recovered);
      return recovered;
    }
  } catch {}

  return null;
}

// Preload any existing jobs on server boot
function initStorage() {
  try {
    if (!fs.existsSync(AUDIO_STORAGE_DIR)) {
      fs.mkdirSync(AUDIO_STORAGE_DIR, { recursive: true });
      return;
    }
    const dirs = fs.readdirSync(AUDIO_STORAGE_DIR);
    for (const dir of dirs) {
      getJob(dir);
    }
  } catch (err) {
    console.error('Storage init error:', err);
  }
}

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

function sanitizeFilename(text: string): string {
  return (
    text
      .trim()
      .replace(/[^a-zA-Z0-9_\- ]/g, '')
      .slice(0, 30)
      .trim()
      .replace(/\s+/g, '_') || 'audio_track'
  );
}

// Server-side language detector
function detectLanguageCode(text: string): { code: string; name: string } {
  if (!text || !text.trim()) return { code: 'en', name: 'English' };

  if (/[\u0B80-\u0BFF]/.test(text)) return { code: 'ta', name: 'Tamil' };
  if (/[\u0900-\u097F]/.test(text)) return { code: 'hi', name: 'Hindi' };
  if (/[\u0600-\u06FF]/.test(text)) return { code: 'ar', name: 'Arabic' };
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return { code: 'ja', name: 'Japanese' };
  if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(text)) return { code: 'ko', name: 'Korean' };
  if (/[\u4E00-\u9FFF]/.test(text)) return { code: 'zh', name: 'Chinese' };
  if (/[\u0400-\u04FF]/.test(text)) return { code: 'ru', name: 'Russian' };

  const lower = ' ' + text.toLowerCase().replace(/[^a-z0-9áéíóúüñãõäöüßçàâèêëîïôûùœ ]/g, ' ') + ' ';
  if (
    /\b(vanakkam|nanri|epdi|irukinga|irukeenga|thambi|machan|romba|nalla|solunga|theriyuma|vanga|ponga|tamil|chennai)\b/.test(
      lower
    )
  ) {
    return { code: 'ta', name: 'Tamil' };
  }
  if (
    /\b(namaste|namaskar|kaise\s+ho|kya\s+haal|dhanyawad|shukriya|bahut|accha|theek|bhai|bhaiya)\b/.test(
      lower
    )
  ) {
    return { code: 'hi', name: 'Hindi' };
  }

  let scoreEn = 0, scoreEs = 0, scoreFr = 0, scoreDe = 0, scoreIt = 0, scorePt = 0;
  const enMatches = lower.match(/\b(the|this|that|with|have|from|they|which|welcome|convert|speech|audio|voice|studio|text|natural|clear|files)\b/g);
  if (enMatches) scoreEn += enMatches.length * 2;

  if (/[áéíóúüñ¿¡]/.test(lower)) scoreEs += 3;
  const esMatches = lower.match(/\b(hola|gracias|amigo|amigos|tiempo|buenos|días|buenas|tardes|noches|por\s+favor|estoy|estás|español|bienvenido)\b/g);
  if (esMatches) scoreEs += esMatches.length * 2;

  if (/[çèêëàâîïôûùœ]/.test(lower)) scoreFr += 3;
  const frMatches = lower.match(/\b(bonjour|merci|s'il\s+vous\s+plaît|français|avec|dans|nous|vous|cette|aussi|toujours|très|bienvenue)\b/g);
  if (frMatches) scoreFr += frMatches.length * 2;

  if (/[äöüß]/.test(lower)) scoreDe += 3;
  const deMatches = lower.match(/\b(hallo|danke|bitte|deutsch|nicht|guten|morgen|abend|immer|wieder|willkommen)\b/g);
  if (deMatches) scoreDe += deMatches.length * 2;

  const itMatches = lower.match(/\b(ciao|grazie|prego|italiano|buongiorno|buonasera|arrivederci|perché|quando|sempre|ancora|benvenuto)\b/g);
  if (itMatches) scoreIt += itMatches.length * 2;

  if (/[ãõ]/.test(lower)) scorePt += 3;
  const ptMatches = lower.match(/\b(olá|obrigado|obrigada|português|muito|você|vocês|também|depois|sempre|agora|bom\s+dia|bem-vindo)\b/g);
  if (ptMatches) scorePt += ptMatches.length * 2;

  const scores = [
    { code: 'en', name: 'English', score: scoreEn },
    { code: 'es', name: 'Spanish', score: scoreEs },
    { code: 'fr', name: 'French', score: scoreFr },
    { code: 'de', name: 'German', score: scoreDe },
    { code: 'it', name: 'Italian', score: scoreIt },
    { code: 'pt', name: 'Portuguese', score: scorePt },
  ];
  scores.sort((a, b) => b.score - a.score);
  if (scores[0].score > 0) return { code: scores[0].code, name: scores[0].name };

  return { code: 'en', name: 'English' };
}

// Split long text into natural paragraph & sentence chunks so 100% of content is synthesized without truncation
function splitIntoParagraphChunks(text: string, maxChunkLength = 3500): string[] {
  if (!text || !text.trim()) return [];
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const rawPara of paragraphs) {
    const para = rawPara.trim();
    if (!para) continue;

    if ((currentChunk ? currentChunk + '\n\n' + para : para).length <= maxChunkLength) {
      currentChunk = currentChunk ? currentChunk + '\n\n' + para : para;
    } else {
      if (currentChunk) chunks.push(currentChunk);
      if (para.length > maxChunkLength) {
        // Split long paragraph by sentences
        const sentences = para.split(/(?<=[.!?])\s+/);
        let currentSentenceChunk = '';
        for (const sentence of sentences) {
          if (!sentence.trim()) continue;
          if ((currentSentenceChunk ? currentSentenceChunk + ' ' + sentence : sentence).length <= maxChunkLength) {
            currentSentenceChunk = currentSentenceChunk ? currentSentenceChunk + ' ' + sentence : sentence;
          } else {
            if (currentSentenceChunk) chunks.push(currentSentenceChunk);
            if (sentence.length > maxChunkLength) {
              // Fallback split by words
              const words = sentence.split(/\s+/);
              let wordChunk = '';
              for (const word of words) {
                if ((wordChunk ? wordChunk + ' ' + word : word).length <= maxChunkLength) {
                  wordChunk = wordChunk ? wordChunk + ' ' + word : word;
                } else {
                  if (wordChunk) chunks.push(wordChunk);
                  wordChunk = word;
                }
              }
              currentSentenceChunk = wordChunk;
            } else {
              currentSentenceChunk = sentence;
            }
          }
        }
        currentChunk = currentSentenceChunk;
      } else {
        currentChunk = para;
      }
    }
  }
  if (currentChunk) chunks.push(currentChunk);
  return chunks;
}

// Generate genuine spoken speech audio with language & authentic male/female neural voices
async function generateSpeechWav(
  text: string,
  voice: string,
  gender: 'female' | 'male',
  requestedLanguage: string,
  speechStyle: string,
  outputPath: string
): Promise<{ duration: number; engine: string; langCode: string; langName: string }> {
  // Determine target language
  let langInfo: { code: string; name: string };
  if (!requestedLanguage || requestedLanguage === 'auto') {
    langInfo = detectLanguageCode(text);
  } else {
    const detected = detectLanguageCode(text);
    langInfo = {
      code: requestedLanguage,
      name: detected.code === requestedLanguage ? detected.name : requestedLanguage.toUpperCase(),
    };
  }

  let success = false;
  let engineUsed = 'Google Neural Speech Engine';

  // 1. Primary Engine for short-to-medium texts: Gemini 3.8 Flash TTS
  // Only attempt if text is compact (<= 2500 chars) and API key is present
  if (text.length <= 2500 && process.env.GEMINI_API_KEY) {
    const effectiveVoice =
      gender === 'female'
        ? voice === 'Zephyr'
          ? 'Zephyr'
          : 'Kore'
        : voice === 'Fenrir' || voice === 'Puck'
          ? voice
          : 'Charon';

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const maleStyle = `Authentic natural human male speaker with natural vocal timbre, speaking fluent ${langInfo.name}`;
    const femaleStyle = `Natural articulate female narrator, speaking fluent ${langInfo.name}`;
    const effectiveStyle = speechStyle?.trim() || (gender === 'male' ? maleStyle : femaleStyle);

    try {
      const geminiResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: text, // FULL TEXT - No 3000-char truncation
                speechMetadata: {
                  style: effectiveStyle,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: effectiveVoice },
            },
          },
        },
      });

      const base64Audio =
        geminiResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (base64Audio) {
        fs.writeFileSync(outputPath, Buffer.from(base64Audio, 'base64'));
        success = true;
        engineUsed = `Gemini Neural Studio (Voice: ${effectiveVoice}, ${gender.toUpperCase()}, ${langInfo.name})`;
      }
    } catch (geminiErr: any) {
      console.warn(`Gemini TTS skipped (falling back to unlimited Google Neural Engine):`, geminiErr?.message || geminiErr);
    }
  }

  // 2. High-Capacity Chunked Synthesis: Converts 100% of text without truncation (supports full books, 60k+ chars, 80+ minutes)
  if (!success) {
    try {
      const chunks = splitIntoParagraphChunks(text, 3500);
      console.log(`Synthesizing full text across ${chunks.length} clean section chunk(s)... Total length: ${text.length} chars`);

      const audioBuffers: Buffer[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunkText = chunks[i];
        if (!chunkText.trim()) continue;

        const chunkAudio = await googleTTS.getAllAudioBase64(chunkText, {
          lang: langInfo.code,
          slow: false,
          timeout: 25000,
        });

        for (const part of chunkAudio) {
          audioBuffers.push(Buffer.from(part.base64, 'base64'));
        }
      }

      const combinedMp3 = Buffer.concat(audioBuffers);
      const tempMp3Path = `${outputPath}.tmp.mp3`;
      fs.writeFileSync(tempMp3Path, combinedMp3);

      // Clean audio normalization and mastering filter
      const acousticFilter = '-af "loudnorm=I=-16:TP=-1.5:LRA=11,volume=1.05"';

      await execPromise(`ffmpeg -y -i "${tempMp3Path}" ${acousticFilter} -c:a pcm_s16le "${outputPath}"`);
      if (fs.existsSync(tempMp3Path)) {
        fs.unlinkSync(tempMp3Path);
      }
      success = true;
      engineUsed =
        chunks.length > 1
          ? `Google Neural Speech (Full Content · ${chunks.length} Sections · 100% Converted)`
          : `Google Neural Speech (${gender.toUpperCase()}, ${langInfo.name})`;
    } catch (gErr: any) {
      console.error('TTS synthesis error:', gErr);
      throw new Error('Speech synthesis failed: ' + (gErr?.message || 'Network error'));
    }
  }

  // Measure exact audio duration
  let duration = 2.0;
  try {
    const { stdout } = await execPromise(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputPath}"`
    );
    const parsed = parseFloat(stdout.trim());
    if (!isNaN(parsed) && parsed > 0) {
      duration = parsed;
    }
  } catch {}

  return { duration, engine: engineUsed, langCode: langInfo.code, langName: langInfo.name };
}

// Health & Engine info check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    appName: 'kathirStudio - Universal Text to Audio Format Converter',
    isFree: true,
    engine: 'Google Neural Speech & Web Audio FFmpeg Transcoder (100% Free & Unlimited)',
    formats: Object.keys(FORMAT_SPECS),
    appleFormats: ['m4a', 'm4r', 'aiff', 'caf'],
    timestamp: Date.now(),
  });
});

// History of jobs
app.get('/api/formats', (_req, res) => {
  res.json(
    Object.entries(FORMAT_SPECS).map(([key, spec]) => ({
      key,
      ext: spec.ext,
      label: spec.label,
      category: spec.category,
      mime: spec.mime,
      codec: spec.codec,
      description: spec.description,
    }))
  );
});

app.get('/api/history', (_req, res) => {
  const list = Array.from(conversions.values()).reverse();
  res.json(list);
});

// Primary Convert API
app.post('/api/convert', async (req, res) => {
  try {
    const {
      text,
      voice = 'Kore',
      gender = 'female',
      language = 'auto',
      speechStyle = 'Natural, clear studio voice',
      sampleRate = 44100,
      bitrate = '192k',
      title = 'Kathir_Audio',
      formats = undefined,
    } = req.body;

    if (!text || !text.trim()) {
      res.status(400).json({ error: 'Text content is required' });
      return;
    }

    const jobId = `tts_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const jobDir = path.join(AUDIO_STORAGE_DIR, jobId);
    fs.mkdirSync(jobDir, { recursive: true });

    const cleanTitle = sanitizeFilename(title);
    const sourceWavPath = path.join(jobDir, `${cleanTitle}_master.wav`);

    // 1. Synthesize Speech Audio
    const { duration, engine, langCode, langName } = await generateSpeechWav(
      text,
      voice,
      gender as 'female' | 'male',
      language,
      speechStyle,
      sourceWavPath
    );

    const jobResult: ConversionJob = {
      id: jobId,
      text,
      voice,
      gender: gender as 'female' | 'male',
      language: langCode,
      languageName: langName,
      timestamp: Date.now(),
      durationSeconds: duration,
      synthesizer: engine,
      formats: {},
    };

    // Filter which formats to transcode: user-selected or default to all if omitted
    let selectedKeys: string[] = [];
    if (Array.isArray(formats) && formats.length > 0) {
      selectedKeys = formats
        .map((f: string) => String(f).toLowerCase().trim())
        .filter((f: string) => FORMAT_SPECS[f]);
    }
    if (selectedKeys.length === 0) {
      selectedKeys = Object.keys(FORMAT_SPECS);
    }

    // 2. Encode only the selected audio formats
    for (const key of selectedKeys) {
      const spec = FORMAT_SPECS[key];
      if (!spec) continue;

      const outFileName = `${cleanTitle}.${spec.ext}`;
      const outFilePath = path.join(jobDir, outFileName);

      const ffmpegCmd = spec.buildArgs(sourceWavPath, outFilePath, sampleRate, bitrate, cleanTitle);
      await execPromise(ffmpegCmd);

      const stats = fs.statSync(outFilePath);
      jobResult.formats[key] = {
        filePath: outFilePath,
        fileName: outFileName,
        mimeType: spec.mime,
        size: stats.size,
        codec: spec.codec,
        label: spec.label,
        category: spec.category,
        description: spec.description,
      };
    }

    conversions.set(jobId, jobResult);

    // Persist job metadata to disk for instant recovery across restarts
    try {
      fs.writeFileSync(path.join(jobDir, 'job.json'), JSON.stringify(jobResult, null, 2));
    } catch (e) {
      console.warn('Could not cache job.json:', e);
    }

    res.json({
      success: true,
      jobId,
      text,
      voice,
      gender,
      language: langCode,
      languageName: langName,
      synthesizer: engine,
      durationSeconds: duration,
      formats: Object.entries(jobResult.formats).map(([key, item]) => ({
        format: key,
        fileName: item.fileName,
        mimeType: item.mimeType,
        size: item.size,
        codec: item.codec,
        label: item.label,
        category: item.category,
        recommendedFor: item.description,
        streamUrl: `/api/audio/${jobId}/${key}`,
        downloadUrl: `/api/download/${jobId}/${key}`,
      })),
      zipDownloadUrl: `/api/download-zip/${jobId}`,
    });
  } catch (error: any) {
    console.error('Conversion failed:', error);
    res.status(500).json({ error: error?.message || 'Text-to-Speech conversion failed' });
  }
});

// Preview stream
app.get('/api/audio/:jobId/:format', (req, res) => {
  const { jobId, format } = req.params;
  const job = getJob(jobId);

  if (!job || !job.formats[format]) {
    res.status(404).send('Audio file not found');
    return;
  }

  const fileData = job.formats[format];
  if (!fs.existsSync(fileData.filePath)) {
    res.status(404).send('Audio file not found on disk');
    return;
  }

  res.setHeader('Content-Type', fileData.mimeType);
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Access-Control-Allow-Origin', '*');
  fs.createReadStream(fileData.filePath).pipe(res);
});

// Single file download with guaranteed attachment headers and octet-stream
app.get('/api/download/:jobId/:format', (req, res) => {
  const { jobId, format } = req.params;
  const job = getJob(jobId);

  if (!job || !job.formats[format]) {
    res.status(404).send('Audio file not found');
    return;
  }

  const fileData = job.formats[format];
  if (!fs.existsSync(fileData.filePath)) {
    res.status(404).send('Audio file not found on disk');
    return;
  }

  const stats = fs.statSync(fileData.filePath);
  const safeFilename = fileData.fileName.replace(/["\r\n]/g, '_');

  // Force binary octet-stream and explicit attachment disposition
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`
  );
  res.setHeader('Content-Length', stats.size);
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length');

  const stream = fs.createReadStream(fileData.filePath);
  stream.on('error', (err) => {
    console.error('Download stream error:', err);
    if (!res.headersSent) {
      res.status(500).send('Error streaming download');
    }
  });
  stream.pipe(res);
});

// Download all formats in clean ZIP package
app.get('/api/download-zip/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = getJob(jobId);

  if (!job) {
    res.status(404).send('Job not found');
    return;
  }

  const archive = new (ZipArchive as any)({ zlib: { level: 9 } });

  const formatCount = Object.keys(job.formats).length;
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="kathirStudio_${jobId}_${formatCount}_Formats.zip"`
  );
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

  archive.pipe(res);

  for (const [, item] of Object.entries(job.formats)) {
    if (fs.existsSync(item.filePath)) {
      archive.file(item.filePath, { name: item.fileName });
    }
  }

  const formatListText = Object.entries(job.formats)
    .map(([key, item]) => `• .${key.toUpperCase().padEnd(5)} - ${item.label}: ${item.codec} (${item.description})`)
    .join('\n');

  const readme = `kathirStudio - Universal Text to Audio Format Converter
======================================================
Generated Spoken Text: "${job.text}"
Language Context: ${job.languageName} (${job.language})
Voice Gender: ${job.gender.toUpperCase()}
Synthesis Engine: ${job.synthesizer} (100% Free & Unlimited)
Audio Duration: ${job.durationSeconds.toFixed(1)} seconds
Timestamp: ${new Date(job.timestamp).toLocaleString()}

INCLUDED AUDIO FORMATS (${formatCount} TOTAL):
------------------------------------------------------
${formatListText}

Free Engine Transparency Note:
This audio conversion was processed using Google's Neural Speech Engine and server-side
FFmpeg container transcoding. It is 100% free with no subscription, API tokens, or hidden fees.
`;

  archive.append(readme, { name: 'README.txt' });
  archive.finalize();
});

// Start Server
async function startServer() {
  initStorage();

  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.join(__dirname, 'dist'))) {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`kathirStudio - Universal Text to Audio Format Converter listening on http://0.0.0.0:${PORT}`);
  });
  server.setTimeout(600000);
  server.keepAliveTimeout = 610000;
}

startServer().catch((err) => {
  console.error('Server startup failed:', err);
  process.exit(1);
});
