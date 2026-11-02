import React, { useState, useEffect, useMemo } from 'react';
import {
  Volume2,
  Sliders,
  ArrowRight,
  Sparkles,
  Globe,
  User,
  HelpCircle,
  CheckCircle2,
  ShieldCheck,
  Apple,
  Music2,
  Smartphone,
  Disc,
  AlertCircle,
} from 'lucide-react';
import { PresetTemplate, FormatOption, ConversionProgressInfo } from '../types';
import { SUPPORTED_LANGUAGES, detectLanguage } from '../utils/language';

export const AVAILABLE_FORMATS: FormatOption[] = [
  // Universal Formats
  {
    key: 'mp3',
    ext: '.mp3',
    label: 'MP3 Audio',
    category: 'universal',
    description: 'Universal standard for Android, PC, Mac, web & car audio',
    badge: 'Universal',
    isPopular: true,
  },
  {
    key: 'ogg',
    ext: '.ogg',
    label: 'OGG Vorbis',
    category: 'universal',
    description: 'Open-source audio format for web, Linux & Android gaming',
    badge: 'Open Audio',
  },
  {
    key: 'opus',
    ext: '.opus',
    label: 'OPUS Speech',
    category: 'universal',
    description: 'Low-latency modern speech codec used in WhatsApp, Discord & VoIP',
    badge: 'Voice Optimized',
  },
  // Apple iPhone & iOS Native
  {
    key: 'm4a',
    ext: '.m4a',
    label: 'iPhone / M4A',
    category: 'apple',
    description: 'Native Apple high-efficiency audio for iPhone, iPad, Apple Watch & Mac',
    badge: 'Apple AAC',
    isPopular: true,
  },
  {
    key: 'm4r',
    ext: '.m4r',
    label: 'iPhone Ringtone',
    category: 'apple',
    description: 'Official iOS Ringtone & Alert chime format (direct iPhone & iTunes setup)',
    badge: 'iOS Ringtone',
  },
  {
    key: 'aiff',
    ext: '.aiff',
    label: 'Apple AIFF',
    category: 'apple',
    description: 'Apple uncompressed studio PCM standard for macOS & Logic Pro',
    badge: 'macOS PCM',
  },
  {
    key: 'caf',
    ext: '.caf',
    label: 'Apple CAF',
    category: 'apple',
    description: 'Apple Core Audio 64-bit container used for iOS system sounds & Siri',
    badge: 'CoreAudio',
  },
  // Lossless Studio Masters
  {
    key: 'wav',
    ext: '.wav',
    label: 'WAV Master',
    category: 'lossless',
    description: 'Uncompressed studio master reference quality for Windows & audio workstations',
    badge: 'Studio PCM',
    isPopular: true,
  },
  {
    key: 'flac',
    ext: '.flac',
    label: 'FLAC Lossless',
    category: 'lossless',
    description: 'Bit-perfect lossless compression with zero audio quality degradation',
    badge: 'Lossless',
  },
];

interface AudioInputPanelProps {
  onConvert: (params: {
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
  }) => void;
  isConverting: boolean;
  conversionProgress: string;
  progressInfo?: ConversionProgressInfo | null;
}

