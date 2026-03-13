"use client";

import { motion, useReducedMotion } from "framer-motion";
import { SPRING, VP } from "../../../lib/animations/variants";

interface MotionRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "right" | "left";
}

interface MotionStaggerProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function MotionReveal({
  children,
  className,
  delay = 0,
  direction = "up",
}: MotionRevealProps) {
  const reducedMotion = useReducedMotion();

  const initial = reducedMotion
    ? { opacity: 1 }
    : direction === "up"
      ? { opacity: 0, y: 20 }
      : { opacity: 0, y: 16 };

  const animate = reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 };

  return (
    <motion.div
      initial={initial}
      whileInView={animate}
      viewport={VP}
      transition={{ ...SPRING, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const staggerParent = {
  hidden: { opacity: 0 },
  visible: (staggerDelay: number) => ({
    opacity: 1,
    transition: { staggerChildren: staggerDelay, delayChildren: 0.1 },
  }),
};

const staggerChild = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: SPRING },
};

export function MotionStagger({
  children,
  className,
  staggerDelay = 0.12,
}: MotionStaggerProps) {
  return (
    <motion.div
      variants={staggerParent}
      custom={staggerDelay}
      initial="hidden"
      whileInView="visible"
      viewport={VP}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function MotionStaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={staggerChild} className={className}>
      {children}
    </motion.div>
  );
}
