export function GiantHotdog({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 280 160"
      role="img"
      aria-label="A giant smiling hotdog in a bun"
    >
      <ellipse cx="140" cy="118" rx="118" ry="32" fill="#c47d3a" />
      <ellipse cx="140" cy="110" rx="118" ry="32" fill="#e8a45c" />
      <ellipse cx="140" cy="104" rx="100" ry="22" fill="#f0b872" opacity="0.5" />

      <rect x="48" y="62" width="184" height="44" rx="22" fill="#c44b3c" />
      <ellipse cx="48" cy="84" rx="18" ry="22" fill="#c44b3c" />
      <ellipse cx="232" cy="84" rx="18" ry="22" fill="#c44b3c" />
      <ellipse cx="140" cy="74" rx="90" ry="12" fill="#d65a4a" opacity="0.55" />

      <path
        d="M62 84 C88 70, 110 98, 140 82 S192 70, 218 88"
        fill="none"
        stroke="#f5c518"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M70 92 C96 104, 118 78, 148 94 S200 108, 214 86"
        fill="none"
        stroke="#d62828"
        strokeWidth="5"
        strokeLinecap="round"
        opacity="0.9"
      />

      <ellipse cx="140" cy="58" rx="118" ry="36" fill="#e8a45c" />
      <ellipse cx="140" cy="50" rx="100" ry="24" fill="#f0b872" opacity="0.55" />
      <ellipse cx="95" cy="48" rx="10" ry="6" fill="#c47d3a" opacity="0.35" />
      <ellipse cx="140" cy="42" rx="8" ry="5" fill="#c47d3a" opacity="0.3" />
      <ellipse cx="185" cy="50" rx="9" ry="5" fill="#c47d3a" opacity="0.35" />

      <circle cx="118" cy="84" r="4" fill="#5c2418" />
      <circle cx="162" cy="84" r="4" fill="#5c2418" />
      <path
        d="M128 96 Q140 106 152 96"
        fill="none"
        stroke="#5c2418"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
