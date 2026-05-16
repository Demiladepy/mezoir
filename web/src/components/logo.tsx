/** Mezoir brand magenta from official wordmark */
export const MEZOIR_MAGENTA = "#F4007A";

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
      {/* Wavy mark — continuous ribbon with two rounded peaks */}
      <path
        d="M3.5 29.5C3.5 29.5 3.5 11 13 11C18.5 11 19 21.5 22.5 21.5C26 21.5 26.5 9.5 36 9.5C45 9.5 48.5 11 48.5 29.5"
        stroke={MEZOIR_MAGENTA}
        strokeWidth="4.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x="58"
        y="29"
        fill={MEZOIR_MAGENTA}
        fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
        fontSize="22.5"
        fontWeight="700"
        letterSpacing="-0.02em"
      >
        Mezoir
      </text>
    </svg>
  );
}
