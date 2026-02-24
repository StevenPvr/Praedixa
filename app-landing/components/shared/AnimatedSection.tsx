"use client";

import { motion } from "framer-motion";
import { sectionReveal, viewportOnce } from "../../lib/animations/variants";
import { cn } from "../../lib/utils";

interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export function AnimatedSection({
  children,
  className,
  id,
}: AnimatedSectionProps) {
  return (
    <motion.div
      id={id}
      variants={sectionReveal}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: 0.1, delayChildren: 0.05 },
        },
      }}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 16 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            y: { type: "spring", stiffness: 120, damping: 18 },
            opacity: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
          },
        },
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
