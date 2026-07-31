// The CultureLM seal: presidential-weight emblem — double ring, star crown,
// heavy monogram. Administration palette: navy ink with oxblood stars.

export function Seal({ size = 56 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="50" cy="50" r="47" stroke="#1c2e4a" strokeWidth="3.5" />
      <circle cx="50" cy="50" r="39" stroke="#1c2e4a" strokeWidth="1.2" />
      {/* star crown */}
      {[-24, -12, 0, 12, 24].map((deg) => (
        <g key={deg} transform={`rotate(${deg} 50 50)`}>
          <path
            d="M50 8.5 L51.8 13 L56.5 13 L52.8 15.9 L54.2 20.4 L50 17.7 L45.8 20.4 L47.2 15.9 L43.5 13 L48.2 13 Z"
            fill="#9e2b25"
          />
        </g>
      ))}
      {/* monogram */}
      <text
        x="50"
        y="63"
        textAnchor="middle"
        fontFamily="var(--font-display), Georgia, serif"
        fontWeight="900"
        fontSize="28"
        fill="#1c2e4a"
        letterSpacing="-1"
      >
        CLM
      </text>
      {/* base bars */}
      <rect x="30" y="74" width="40" height="2.6" rx="1.3" fill="#1c2e4a" />
      <rect x="37" y="80" width="26" height="2" rx="1" fill="#9e2b25" opacity="0.85" />
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
