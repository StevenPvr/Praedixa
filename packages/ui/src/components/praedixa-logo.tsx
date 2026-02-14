export type LogoVariant = "industrial" | "rounded" | "minimal" | "geometric";

interface PraedixaLogoProps {
  variant?: LogoVariant;
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}

const COLORS = {
  dark: "oklch(0.145 0 0)",
  light: "oklch(1 0 0)",
} as const;

export { COLORS as LOGO_COLORS };

export function PraedixaLogo({
  variant = "industrial",
  size = 40,
  color = COLORS.dark,
  strokeWidth = 2,
  className = "",
}: PraedixaLogoProps) {
  const Logo = VARIANTS[variant];

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
      <Logo color={color} strokeWidth={strokeWidth} />
    </svg>
  );
}

interface VariantProps {
  color: string;
  strokeWidth: number;
}

function IndustrialP({ color, strokeWidth }: VariantProps) {
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
        strokeWidth={strokeWidth * 1.5}
        strokeLinecap="square"
      />
      <line
        x1="18"
        y1="16"
        x2="38"
        y2="16"
        stroke={color}
        strokeWidth={strokeWidth * 1.5}
        strokeLinecap="square"
      />
      <line
        x1="38"
        y1="16"
        x2="38"
        y2="29"
        stroke={color}
        strokeWidth={strokeWidth * 1.5}
        strokeLinecap="square"
      />
      <line
        x1="38"
        y1="29"
        x2="18"
        y2="29"
        stroke={color}
        strokeWidth={strokeWidth * 1.5}
        strokeLinecap="square"
      />
      <circle cx="50" cy="42" r="4" fill={color} />
    </g>
  );
}

function RoundedP({ color, strokeWidth }: VariantProps) {
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
        strokeWidth={strokeWidth * 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="50" cy="50" r="3" fill={color} />
    </g>
  );
}

function MinimalP({ color, strokeWidth }: VariantProps) {
  return (
    <g>
      <path
        d="M16 52V12H40C50 12 56 20 56 28C56 36 50 44 40 44H24"
        stroke={color}
        strokeWidth={strokeWidth * 1.5}
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

function GeometricP({ color, strokeWidth }: VariantProps) {
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
        strokeWidth={strokeWidth * 1.5}
        strokeLinecap="square"
      />
      <path
        d="M22 18H36C42 18 46 22 46 28C46 34 42 38 36 38H22"
        stroke={color}
        strokeWidth={strokeWidth * 1.5}
        strokeLinecap="square"
        strokeLinejoin="miter"
        fill="none"
      />
    </g>
  );
}

const VARIANTS = {
  industrial: IndustrialP,
  rounded: RoundedP,
  minimal: MinimalP,
  geometric: GeometricP,
} as const;
