"use client";

import { motion } from "framer-motion";
import {
  PraedixaLogo as BaseLogo,
  LOGO_COLORS,
  type LogoVariant,
} from "@praedixa/ui";

export type { LogoVariant };

interface PraedixaLogoProps {
  variant?: LogoVariant;
  size?: number;
  color?: string;
  strokeWidth?: number;
  animate?: boolean;
  className?: string;
}

// Re-export color constants for backward compatibility
const COLORS = LOGO_COLORS;

export function PraedixaLogo({
  variant = "industrial",
  size = 40,
  color = COLORS.dark,
  strokeWidth = 2,
  animate = false,
  className = "",
}: PraedixaLogoProps) {
  return (
    <motion.div
      className={className}
      style={{ width: size, height: size, lineHeight: 0 }}
      /* v8 ignore next 2 -- framer-motion animate prop stripped by mock */
      initial={animate ? { opacity: 0 } : undefined}
      animate={animate ? { opacity: 1 } : undefined}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <BaseLogo
        variant={variant}
        size={size}
        color={color}
        strokeWidth={strokeWidth}
      />
    </motion.div>
  );
}