const PRESETS: PresetTemplate[] = [
  {
    id: 'ta-male',
    label: 'தமிழ் ஆண் (Tamil Male)',
    language: 'ta',
    languageName: 'Tamil',
    flag: '🇮🇳',
    gender: 'male',
    text: 'வணக்கம்! இது kathirStudio-வின் உண்மையான இயற்கை ஆண் குரல்.',
    voice: 'Charon',
    speechStyle: 'இயற்கையான கம்பீரமான ஆண் குரல் (Natural Tamil Male)',
  },
  {
    id: 'ta-female',
    label: 'தமிழ் பெண் (Tamil Female)',
    language: 'ta',
    languageName: 'Tamil',
    flag: '🇮🇳',
    gender: 'female',
    text: 'வணக்கம்! kathirStudio - Universal Text to Audio Format Converter-க்கு உங்களை அன்புடன் வரவேற்கிறோம்.',
    voice: 'Kore',
    speechStyle: 'இயற்கையான தெளிவான பெண் குரல்',
  },
  {
    id: 'en-male',
    label: 'English Male',
    language: 'en',
    languageName: 'English',
    flag: '🇺🇸',
    gender: 'male',
    text: 'Welcome to kathirStudio - Universal Text to Audio Format Converter. This is an authentic natural male narrator voice.',
    voice: 'Charon',
    speechStyle: 'Warm and resonant natural male narrator',
  },
  {
    id: 'en-welcome',
    label: 'English Female',
    language: 'en',
    languageName: 'English',
    flag: '🇺🇸',
    gender: 'female',
    text: 'Welcome to kathirStudio - Universal Text to Audio Format Converter. Convert any text into crystal clear audio files instantly.',
    voice: 'Kore',
    speechStyle: 'Warm, clear, and articulate female narrator',
  },
  {
    id: 'hi-sample',
    label: 'हिन्दी पुरुष (Hindi Male)',
    language: 'hi',
    languageName: 'Hindi',
    flag: '🇮🇳',
    gender: 'male',
    text: 'नमस्ते! kathirStudio में आपका स्वागत है। यह एक स्वाभाविक पुरुष आवाज़ है।',
    voice: 'Fenrir',
    speechStyle: 'प्राकृतिक और स्पष्ट पुरुष आवाज़',
  },
  {
    id: 'es-sample',
    label: 'Español (Spanish)',
    language: 'es',
    languageName: 'Spanish',
    flag: '🇪🇸',
    gender: 'male',
    text: 'Bienvenido a kathirStudio - Universal Text to Audio Format Converter.',
    voice: 'Charon',
    speechStyle: 'Voz masculina auténtica y profesional en español',
  },
];

