const sizeClass = {
  sm: "h-6",
  md: "h-8",
  lg: "h-12",
} as const;

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  return (
    <svg
      className={`${sizeClass[size]} w-auto`}
      viewBox="0 0 152 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Mezoir"
    >
      <path
        d="M6 30V10l7 9 7-9v20"
        stroke="#f7931a"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 10h16M4 30h16"
        stroke="#f7931a"
        strokeWidth="1.25"
        strokeLinecap="round"
        opacity="0.35"
      />
      <circle cx="24" cy="12" r="1.75" fill="#3b82f6" />
      <text
        x="34"
        y="27"
        fill="#0a2540"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="21"
        fontWeight="600"
        letterSpacing="-0.03em"
      >
        Mezoir
      </text>
    </svg>
  );
}
