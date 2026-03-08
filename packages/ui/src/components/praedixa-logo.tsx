interface PraedixaLogoProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}

const COLORS = {
  dark: "var(--warm-ink)",
  light: "var(--warm-bg-white)",
} as const;

export { COLORS as LOGO_COLORS };

export function PraedixaLogo({
  size = 40,
  color = COLORS.dark,
  strokeWidth = 1,
  className = "",
}: PraedixaLogoProps) {
  const frameStroke = 1.1 * strokeWidth;
  const markStroke = 1.65 * strokeWidth;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <g fill="none" stroke={color}>
        <rect
          x="10"
          y="10"
          width="44"
          height="44"
          transform="rotate(45 32 32)"
          strokeWidth={frameStroke}
        />
        <line
          x1="22"
          y1="18"
          x2="22"
          y2="46"
          strokeWidth={markStroke}
          strokeLinecap="square"
        />
        <path
          d="M22 18H36C42 18 46 22 46 28C46 34 42 38 36 38H22"
          strokeWidth={markStroke}
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      </g>
    </svg>
  );
}
