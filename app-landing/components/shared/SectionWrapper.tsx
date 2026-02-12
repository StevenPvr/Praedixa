"use client";

import { motion } from "framer-motion";
import { staggerContainer, viewportOnce } from "../../lib/animations/variants";
import { cn } from "@praedixa/ui";

interface SectionWrapperProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
}

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
        "py-24 md:py-28",
        dark ? "bg-charcoal text-white" : "bg-transparent text-charcoal",
        className,
      )}
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
    >
      <div className="section-shell">{children}</div>
    </motion.section>
  );
}