export const AudioInputPanel: React.FC<AudioInputPanelProps> = ({
  onConvert,
  isConverting,
  conversionProgress,
  progressInfo,
}) => {
  const [text, setText] = useState<string>(
    'Welcome to Kathir Text to Speech Studio. Convert any text into crystal clear audio files instantly.'
  );
  const [selectedLanguage, setSelectedLanguage] = useState<string>('auto');
  const [gender, setGender] = useState<'female' | 'male'>('female');
  const [title, setTitle] = useState<string>('Kathir_Speech');
  const [voice, setVoice] = useState<string>('Kore');
  const [speechStyle, setSpeechStyle] = useState<string>('Clear, natural studio voice');
  const [sampleRate, setSampleRate] = useState<number>(44100);
  const [bitrate, setBitrate] = useState<string>('192k');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [showEngineInfo, setShowEngineInfo] = useState<boolean>(false);
  const [isBrowserSpeaking, setIsBrowserSpeaking] = useState<boolean>(false);

  // User-selected formats to convert (defaults to popular: MP3 and M4A iPhone)
  const [selectedFormats, setSelectedFormats] = useState<string[]>(['mp3', 'm4a']);

  const handleToggleFormat = (key: string) => {
    setSelectedFormats((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSelectAll = () => {
    setSelectedFormats(AVAILABLE_FORMATS.map((f) => f.key));
  };

  const handleSelectPopular = () => {
    setSelectedFormats(['mp3', 'm4a']);
  };

  const handleSelectApple = () => {
    setSelectedFormats(['m4a', 'm4r', 'aiff', 'caf']);
  };

  const handleSelectUniversal = () => {
    setSelectedFormats(['mp3', 'ogg', 'opus']);
  };

  const handleSelectLossless = () => {
    setSelectedFormats(['wav', 'flac']);
  };

  const handleClearAll = () => {
    setSelectedFormats([]);
  };

  const isCategoryFullySelected = (cat: 'universal' | 'apple' | 'lossless') => {
    const catKeys = AVAILABLE_FORMATS.filter((f) => f.category === cat).map((f) => f.key);
    return catKeys.length > 0 && catKeys.every((k) => selectedFormats.includes(k));
  };

  const handleToggleCategory = (cat: 'universal' | 'apple' | 'lossless') => {
    const catKeys = AVAILABLE_FORMATS.filter((f) => f.category === cat).map((f) => f.key);
    if (isCategoryFullySelected(cat)) {
      setSelectedFormats((prev) => prev.filter((k) => !catKeys.includes(k)));
    } else {
      setSelectedFormats((prev) => Array.from(new Set([...prev, ...catKeys])));
    }
  };

  // Auto-detect language in real-time as user types
  const autoDetectedLang = useMemo(() => {
    return detectLanguage(text);
  }, [text]);

  const activeLanguageInfo = useMemo(() => {
    if (selectedLanguage === 'auto') {
      return autoDetectedLang;
    }
    return SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage) || autoDetectedLang;
  }, [selectedLanguage, autoDetectedLang]);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;
  const estimatedSeconds = Math.max(1, Math.round(wordCount * 0.42));

  const formatSpokenDuration = (seconds: number) => {
    if (seconds < 60) return `~${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `~${hrs}h ${remMins}m`;
    }
    return `~${mins}m ${secs > 0 ? `${secs}s` : ''}`;
  };

  const handleApplyPreset = (preset: PresetTemplate) => {
    setText(preset.text);
    setSelectedLanguage(preset.language);
    setGender(preset.gender);
    setTitle(`${preset.label.replace(/[^a-zA-Z0-9]/g, '_')}_Audio`);
    setVoice(preset.voice);
    setSpeechStyle(preset.speechStyle);
  };

  const handleConvert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isConverting || selectedFormats.length === 0) return;
    const resolvedLang = selectedLanguage === 'auto' ? autoDetectedLang.code : selectedLanguage;
    onConvert({
      text,
      voice,
      gender,
      language: resolvedLang,
      languageName: activeLanguageInfo.name,
      speechStyle,
      sampleRate,
      bitrate,
      title: title || 'Kathir_Audio',
      formats: selectedFormats,
    });
  };

  const handleBrowserSpeakPreview = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      if (isBrowserSpeaking) {
        setIsBrowserSpeaking(false);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = activeLanguageInfo.code;
      utterance.rate = 1.0;
      utterance.pitch = gender === 'female' ? 1.05 : 0.88;

      // Select matching voice based on gender
      const voices = window.speechSynthesis.getVoices();
      const langMatch = voices.filter((v) => v.lang.startsWith(activeLanguageInfo.code));
      if (langMatch.length > 0) {
        if (gender === 'male') {
          const maleVoice = langMatch.find((v) =>
            /male|david|mark|george|rishi|daniel|alex|fred|thomas|diego|jorge/i.test(v.name)
          );
          utterance.voice = maleVoice || langMatch[0];
        } else {
          const femaleVoice = langMatch.find((v) =>
            /female|zira|samantha|karen|victoria|moira|fiona|susan|monica/i.test(v.name)
          );
          utterance.voice = femaleVoice || langMatch[0];
        }
      }

      utterance.onend = () => setIsBrowserSpeaking(false);
      utterance.onerror = () => setIsBrowserSpeaking(false);

      setIsBrowserSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-6 shadow-xl transition-colors">
      {/* Header and Quick Actions */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <span>Speech Input &amp; Language Context</span>
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Auto-detects language context, synthesizes speech in natural female or male voice, and outputs all 9 formats (including iPhone M4R, M4A, AIFF, and CAF).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Engine transparency info button */}
          <button
            type="button"
            onClick={() => setShowEngineInfo(!showEngineInfo)}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
            title="Is the engine free? View details"
          >
            <HelpCircle className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-emerald-400 font-semibold">100% Free Engine Info</span>
          </button>

          {/* Quick browser audio preview */}
          <button
            type="button"
            onClick={handleBrowserSpeakPreview}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          >
            <Volume2 className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
            <span>{isBrowserSpeaking ? 'Stop Preview' : `Preview Spoken Words`}</span>
          </button>
        </div>
      </div>

      {/* Free Engine Transparency Box (collapsible) */}
      {showEngineInfo && (
        <div className="mb-5 rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-4 text-xs text-neutral-200 space-y-2.5">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <CheckCircle2 className="h-4 w-4" />
            <span>Text-to-Audio Engine: 100% Free &amp; Unlimited</span>
          </div>
          <p className="leading-relaxed text-[var(--text-muted)]">
            <strong className="text-[var(--text-primary)]">Yes, the text-to-speech studio is 100% free with no hidden fees or subscriptions.</strong> You can convert text into audio as much as you like across all 9 operating system formats with zero payment or credit card.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="rounded border border-[var(--border-color)] bg-[var(--bg-surface)] p-2.5">
              <strong className="text-white block mb-0.5">1. True Biological Male Voices:</strong>
              <span className="text-[var(--text-muted)]">
                Powered by authentic human neural male models (Charon, Fenrir, Puck) speaking naturally in Tamil, Hindi, English, Spanish, etc. No pitch-shifted filters or fake chest effects.
              </span>
            </div>
            <div className="rounded border border-[var(--border-color)] bg-[var(--bg-surface)] p-2.5">
              <strong className="text-white block mb-0.5">2. Natural Female Voices:</strong>
              <span className="text-[var(--text-muted)]">
                Clear, articulate female neural voices (Kore, Zephyr) delivering studio-grade narration with native linguistic cadence.
              </span>
            </div>
            <div className="rounded border border-[var(--border-color)] bg-[var(--bg-surface)] p-2.5">
              <strong className="text-white block mb-0.5">3. Local FFmpeg Audio Transcoding:</strong>
              <span className="text-[var(--text-muted)]">
                All 9 formats (including iPhone .m4r, .m4a, .aiff, .caf, .mp3, .wav, .flac, .ogg, .opus) are processed locally by open-source FFmpeg without third-party cloud API costs.
              </span>
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => setShowEngineInfo(false)}
              className="text-xs text-emerald-400 hover:underline font-semibold"
            >
              Dismiss Info
            </button>
          </div>
        </div>
      )}

      {/* Preset Buttons */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-[var(--text-muted)] mr-1">Sample Languages:</span>
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => handleApplyPreset(preset)}
            className="flex items-center gap-1.5 rounded-md border border-[var(--border-color)] bg-[var(--bg-input)] px-2.5 py-1 text-xs text-[var(--text-primary)] transition-all hover:border-[var(--accent-primary)] hover:bg-[var(--accent-subtle)]"
          >
            <span>{preset.flag}</span>
            <span>{preset.label}</span>
            <span className="text-[10px] text-[var(--text-muted)] font-mono">({preset.gender === 'female' ? '♀' : '♂'})</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleConvert} className="space-y-4">
        {/* Text Area */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="tts-text" className="block text-xs font-medium text-[var(--text-primary)]">
              Text Content
            </label>
            {/* Live Detected Language Pill */}
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <Globe className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
              <span>Context:</span>
              <span className="font-semibold text-[var(--accent-primary)] bg-[var(--accent-subtle)] px-2 py-0.5 rounded border border-[var(--border-color)]">
                {activeLanguageInfo.flag} {activeLanguageInfo.name} ({activeLanguageInfo.nativeName})
                {selectedLanguage === 'auto' ? ' · Auto' : ''}
              </span>
            </div>
          </div>

          <textarea
            id="tts-text"
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type or paste any text in English, Tamil, Hindi, Spanish, French, German, Japanese, etc..."
            className="w-full resize-y rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] p-3.5 text-sm text-[var(--text-primary)] placeholder-neutral-500 focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] leading-relaxed transition-colors"
          />
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-muted)] font-mono">
            <div className="flex items-center gap-2">
              <span>{wordCount.toLocaleString()} words</span>
              <span>·</span>
              <span>{charCount.toLocaleString()} characters</span>
              {charCount > 3000 && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-sans font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  <CheckCircle2 className="h-3 w-3" /> Full Content Conversion (No 3-min Limit)
                </span>
              )}
            </div>
            <span className="text-[var(--text-primary)] font-semibold">{formatSpokenDuration(estimatedSeconds)} spoken duration</span>
          </div>
        </div>

        {/* Language & Voice Gender Selector Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
          {/* Language Selector */}
          <div>
            <label htmlFor="lang-select" className="block text-xs font-medium text-[var(--text-primary)] mb-1.5 flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
              <span>Language</span>
            </label>
            <select
              id="lang-select"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
            >
              <option value="auto">⚡ Auto-Detect ({autoDetectedLang.name} {autoDetectedLang.flag})</option>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name} ({lang.nativeName})
                </option>
              ))}
            </select>
          </div>

          {/* Voice Gender Selection */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-primary)] mb-1.5 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
              <span>Voice Character</span>
            </label>
            <div className="flex rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] p-1">
              <button
                type="button"
                onClick={() => {
                  setGender('female');
                  setVoice('Kore');
                }}
                className={`flex flex-1 items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  gender === 'female'
                    ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span>👩</span>
                <span>Female</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setGender('male');
                  setVoice('Charon');
                }}
                className={`flex flex-1 items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  gender === 'male'
                    ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span>👨</span>
                <span>Male</span>
              </button>
            </div>
          </div>

          {/* Audio Title */}
          <div>
            <label htmlFor="sound-title" className="block text-xs font-medium text-[var(--text-primary)] mb-1.5">
              Audio File Name
            </label>
            <input
              id="sound-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Spoken_Audio"
              className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] px-3 py-2 text-xs text-[var(--text-primary)] placeholder-neutral-500 focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
            />
          </div>

          {/* Voice Persona / Tone */}
          <div>
            <label htmlFor="voice-select" className="block text-xs font-medium text-[var(--text-primary)] mb-1.5">
              Voice Style / Persona
            </label>
            <select
              id="voice-select"
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
            >
              {gender === 'female' ? (
                <>
                  <option value="Kore">Kore - Calm Studio Narrator (Natural Female)</option>
                  <option value="Zephyr">Zephyr - Bright &amp; Melodic (Natural Female)</option>
                </>
              ) : (
                <>
                  <option value="Charon">Charon - Deep Natural Male (Authentic Baritone)</option>
                  <option value="Fenrir">Fenrir - Authoritative &amp; Confident Male</option>
                  <option value="Puck">Puck - Lively &amp; Conversational Male</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* Output Audio Formats Select Box Section */}
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)]/50 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <div className="flex items-center gap-2">
                <Music2 className="h-4 w-4 text-[var(--accent-primary)]" />
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Select Output Audio Formats
                </span>
                <span className="rounded-full bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 px-2 py-0.5 text-[11px] font-semibold text-[var(--accent-primary)] font-mono">
                  {selectedFormats.length} of {AVAILABLE_FORMATS.length} selected
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                Check only the formats you need to speed up conversion and save storage space.
              </p>
            </div>

            {/* Quick action buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleSelectAll}
                className="rounded-md border border-[var(--border-color)] bg-[var(--bg-surface)] px-2 py-1 text-[11px] font-medium text-[var(--text-primary)] hover:border-[var(--accent-primary)] transition-colors cursor-pointer"
              >
                All (9)
              </button>
              <button
                type="button"
                onClick={handleSelectPopular}
                className="rounded-md border border-[var(--border-color)] bg-[var(--bg-surface)] px-2 py-1 text-[11px] font-medium text-[var(--text-primary)] hover:border-[var(--accent-primary)] transition-colors cursor-pointer"
              >
                Popular (MP3+M4A)
              </button>
              <button
                type="button"
                onClick={handleSelectApple}
                className="rounded-md border border-[var(--border-color)] bg-[var(--bg-surface)] px-2 py-1 text-[11px] font-medium text-[var(--text-primary)] hover:border-[var(--accent-primary)] transition-colors cursor-pointer"
              >
                Apple/iOS (4)
              </button>
              <button
                type="button"
                onClick={handleSelectLossless}
                className="rounded-md border border-[var(--border-color)] bg-[var(--bg-surface)] px-2 py-1 text-[11px] font-medium text-[var(--text-primary)] hover:border-[var(--accent-primary)] transition-colors cursor-pointer"
              >
                Lossless (2)
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="rounded-md border border-[var(--border-color)] bg-[var(--bg-surface)] px-2 py-1 text-[11px] font-medium text-rose-400 hover:border-rose-400/50 transition-colors cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          {selectedFormats.length === 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
              <span>Please check at least one audio format below to convert.</span>
            </div>
          )}

          {/* Format Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            {/* 1. Universal Formats */}
            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] p-3 space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-[var(--border-color)]">
                <span className="text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                  <Smartphone className="h-3.5 w-3.5 text-blue-400" />
                  <span>Universal Formats</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleCategory('universal')}
                  className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium cursor-pointer"
                >
                  {isCategoryFullySelected('universal') ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="space-y-1.5">
                {AVAILABLE_FORMATS.filter((f) => f.category === 'universal').map((fmt) => {
                  const isChecked = selectedFormats.includes(fmt.key);
                  return (
                    <label
                      key={fmt.key}
                      className={`flex items-start gap-2.5 p-2 rounded-md border cursor-pointer transition-all ${
                        isChecked
                          ? 'border-[var(--accent-primary)] bg-[var(--accent-subtle)]/40 shadow-xs'
                          : 'border-transparent hover:border-[var(--border-color)] bg-[var(--bg-input)]/40'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleFormat(fmt.key)}
                        className="mt-0.5 h-4 w-4 rounded border-[var(--border-color)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)] cursor-pointer accent-[var(--accent-primary)]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-[var(--text-primary)]">
                            {fmt.ext}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/20">
                            {fmt.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)] line-clamp-1 mt-0.5">
                          {fmt.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 2. Apple & iOS Native Formats */}
            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] p-3 space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-[var(--border-color)]">
                <span className="text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                  <Apple className="h-3.5 w-3.5 text-amber-400" />
                  <span>Apple iPhone / iOS</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleCategory('apple')}
                  className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium cursor-pointer"
                >
                  {isCategoryFullySelected('apple') ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="space-y-1.5">
                {AVAILABLE_FORMATS.filter((f) => f.category === 'apple').map((fmt) => {
                  const isChecked = selectedFormats.includes(fmt.key);
                  return (
                    <label
                      key={fmt.key}
                      className={`flex items-start gap-2.5 p-2 rounded-md border cursor-pointer transition-all ${
                        isChecked
                          ? 'border-[var(--accent-primary)] bg-[var(--accent-subtle)]/40 shadow-xs'
                          : 'border-transparent hover:border-[var(--border-color)] bg-[var(--bg-input)]/40'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleFormat(fmt.key)}
                        className="mt-0.5 h-4 w-4 rounded border-[var(--border-color)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)] cursor-pointer accent-[var(--accent-primary)]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-[var(--text-primary)]">
                            {fmt.ext}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
                            {fmt.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)] line-clamp-1 mt-0.5">
                          {fmt.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 3. Lossless Studio Formats */}
            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] p-3 space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-[var(--border-color)]">
                <span className="text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                  <Disc className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Lossless Studio</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleCategory('lossless')}
                  className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium cursor-pointer"
                >
                  {isCategoryFullySelected('lossless') ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="space-y-1.5">
                {AVAILABLE_FORMATS.filter((f) => f.category === 'lossless').map((fmt) => {
                  const isChecked = selectedFormats.includes(fmt.key);
                  return (
                    <label
                      key={fmt.key}
                      className={`flex items-start gap-2.5 p-2 rounded-md border cursor-pointer transition-all ${
                        isChecked
                          ? 'border-[var(--accent-primary)] bg-[var(--accent-subtle)]/40 shadow-xs'
                          : 'border-transparent hover:border-[var(--border-color)] bg-[var(--bg-input)]/40'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleFormat(fmt.key)}
                        className="mt-0.5 h-4 w-4 rounded border-[var(--border-color)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)] cursor-pointer accent-[var(--accent-primary)]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-[var(--text-primary)]">
                            {fmt.ext}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                            {fmt.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)] line-clamp-1 mt-0.5">
                          {fmt.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Audio Options */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>{showAdvanced ? 'Hide Audio Quality Settings' : 'Advanced Quality Settings (Sample Rate, Bitrate, Style)'}</span>
          </button>

          {showAdvanced && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] p-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                  Sample Rate
                </label>
                <select
                  value={sampleRate}
                  onChange={(e) => setSampleRate(parseInt(e.target.value, 10))}
                  className="w-full rounded border border-[var(--border-color)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
                >
                  <option value={44100}>44.1 kHz (CD Quality)</option>
                  <option value={48000}>48.0 kHz (Studio Broadcast)</option>
                  <option value={24000}>24.0 kHz (Speech Optimized)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                  Encoding Bitrate
                </label>
                <select
                  value={bitrate}
                  onChange={(e) => setBitrate(e.target.value)}
                  className="w-full rounded border border-[var(--border-color)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
                >
                  <option value="320k">320 kbps (High Fidelity)</option>
                  <option value="192k">192 kbps (Standard High Quality)</option>
                  <option value="128k">128 kbps (Compact Mobile)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                  Speech Style Prompt
                </label>
                <input
                  type="text"
                  value={speechStyle}
                  onChange={(e) => setSpeechStyle(e.target.value)}
                  placeholder="e.g. Natural studio narrator"
                  className="w-full rounded border border-[var(--border-color)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Real-Time Conversion & Chunk Progress Indicator for Long & Short Texts */}
        {isConverting && (
          <div className="rounded-xl border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/5 p-4 sm:p-5 shadow-inner transition-all animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 shrink-0 px-2 py-1 rounded-md bg-[var(--accent-primary)]/15">
                  <span className="h-4 w-1 rounded-full bg-[var(--accent-primary)] animate-pulse" />
                  <span className="h-6 w-1 rounded-full bg-[var(--accent-primary)] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-3 w-1 rounded-full bg-[var(--accent-primary)] animate-pulse" style={{ animationDelay: '300ms' }} />
                  <span className="h-5 w-1 rounded-full bg-[var(--accent-primary)] animate-bounce" style={{ animationDelay: '450ms' }} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)] flex flex-wrap items-center gap-2">
                    <span>Synthesizing Voice Speech Audio...</span>
                    {progressInfo && progressInfo.totalChunks > 1 && (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] font-semibold border border-[var(--accent-primary)]/30">
                        Section {progressInfo.currentChunk} of {progressInfo.totalChunks}
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-[var(--text-muted)] line-clamp-1 mt-0.5">
                    {progressInfo?.statusText || conversionProgress || 'Converting text into genuine spoken audio...'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                {progressInfo?.estimatedRemainingSec !== undefined && progressInfo.estimatedRemainingSec > 0 && (
                  <span className="text-xs font-mono text-[var(--text-muted)] bg-[var(--bg-surface)] px-2.5 py-1 rounded-md border border-[var(--border-color)]">
                    ~{progressInfo.estimatedRemainingSec}s remaining
                  </span>
                )}
                <span className="text-base font-black font-mono text-[var(--accent-primary)] min-w-[3rem] text-right">
                  {progressInfo?.percent ?? 5}%
                </span>
              </div>
            </div>

            {/* Glowing Multi-Color Progress Bar */}
            <div className="w-full bg-[var(--bg-input)] rounded-full h-3 overflow-hidden border border-[var(--border-color)] relative">
              <div
                className="bg-gradient-to-r from-[var(--accent-primary)] via-purple-500 to-pink-500 h-full rounded-full transition-all duration-300 relative overflow-hidden"
                style={{ width: `${Math.max(4, Math.min(100, progressInfo?.percent ?? 8))}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </div>
            </div>

            {/* Micro Details Bar */}
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--text-muted)]">
              <span>
                {progressInfo && progressInfo.totalChars > 0 ? (
                  <>
                    Characters processed: <strong className="text-[var(--text-primary)] font-mono">{progressInfo.charsProcessed.toLocaleString()}</strong> / {progressInfo.totalChars.toLocaleString()}
                  </>
                ) : (
                  <span>Processing sentence chunks to preserve authentic speech cadence...</span>
                )}
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 inline" /> Zero "hmm" tones · Genuine spoken words
              </span>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[var(--border-color)]">
          <div className="text-xs text-[var(--text-muted)] flex items-center gap-2">
            {isConverting ? (
              <span className="flex items-center gap-2 text-[var(--accent-primary)] font-medium">
                <span className="h-2 w-2 rounded-full bg-[var(--accent-primary)] animate-ping" />
                <span>{conversionProgress || `Synthesizing ${activeLanguageInfo.name} speech...`}</span>
              </span>
            ) : (
              <span className="flex flex-wrap items-center gap-1.5">
                <span>Language: <strong className="text-[var(--text-primary)]">{activeLanguageInfo.name} {activeLanguageInfo.flag}</strong></span>
                <span>·</span>
                <span>Character: <strong className="text-[var(--text-primary)]">{gender === 'female' ? 'Female 👩' : 'Male 👨 (Formant Preserved)'}</strong></span>
                <span>·</span>
                <span>Target: <strong className="text-[var(--accent-primary)]">{selectedFormats.length} format{selectedFormats.length !== 1 ? 's' : ''}</strong></span>
                <span>·</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 inline" /> 100% Free
                </span>
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isConverting || !text.trim() || selectedFormats.length === 0}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg bg-[var(--accent-primary)] hover:brightness-110 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[var(--accent-primary)]/25 transition-all active:scale-98 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {isConverting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Converting Audio to {selectedFormats.length} Format{selectedFormats.length > 1 ? 's' : ''}...</span>
              </>
            ) : (
              <>
                <span>
                  {selectedFormats.length === 0
                    ? 'Select At Least 1 Format'
                    : selectedFormats.length === AVAILABLE_FORMATS.length
                    ? 'Convert to All 9 Formats'
                    : selectedFormats.length === 1
                    ? `Convert to ${AVAILABLE_FORMATS.find((f) => f.key === selectedFormats[0])?.label || selectedFormats[0].toUpperCase()}`
                    : `Convert to ${selectedFormats.length} Selected Formats`}
                </span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
