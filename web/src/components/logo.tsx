const sizeClass = {
  sm: "h-6",
  md: "h-8",
  lg: "h-12",
} as const;

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  return (
    <svg
      className={`${sizeClass[size]} w-auto`}
      viewBox="0 0 168 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Mezoir"
    >
      <defs>
        <linearGradient id="mz-accent" x1="0" y1="0" x2="40" y2="40">
          <stop offset="0%" stopColor="#f7931a" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      {/* M mark: veNFT lock + circuit node */}
      <rect
        x="2"
        y="6"
        width="28"
        height="28"
        rx="6"
        stroke="url(#mz-accent)"
        strokeWidth="1.5"
        fill="rgba(247,147,26,0.08)"
      />
      <path
        d="M10 28V14l6 8 6-8v14"
        stroke="#f7931a"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="28" cy="12" r="2" fill="#3b82f6" />
      <path
        d="M28 14v6M25 17h6"
        stroke="#06b6d4"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.9"
      />
      {/* Wordmark */}
      <text
        x="40"
        y="27"
        fill="#fafafa"
        fontFamily="system-ui, sans-serif"
        fontSize="22"
        fontWeight="600"
        letterSpacing="-0.02em"
      >
        Mez
        <tspan fill="#f7931a">oi</tspan>
        <tspan fill="#e2e8f0">r</tspan>
      </text>
    </svg>
  );
}
