"use client";

import { motion } from "framer-motion";
import { staggerItem } from "../../lib/animations/variants";
import { cn } from "@praedixa/ui";

interface SectionHeaderProps {
  /** Small uppercase kicker above the heading */
  kicker?: string;
  /** The H2 heading text */
  heading: string;
  /** Optional subheading paragraph */
  subheading?: string;
  /** Apply light (white) text for dark backgrounds */
  light?: boolean;
  className?: string;
}

/**
 * Reusable section header: kicker + H2 heading + optional subheading.
 * Designed to be placed inside a SectionWrapper (inherits stagger variants).
 */
export function SectionHeader({
  kicker,
  heading,
  subheading,
  light = false,
  className,
}: SectionHeaderProps) {
  return (
    <motion.div
      className={cn("mb-12 max-w-3xl md:mb-16", className)}
      variants={staggerItem}
    >
      {kicker && (
        <span
          className={cn(
            "mb-3 inline-block text-sm font-semibold uppercase tracking-widest",
            light ? "text-amber-400" : "text-amber-600",
          )}
        >
          {kicker}
        </span>
      )}
      <h2
        className={cn(
          "font-serif text-3xl font-bold leading-tight md:text-4xl lg:text-[2.75rem]",
          light ? "text-white" : "text-charcoal",
        )}
      >
        {heading}
      </h2>
      {subheading && (
        <p
          className={cn(
            "mt-4 text-base leading-relaxed md:text-lg",
            light ? "text-white/70" : "text-neutral-600",
          )}
        >
          {subheading}
        </p>
      )}
    </motion.div>
  );
}
