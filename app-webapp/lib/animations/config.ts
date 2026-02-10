// Animation timing and easing constants for the webapp
// All durations in seconds (framer-motion convention)

export const DURATION = {
  micro: 0.1,
  fast: 0.15,
  normal: 0.2,
  page: 0.3,
  number: 0.4,
} as const;

export const EASING = {
  snappy: [0.2, 0, 0, 1] as const,
  smooth: [0.4, 0, 0.2, 1] as const,
  bounce: [0.34, 1.56, 0.64, 1] as const,
} as const;

export const STAGGER = {
  fast: 0.03,
  normal: 0.1,
} as const;

/** Standard fade-in + slide-up variant for sections */
export const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.page, ease: EASING.smooth },
  },
} as const;

/** Staggered container variant for grids of cards */
export const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: STAGGER.normal,
      delayChildren: 0.1,
    },
  },
} as const;

/** Individual item variant for staggered children */
export const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.page, ease: EASING.smooth },
  },
} as const;

/** Section reveal variant — larger amplitude for page sections */
export const sectionReveal = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASING.smooth },
  },
} as const;

/** Card hover scale — lift effect for interactive cards */
export const cardHoverScale = {
  rest: { scale: 1, y: 0 },
  hover: {
    scale: 1.02,
    y: -4,
    transition: { duration: DURATION.normal, ease: EASING.snappy },
  },
} as const;

/** Slide in from right — for detail panels and drawers */
export const slideInRight = {
  hidden: { opacity: 0, x: 30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: EASING.smooth },
  },
} as const;
