"use client";

import { motion } from "framer-motion";

export type LogoVariant = "industrial" | "rounded" | "minimal" | "geometric";

interface PraedixaLogoProps {
  variant?: LogoVariant;
  size?: number;
  color?: string;
  strokeWidth?: number;
  animate?: boolean;
  className?: string;
}

// Color constants
const COLORS = {
  dark: "oklch(0.145 0 0)", // Rich black (OKLCH)
  light: "oklch(1 0 0)", // Pure white (OKLCH)
} as const;

export function PraedixaLogo({
  variant = "industrial",
  size = 40,
  color = COLORS.dark,
  strokeWidth = 2,
  animate = false,
  className = "",
}: PraedixaLogoProps) {
  const Logo = VARIANTS[variant];

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      initial={animate ? { opacity: 0 } : undefined}
      animate={animate ? { opacity: 1 } : undefined}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <Logo color={color} strokeWidth={strokeWidth} />
    </motion.svg>
  );
}

interface VariantProps {
  color: string;
  strokeWidth: number;
}

// Variant 1: Industrial - Like the splash screen
function IndustrialP({ color, strokeWidth }: VariantProps) {
  return (
    <g>
      {/* Outer square frame */}
      <rect
        x="4"
        y="4"
        width="56"
        height="56"
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
      />
      {/* P - vertical bar */}
      <line
        x1="18"
        y1="16"
        x2="18"
        y2="48"
        stroke={color}
        strokeWidth={strokeWidth * 1.5}
        strokeLinecap="square"
      />
      {/* P - top horizontal */}
      <line
        x1="18"
        y1="16"
        x2="38"
        y2="16"
        stroke={color}
        strokeWidth={strokeWidth * 1.5}
        strokeLinecap="square"
      />
      {/* P - right vertical */}
      <line
        x1="38"
        y1="16"
        x2="38"
        y2="29"
        stroke={color}
        strokeWidth={strokeWidth * 1.5}
        strokeLinecap="square"
      />
      {/* P - middle horizontal */}
      <line
        x1="38"
        y1="29"
        x2="18"
        y2="29"
        stroke={color}
        strokeWidth={strokeWidth * 1.5}
        strokeLinecap="square"
      />
      {/* Decorative dot */}
      <circle cx="50" cy="42" r="4" fill={color} />
    </g>
  );
}

// Variant 2: Rounded - Circular frame, softer P
function RoundedP({ color, strokeWidth }: VariantProps) {
  return (
    <g>
      {/* Circular frame */}
      <circle
        cx="32"
        cy="32"
        r="28"
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
      />
      {/* P as a path with rounded corners */}
      <path
        d="M22 46V18H36C42 18 46 22 46 28C46 34 42 38 36 38H22"
        stroke={color}
        strokeWidth={strokeWidth * 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Decorative dot */}
      <circle cx="50" cy="50" r="3" fill={color} />
    </g>
  );
}

// Variant 3: Minimal - Just the P, no frame
function MinimalP({ color, strokeWidth }: VariantProps) {
  return (
    <g>
      {/* P as elegant single stroke path */}
      <path
        d="M16 52V12H40C50 12 56 20 56 28C56 36 50 44 40 44H24"
        stroke={color}
        strokeWidth={strokeWidth * 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Subtle accent line */}
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

// Variant 4: Geometric - Diamond frame
function GeometricP({ color, strokeWidth }: VariantProps) {
  return (
    <g>
      {/* Diamond/rotated square frame */}
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
      {/* P construction */}
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
