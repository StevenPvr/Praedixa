"use client";

import { motion } from "framer-motion";
import { staggerContainer, viewportOnce } from "../../lib/animations/variants";
import { cn } from "../ui";

interface SectionWrapperProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  /** Use dark charcoal background */
  dark?: boolean;
}

/**
 * Standardised section container with stagger-reveal animation.
 * Provides consistent padding, max-width, and scroll-reveal behaviour.
 */
export function SectionWrapper({
  id,
  children,
  className,
  dark = false,
}: SectionWrapperProps) {
  return (
    <motion.section
      id={id}
      className={cn(
        "px-6 py-20 md:py-28",
        dark ? "bg-charcoal text-white" : "bg-cream text-charcoal",
        className,
      )}
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
    >
      <div className="mx-auto max-w-6xl">{children}</div>
    </motion.section>
  );
}
