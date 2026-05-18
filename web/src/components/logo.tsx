export const MEZO_RASPBERRY = "#e91e63";

const sizeClass = {
  sm: "h-6",
  md: "h-8",
  lg: "h-12",
} as const;

export function Logo({
  size = "md",
  theme = "light",
}: {
  size?: "sm" | "md" | "lg";
  theme?: "light" | "dark";
}) {
  const textFill = theme === "dark" ? "#ffffff" : "#0a0a0a";
  const lockStroke = theme === "dark" ? "#ffffff" : MEZO_RASPBERRY;

  return (
    <svg
      className={`${sizeClass[size]} w-auto transition-transform duration-300 group-hover:animate-[logo-wiggle_0.5s_ease-in-out]`}
      viewBox="0 0 132 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Mezoir"
    >
      {/* Wave-loop M + subtle lock shackle */}
      <path
        d="M4 22V10c0-2.2 1.8-4 4-4 1.4 0 2.6.7 3.3 1.8M11 6.5c.7-1.1 1.9-1.8 3.3-1.8 2.2 0 4 1.8 4 4v12"
        stroke={MEZO_RASPBERRY}
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11 6.5c.7-1.1 1.9-1.8 3.3-1.8 2.2 0 4 1.8 4 4v12"
        stroke={MEZO_RASPBERRY}
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.45"
        transform="translate(6 0)"
      />
      <rect
        x="7.5"
        y="14"
        width="5"
        height="4.5"
        rx="1"
        stroke={lockStroke}
        strokeWidth="1.25"
        fill="none"
        opacity="0.85"
      />
      <circle cx="10" cy="14" r="1.1" fill={MEZO_RASPBERRY} />
      <text
        x="34"
        y="23"
        fill={textFill}
        fontFamily="inherit"
        fontSize="19"
        fontWeight="600"
        letterSpacing="-0.02em"
      >
        mezoir
      </text>
    </svg>
  );
}
