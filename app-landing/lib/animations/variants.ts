import type { Variants } from "framer-motion";

/** Shared spring config — use everywhere instead of inline object */
export const SPRING = { type: "spring" as const, stiffness: 100, damping: 20 };

/** Standard viewport trigger — once, 60px before entering */
export const VP = { once: true, margin: "-60px" as const };

/** Smooth reveal with slight upward drift — the signature Praedixa entrance */
export const sectionReveal: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 20 },
  },
};

/** Container that staggers children in */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

/** Individual staggered child — pairs with staggerContainer (spring on y) */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      y: { type: "spring", stiffness: 120, damping: 18 },
      opacity: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
    },
  },
};

/** Fade in without vertical movement */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { type: "spring", stiffness: 100, damping: 20 },
  },
};

/** Scale up from slightly smaller — for cards and panels */
export const scaleReveal: Variants = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 120, damping: 20 },
  },
};

/** Horizontal slide in from left */
export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 100, damping: 20 },
  },
};

/** Horizontal slide in from right */
export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 100, damping: 20 },
  },
};

// ── Spectacular animation variants ──

/** Blur-reveal: elements emerge from a soft blur */
export const blurReveal: Variants = {
  hidden: { opacity: 0, filter: "blur(12px)", y: 30 },
  visible: {
    opacity: 1,
    filter: "blur(0px)",
    y: 0,
    transition: {
      y: { type: "spring", stiffness: 100, damping: 20 },
      opacity: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
      filter: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
    },
  },
};

/** Stagger container with blur-reveal children — deliberate cascade */
export const blurStaggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.14,
      delayChildren: 0.12,
    },
  },
};

/** Blur stagger child — pairs with blurStaggerContainer (spring on y) */
export const blurStaggerItem: Variants = {
  hidden: { opacity: 0, filter: "blur(8px)", y: 20 },
  visible: {
    opacity: 1,
    filter: "blur(0px)",
    y: 0,
    transition: {
      y: { type: "spring", stiffness: 100, damping: 20 },
      opacity: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
      filter: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
    },
  },
};

/** Spring-based scale reveal — for interactive cards */
export const scaleSpring: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 22,
      mass: 0.8,
    },
  },
};

/** Glow pulse — for emphasis elements */
export const glowPulse: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 120, damping: 20 },
  },
};

/** Slide up with spring for timeline steps */
export const springUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 180,
      damping: 20,
      mass: 0.9,
    },
  },
};

/** Standard viewport detection — trigger once, slightly before entering */
export const viewportOnce = {
  once: true,
  margin: "-60px" as const,
};

/** Standard viewport for spectacular effects — trigger a bit earlier */
export const viewportEarly = {
  once: true,
  margin: "-100px" as const,
};

/** Generous viewport margin for smoother trigger on secondary elements */
export const viewportGenerous = {
  once: true,
  margin: "-80px" as const,
};

/** Spring-based hover lift for cards — apply as whileHover prop */
export const cardHover = {
  y: -3,
  transition: { type: "spring" as const, stiffness: 200, damping: 24 },
};

/** Hero headline: cinematic blur-reveal with subtle scale — more impact than standard reveal */
export const heroHeadlineReveal: Variants = {
  hidden: { opacity: 0, y: 32, filter: "blur(10px)", scale: 0.98 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 20,
      delay,
    },
  }),
};
