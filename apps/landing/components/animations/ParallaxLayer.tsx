"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { useParallax } from "../../hooks/useParallax";
import { useReducedMotion } from "../../hooks/useReducedMotion";

interface ParallaxLayerProps {
  children: ReactNode;
  /** Speed of parallax effect (-1 to 1), default 0.2 */
  speed?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Parallax scroll effect wrapper component.
 * Elements with positive speed move slower than scroll.
 * Elements with negative speed move faster than scroll.
 * Disabled when prefers-reduced-motion is enabled.
 */
export function ParallaxLayer({
  children,
  speed = 0.2,
  className = "",
}: ParallaxLayerProps) {
  const { ref, value } = useParallax<HTMLDivElement>({ speed });
  const prefersReducedMotion = useReducedMotion();

  // If reduced motion, render without animation
  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{
        y: value,
        willChange: "transform",
      }}
    >
      {children}
    </motion.div>
  );
}
