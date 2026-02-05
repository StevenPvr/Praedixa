import type { Variants } from "framer-motion";

/**
 * Shared Framer Motion variants for the landing page.
 * Every section should use these instead of defining its own.
 *
 * Pattern: whileInView with `once: true`, opacity 0->1, y 24->0, duration 0.6s
 */

/** Standard reveal for a single element */
export const sectionReveal: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

/** Container that staggers its children */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

/** Child item inside a stagger container */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

/** Viewport settings for whileInView animations */
export const viewportOnce = { once: true, margin: "-80px" as const };
