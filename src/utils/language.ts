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

  // 1. Script checks based on Unicode character counts
  const tamilChars = (text.match(/[\u0B80-\u0BFF]/g) || []).length;
  if (tamilChars > 0) return SUPPORTED_LANGUAGES.find((l) => l.code === 'ta')!;

  const hindiChars = (text.match(/[\u0900-\u097F]/g) || []).length;
  if (hindiChars > 0) return SUPPORTED_LANGUAGES.find((l) => l.code === 'hi')!;

  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  if (arabicChars > 0) return SUPPORTED_LANGUAGES.find((l) => l.code === 'ar')!;

  const japaneseChars = (text.match(/[\u3040-\u309F\u30A0-\u30FF]/g) || []).length;
  if (japaneseChars > 0) return SUPPORTED_LANGUAGES.find((l) => l.code === 'ja')!;

  const koreanChars = (text.match(/[\uAC00-\uD7AF\u1100-\u11FF]/g) || []).length;
  if (koreanChars > 0) return SUPPORTED_LANGUAGES.find((l) => l.code === 'ko')!;

  const chineseChars = (text.match(/[\u4E00-\u9FFF]/g) || []).length;
  if (chineseChars > 0) return SUPPORTED_LANGUAGES.find((l) => l.code === 'zh')!;

  const russianChars = (text.match(/[\u0400-\u04FF]/g) || []).length;
  if (russianChars > 0) return SUPPORTED_LANGUAGES.find((l) => l.code === 'ru')!;

  // 2. Romanized Tanglish (Tamil in English alphabet)
  const lower = ' ' + text.toLowerCase().replace(/[^a-z0-9áéíóúüñãõäöüßçàâèêëîïôûùœ ]/g, ' ') + ' ';
  if (
    /\b(vanakkam|kalai\s+vanakkam|nanri|epdi|irukinga|irukeenga|enna|thambi|machan|romba|nalla|solunga|theriyuma|vanga|ponga|tamil|chennai|madurai|coimbatore|illai|ama|enga|eppadi)\b/.test(
      lower
    )
  ) {
    return SUPPORTED_LANGUAGES.find((l) => l.code === 'ta')!;
  }

  // 3. Romanized Hinglish (Hindi in English alphabet)
  if (
    /\b(namaste|namaskar|kaise\s+ho|kya\s+haal|dhanyawad|shukriya|bahut|accha|theek|bhai|bhaiya|karega|hoga|nahi|zaroor)\b/.test(
      lower
    )
  ) {
    return SUPPORTED_LANGUAGES.find((l) => l.code === 'hi')!;
  }

  // 4. Scored vocabulary & diacritics for Latin scripts
  let scoreEn = 0;
  let scoreEs = 0;
  let scoreFr = 0;
  let scoreDe = 0;
  let scoreIt = 0;
  let scorePt = 0;

  // High-frequency English tokens
  const enMatches = lower.match(
    /\b(the|this|that|with|have|from|they|which|welcome|convert|speech|audio|voice|studio|text|natural|crystal|clear|files|instantly|please|about|would|there|could|should|because|between|people|before)\b/g
  );
  if (enMatches) scoreEn += enMatches.length * 2;

  // Spanish
  if (/[áéíóúüñ¿¡]/.test(lower)) scoreEs += 3;
  const esMatches = lower.match(
    /\b(hola|gracias|amigo|amigos|tiempo|buenos|días|buenas|tardes|noches|por\s+favor|estoy|estás|español|también|después|todos|nosotros|ustedes|hablar|entonces|bienvenido|bienvenidos)\b/g
  );
  if (esMatches) scoreEs += esMatches.length * 2;

  // French
  if (/[çèêëàâîïôûùœ]/.test(lower)) scoreFr += 3;
  const frMatches = lower.match(
    /\b(bonjour|merci|s'il\s+vous\s+plaît|français|avec|dans|nous|vous|cette|aussi|toujours|très|faire|beaucoup|maison|monde|maintenant|bienvenue)\b/g
  );
  if (frMatches) scoreFr += frMatches.length * 2;

  // German
  if (/[äöüß]/.test(lower)) scoreDe += 3;
  const deMatches = lower.match(
    /\b(hallo|danke|bitte|deutsch|nicht|guten|morgen|abend|immer|wieder|zusammen|vielleicht|schön|tschüss|willkommen|sprechen)\b/g
  );
  if (deMatches) scoreDe += deMatches.length * 2;

  // Italian
  const itMatches = lower.match(
    /\b(ciao|grazie|prego|italiano|buongiorno|buonasera|arrivederci|perché|quando|sempre|ancora|tutto|tutti|amico|bello|molto|benvenuto|benvenuti)\b/g
  );
  if (itMatches) scoreIt += itMatches.length * 2;

  // Portuguese
  if (/[ãõ]/.test(lower)) scorePt += 3;
  const ptMatches = lower.match(
    /\b(olá|obrigado|obrigada|português|muito|você|vocês|também|depois|sempre|agora|fazer|amigo|bom\s+dia|boa\s+tarde|bem-vindo|bem-vindos)\b/g
  );
  if (ptMatches) scorePt += ptMatches.length * 2;

  const scores = [
    { code: 'en', score: scoreEn },
    { code: 'es', score: scoreEs },
    { code: 'fr', score: scoreFr },
    { code: 'de', score: scoreDe },
    { code: 'it', score: scoreIt },
    { code: 'pt', score: scorePt },
  ];

  scores.sort((a, b) => b.score - a.score);

  if (scores[0].score > 0) {
    return SUPPORTED_LANGUAGES.find((l) => l.code === scores[0].code) || SUPPORTED_LANGUAGES[0];
  }

  return SUPPORTED_LANGUAGES[0]; // English default
}
