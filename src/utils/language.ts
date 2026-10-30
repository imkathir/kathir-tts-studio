import { LanguageInfo } from '../types';

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
];

export function detectLanguage(text: string): LanguageInfo {
  if (!text || !text.trim()) {
    return SUPPORTED_LANGUAGES[0]; // English default
  }

  // 1. Script checks
  if (/[\u0B80-\u0BFF]/.test(text)) return SUPPORTED_LANGUAGES.find((l) => l.code === 'ta')!;
  if (/[\u0900-\u097F]/.test(text)) return SUPPORTED_LANGUAGES.find((l) => l.code === 'hi')!;
  if (/[\u0600-\u06FF]/.test(text)) return SUPPORTED_LANGUAGES.find((l) => l.code === 'ar')!;
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return SUPPORTED_LANGUAGES.find((l) => l.code === 'ja')!;
  if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(text)) return SUPPORTED_LANGUAGES.find((l) => l.code === 'ko')!;
  if (/[\u4E00-\u9FFF]/.test(text)) return SUPPORTED_LANGUAGES.find((l) => l.code === 'zh')!;
  if (/[\u0400-\u04FF]/.test(text)) return SUPPORTED_LANGUAGES.find((l) => l.code === 'ru')!;

  // 2. Vocabulary & diacritics for Latin scripts
  const lower = ' ' + text.toLowerCase().replace(/[^a-zàâçéèêëîïôûùüœáíóúñãõäöüß ]/g, ' ') + ' ';

  // Spanish
  if (/[áéíóúüñ¿¡]/.test(lower) || /\b(el|la|los|las|un|una|en|de|que|por|para|con|hola|gracias|estás|amigo|tiempo)\b/.test(lower)) {
    return SUPPORTED_LANGUAGES.find((l) => l.code === 'es')!;
  }

  // French
  if (/[àâçèêëîïôûùœ]/.test(lower) || /\b(le|la|les|un|une|des|et|est|dans|pour|avec|bonjour|merci|vous|nous|bien)\b/.test(lower)) {
    return SUPPORTED_LANGUAGES.find((l) => l.code === 'fr')!;
  }

  // German
  if (/[äöüß]/.test(lower) || /\b(der|die|das|und|ist|nicht|mit|für|auf|hallo|danke|bitte|guten|morgen)\b/.test(lower)) {
    return SUPPORTED_LANGUAGES.find((l) => l.code === 'de')!;
  }

  // Italian
  if (/\b(il|lo|la|i|gli|le|un|uno|una|di|da|in|con|su|per|tra|fra|ciao|grazie|come|stai|bene)\b/.test(lower)) {
    return SUPPORTED_LANGUAGES.find((l) => l.code === 'it')!;
  }

  // Portuguese
  if (/[ãõ]/.test(lower) || /\b(o|a|os|as|um|uma|do|da|dos|das|no|na|em|olá|obrigado|muito|você)\b/.test(lower)) {
    return SUPPORTED_LANGUAGES.find((l) => l.code === 'pt')!;
  }

  return SUPPORTED_LANGUAGES[0]; // English default
}
