"use client";

import { motion, AnimatePresence } from "framer-motion";
import { sectionReveal } from "@/lib/animations/config";

interface AnimatedSectionProps {
  show?: boolean;
  delay?: number;
  className?: string;
  children: React.ReactNode;
}

export function AnimatedSection({
  show = true,
  delay,
  className,
  children,
}: AnimatedSectionProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          variants={sectionReveal}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          exit="hidden"
          transition={delay != null ? { delay } : undefined}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
