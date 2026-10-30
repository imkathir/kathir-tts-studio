export interface FormatItem {
  format: string;
  fileName: string;
  mimeType: string;
  size: number;
  codec: string;
  label: string;
  category?: 'apple' | 'universal' | 'lossless';
  recommendedFor: string;
  streamUrl: string;
  downloadUrl: string;
}

export interface FormatOption {
  key: string;
  ext: string;
  label: string;
  category: 'universal' | 'apple' | 'lossless';
  description: string;
  badge?: string;
  isPopular?: boolean;
}

export interface AudioJob {
  jobId: string;
  id?: string;
  text: string;
  voice: string;
  gender: 'female' | 'male';
  language: string;
  languageName?: string;
  synthesizer: string;
  durationSeconds: number;
  formats: FormatItem[];
  zipDownloadUrl: string;
  timestamp?: number;
}

export interface PresetTemplate {
  id: string;
  label: string;
  language: string;
  languageName: string;
  flag: string;
  gender: 'female' | 'male';
  text: string;
  voice: string;
  speechStyle: string;
}

export type ColorTheme = 'indigo' | 'emerald' | 'crimson' | 'amber' | 'cyan' | 'light';

export interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}
