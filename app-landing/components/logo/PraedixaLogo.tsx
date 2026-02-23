export type LogoVariant = "industrial" | "rounded" | "minimal" | "geometric";

export const LOGO_COLORS = {
  dark: "var(--warm-ink)",
  light: "var(--ink)",
} as const;

interface PraedixaLogoProps {
  variant?: LogoVariant;
  size?: number;
  color?: string;
  strokeWidth?: number;
  animate?: boolean;
  className?: string;
}

function LogoGlyph({
  variant,
  color,
  strokeWidth,
}: {
  variant: LogoVariant;
  color: string;
  strokeWidth: number;
}) {
  if (variant === "rounded") {
    return (
      <g>
        <circle
          cx="32"
          cy="32"
          r="28"
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <path
          d="M22 46V18H36C42 18 46 22 46 28C46 34 42 38 36 38H22"
          stroke={color}
          strokeWidth={1.5 * strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="50" cy="50" r="3" fill={color} />
      </g>
    );
  }

  if (variant === "minimal") {
    return (
      <g>
        <path
          d="M16 52V12H40C50 12 56 20 56 28C56 36 50 44 40 44H24"
          stroke={color}
          strokeWidth={1.5 * strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <line
          x1="16"
          y1="58"
          x2="28"
          y2="58"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          opacity="0.5"
        />
      </g>
    );
  }

  if (variant === "geometric") {
    return (
      <g>
        <rect
          x="10"
          y="10"
          width="44"
          height="44"
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          transform="rotate(45 32 32)"
        />
        <line
          x1="22"
          y1="18"
          x2="22"
          y2="46"
          stroke={color}
          strokeWidth={1.5 * strokeWidth}
          strokeLinecap="square"
        />
        <path
          d="M22 18H36C42 18 46 22 46 28C46 34 42 38 36 38H22"
          stroke={color}
          strokeWidth={1.5 * strokeWidth}
          strokeLinecap="square"
          strokeLinejoin="miter"
          fill="none"
        />
      </g>
    );
  }

  return (
    <g>
      <rect
        x="4"
        y="4"
        width="56"
        height="56"
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <line
        x1="18"
        y1="16"
        x2="18"
        y2="48"
        stroke={color}
        strokeWidth={1.5 * strokeWidth}
        strokeLinecap="square"
      />
      <line
        x1="18"
        y1="16"
        x2="38"
        y2="16"
        stroke={color}
        strokeWidth={1.5 * strokeWidth}
        strokeLinecap="square"
      />
      <line
        x1="38"
        y1="16"
        x2="38"
        y2="29"
        stroke={color}
        strokeWidth={1.5 * strokeWidth}
        strokeLinecap="square"
      />
      <line
        x1="38"
        y1="29"
        x2="18"
        y2="29"
        stroke={color}
        strokeWidth={1.5 * strokeWidth}
        strokeLinecap="square"
      />
      <circle cx="50" cy="42" r="4" fill={color} />
    </g>
  );
}

export function PraedixaLogo({
  variant = "industrial",
  size = 40,
  color = LOGO_COLORS.dark,
  strokeWidth = 2,
  animate = false,
  className = "",
}: PraedixaLogoProps) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        lineHeight: 0,
        opacity: 1,
        transition: animate
          ? "opacity 0.4s cubic-bezier(0.22, 1, 0.36, 1)"
          : undefined,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <LogoGlyph variant={variant} color={color} strokeWidth={strokeWidth} />
      </svg>
    </div>
  );
}
