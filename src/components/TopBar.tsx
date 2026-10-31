import React from 'react';
import { Sparkles, Palette, Check } from 'lucide-react';
import { ColorTheme } from '../types';
import { Logo } from './Logo';

interface TopBarProps {
  onScrollToFormats: () => void;
  onScrollToStudio: () => void;
  currentTheme: ColorTheme;
  onSelectTheme: (theme: ColorTheme) => void;
}

const THEMES: Array<{ id: ColorTheme; name: string; color: string; border: string }> = [
  { id: 'indigo', name: 'Indigo Studio', color: 'bg-indigo-500', border: 'border-indigo-400' },
  { id: 'emerald', name: 'Emerald Forest', color: 'bg-emerald-500', border: 'border-emerald-400' },
  { id: 'crimson', name: 'Crimson Flame', color: 'bg-rose-500', border: 'border-rose-400' },
  { id: 'amber', name: 'Amber Glow', color: 'bg-amber-500', border: 'border-amber-400' },
  { id: 'cyan', name: 'Cyber Cyan', color: 'bg-cyan-500', border: 'border-cyan-400' },
  { id: 'light', name: 'Clean Light', color: 'bg-slate-300', border: 'border-slate-500' },
];

export const TopBar: React.FC<TopBarProps> = ({
  onScrollToFormats,
  onScrollToStudio,
  currentTheme,
  onSelectTheme,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--border-color)] bg-[var(--bg-main)]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-3.5">
        {/* Zone 1: Brand Logo & Title */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onScrollToStudio();
          }}
          className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-[var(--text-primary)] whitespace-nowrap shrink-0 hover:opacity-95 transition-opacity"
        >
          <Logo size="md" showText={false} />
          <span className="flex items-baseline gap-2">
            <span className="font-extrabold tracking-tight">
              <span>kathir</span>
              <span className="text-[var(--accent-primary)] font-black">Studio</span>
            </span>
            <span className="hidden lg:inline text-xs font-normal text-[var(--text-muted)] border-l border-[var(--border-color)] pl-2">
              Universal Text to Audio Format Converter
            </span>
          </span>
        </a>

        {/* Zone 2: Navigation Links & Color Theme Picker */}
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <button
              onClick={onScrollToStudio}
              className="transition-colors whitespace-nowrap shrink-0 text-[var(--accent-primary)] font-semibold hover:opacity-80"
            >
              Voice Studio
            </button>
            <button
              onClick={onScrollToFormats}
              className="transition-colors whitespace-nowrap shrink-0 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              Audio Formats
            </button>
          </nav>

          {/* Theme Palette Bar */}
          <div className="flex items-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] p-1">
            <Palette className="h-3.5 w-3.5 text-[var(--text-muted)] ml-1 mr-0.5" />
            <div className="flex items-center gap-1">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelectTheme(t.id)}
                  title={`Switch to ${t.name} theme`}
                  className={`h-5 w-5 rounded-full ${t.color} flex items-center justify-center transition-transform hover:scale-110 ${
                    currentTheme === t.id
                      ? 'ring-2 ring-offset-1 ring-[var(--accent-primary)] ring-offset-[var(--bg-main)] scale-105'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  aria-label={t.name}
                >
                  {currentTheme === t.id && <Check className="h-2.5 w-2.5 text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onScrollToStudio}
            className="flex items-center gap-2 rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-xs font-semibold text-white transition-all hover:brightness-110 active:scale-98 whitespace-nowrap shrink-0 shadow-sm shadow-[var(--accent-primary)]/25"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Generate Speech</span>
          </button>
        </div>
      </div>
    </header>
  );
};
