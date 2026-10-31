import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
}) => {
  const iconDimensions = {
    sm: { box: 28, textClass: 'text-base' },
    md: { box: 36, textClass: 'text-lg' },
    lg: { box: 44, textClass: 'text-2xl' },
    xl: { box: 56, textClass: 'text-3xl' },
  }[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Visual Logo Emblem */}
      <div
        className="relative shrink-0 flex items-center justify-center transition-transform hover:scale-105"
        style={{ width: iconDimensions.box, height: iconDimensions.box }}
      >
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-md"
        >
          <defs>
            <linearGradient id="logoBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
            <linearGradient id="logoWaveGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.92" />
              <stop offset="100%" stopColor="#ffffff" />
            </linearGradient>
            <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Squircle Badge */}
          <rect width="100" height="100" rx="24" fill="url(#logoBgGrad)" />
          <rect
            x="1"
            y="1"
            width="98"
            height="98"
            rx="23"
            stroke="#ffffff"
            strokeOpacity="0.25"
            strokeWidth="2"
          />

          {/* Glowing Stylized "K" Acoustic Waves */}
          <g filter="url(#logoGlow)">
            {/* Equalizer Sound Stem */}
            <rect x="22" y="24" width="8" height="52" rx="4" fill="url(#logoWaveGrad)" />

            {/* Upper Wave Arm */}
            <path
              d="M28 50 L48 28 C50 26 53 26 55 28 L57 30 C59 32 59 35 57 37 L41 53 Z"
              fill="url(#logoWaveGrad)"
            />

            {/* Lower Wave Arm */}
            <path
              d="M37 49 L58 71 C60 73 60 76 58 78 L56 80 C54 82 51 82 49 80 L28 57 Z"
              fill="url(#logoWaveGrad)"
            />

            {/* Radiating Sound Waves */}
            <path
              d="M66 36 C73 44 73 56 66 64"
              stroke="#ffffff"
              strokeWidth="4.5"
              strokeLinecap="round"
              fill="none"
              opacity="0.9"
            />
            <path
              d="M76 28 C87 39 87 61 76 72"
              stroke="#ffffff"
              strokeWidth="4.5"
              strokeLinecap="round"
              fill="none"
              opacity="0.65"
            />

            {/* Sound particle */}
            <circle cx="85" cy="50" r="3" fill="#ffffff" opacity="0.85" />
          </g>
        </svg>
      </div>

      {/* Typography */}
      {showText && (
        <div className="flex flex-col">
          <span className={`font-extrabold tracking-tight text-[var(--text-primary)] leading-tight ${iconDimensions.textClass}`}>
            <span>kathir</span>
            <span className="text-[var(--accent-primary)] font-black">Studio</span>
          </span>
          {size !== 'sm' && (
            <span className="text-[10px] uppercase font-mono tracking-widest text-[var(--text-muted)] font-semibold">
              Universal TTS
            </span>
          )}
        </div>
      )}
    </div>
  );
};
