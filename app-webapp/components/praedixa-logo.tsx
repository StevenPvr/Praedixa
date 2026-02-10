interface PraedixaLogoProps {
  size?: number;
  color?: string;
  className?: string;
}

/**
 * Praedixa "industrial" logo — SVG P in a square frame with decorative dot.
 * Matches the landing page logo (apps/landing/components/logo/PraedixaLogo.tsx).
 */
export function PraedixaLogo({
  size = 32,
  color = "oklch(0.145 0 0)",
  className,
}: PraedixaLogoProps) {
  const sw = 2; // strokeWidth

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
      {/* Outer square frame */}
      <rect
        x="4"
        y="4"
        width="56"
        height="56"
        stroke={color}
        strokeWidth={sw}
        fill="none"
      />
      {/* P - vertical bar */}
      <line
        x1="18"
        y1="16"
        x2="18"
        y2="48"
        stroke={color}
        strokeWidth={sw * 1.5}
        strokeLinecap="square"
      />
      {/* P - top horizontal */}
      <line
        x1="18"
        y1="16"
        x2="38"
        y2="16"
        stroke={color}
        strokeWidth={sw * 1.5}
        strokeLinecap="square"
      />
      {/* P - right vertical */}
      <line
        x1="38"
        y1="16"
        x2="38"
        y2="29"
        stroke={color}
        strokeWidth={sw * 1.5}
        strokeLinecap="square"
      />
      {/* P - middle horizontal */}
      <line
        x1="38"
        y1="29"
        x2="18"
        y2="29"
        stroke={color}
        strokeWidth={sw * 1.5}
        strokeLinecap="square"
      />
      {/* Decorative dot */}
      <circle cx="50" cy="42" r="4" fill={color} />
    </svg>
  );
}
