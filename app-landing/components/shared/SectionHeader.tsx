"use client";

import { motion } from "framer-motion";
import { staggerItem } from "../../lib/animations/variants";
import { cn } from "@praedixa/ui";

interface SectionHeaderProps {
  kicker?: string;
  heading: string;
  subheading?: string;
  light?: boolean;
  className?: string;
}

export function SectionHeader({
  kicker,
  heading,
  subheading,
  light = false,
  className,
}: SectionHeaderProps) {
  return (
    <motion.div
      className={cn("mb-12 max-w-4xl", className)}
      variants={staggerItem}
    >
      {kicker && (
        <span
          className={cn(
            "text-xs font-semibold uppercase tracking-[0.2em]",
            light ? "text-amber-300" : "text-amber-700",
          )}
        >
          {kicker}
        </span>
      )}
      <h2
        className={cn(
          "mt-4 font-serif text-4xl leading-tight sm:text-5xl",
          light ? "text-white" : "text-charcoal",
        )}
      >
        {heading}
      </h2>
      {subheading && (
        <p
          className={cn(
            "mt-4 max-w-3xl text-lg leading-relaxed",
            light ? "text-white/75" : "text-neutral-600",
          )}
        >
          {subheading}
        </p>
      )}
    </motion.div>
  );
}
