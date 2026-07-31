// The CultureLM seal: presidential-weight emblem — double ring, star crown,
// heavy monogram. Renders crisp at any size; gold on black by default.

export function Seal({ size = 56 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sealGold" x1="0" y1="0" x2="100" y2="100">
          <stop offset="0" stopColor="#f5c26b" />
          <stop offset="0.55" stopColor="#e8a33d" />
          <stop offset="1" stopColor="#b97a1e" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="47" stroke="url(#sealGold)" strokeWidth="3.5" />
      <circle cx="50" cy="50" r="39" stroke="url(#sealGold)" strokeWidth="1.2" />
      {/* star crown */}
      {[-24, -12, 0, 12, 24].map((deg) => (
        <g key={deg} transform={`rotate(${deg} 50 50)`}>
          <path
            d="M50 8.5 L51.8 13 L56.5 13 L52.8 15.9 L54.2 20.4 L50 17.7 L45.8 20.4 L47.2 15.9 L43.5 13 L48.2 13 Z"
            fill="url(#sealGold)"
          />
        </g>
      ))}
      {/* monogram */}
      <text
        x="50"
        y="63"
        textAnchor="middle"
        fontFamily="var(--font-display), Impact, sans-serif"
        fontSize="30"
        fill="url(#sealGold)"
        letterSpacing="-1"
      >
        CLM
      </text>
      {/* base bars */}
      <rect x="30" y="74" width="40" height="2.6" rx="1.3" fill="url(#sealGold)" />
      <rect x="37" y="80" width="26" height="2" rx="1" fill="url(#sealGold)" opacity="0.7" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="wordmark display">
      CULTURE<span className="wordmark-lm">LM</span>
    </span>
  );
}
