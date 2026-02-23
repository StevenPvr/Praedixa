/**
 * Cinematic animation system for Praedixa webapp.
 * All durations in seconds (framer-motion convention).
 * Organized: timing → easings → springs → variant presets.
 */

/* ── Timing ── */
export const DURATION = {
  instant: 0.06,
  micro: 0.12,
  fast: 0.2,
  normal: 0.3,
  page: 0.4,
  number: 0.7,
  draw: 1.2,
  slow: 0.5,
  cinematic: 0.8,
} as const;

/* ── Cubic-bezier easings ── */
export const EASING = {
  snappy: [0.2, 0, 0, 1] as const,
  smooth: [0.4, 0, 0.2, 1] as const,
  bounce: [0.34, 1.56, 0.64, 1] as const,
  spring: [0.43, 0.13, 0.23, 0.96] as const,
  premium: [0.16, 1, 0.3, 1] as const,
  decelerate: [0, 0.55, 0.45, 1] as const,
  dramatic: [0.68, -0.6, 0.32, 1.6] as const,
} as const;

/* ── Spring physics configs ── */
export const SPRING = {
  snappy: { type: "spring" as const, stiffness: 500, damping: 30 },
  gentle: { type: "spring" as const, stiffness: 260, damping: 24 },
  bouncy: { type: "spring" as const, stiffness: 400, damping: 17 },
  slow: { type: "spring" as const, stiffness: 180, damping: 22 },
  premium: { type: "spring" as const, stiffness: 350, damping: 28, mass: 0.8 },
  dramatic: { type: "spring" as const, stiffness: 300, damping: 20, mass: 1.2 },
  layout: { type: "spring" as const, stiffness: 400, damping: 35, mass: 0.6 },
} as const;

/* ── Stagger timing ── */
export const STAGGER = {
  fast: 0.03,
  normal: 0.06,
  slow: 0.1,
  dramatic: 0.12,
} as const;

// ─────────────────────────────────────────────
// Variant Presets
// ─────────────────────────────────────────────

/** Page enter/exit — crossfade + y slide + blur */
export const pageEnter = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.page, ease: EASING.premium },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: DURATION.fast, ease: EASING.snappy },
  },
} as const;

/** Section reveal — larger amplitude for page sections */
export const sectionReveal = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASING.premium },
  },
} as const;

/** Staggered container — children animate one by one */
export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: STAGGER.normal,
      delayChildren: 0.08,
    },
  },
} as const;

/** Staggered child item */
export const staggerItem = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: EASING.premium },
  },
} as const;

/** Card reveal — scale + opacity for grid cards */
export const cardReveal = {
  hidden: { opacity: 0, scale: 1, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: DURATION.normal, ease: EASING.premium },
  },
} as const;

/** Card hover interaction — elevation increase */
export const cardHover = {
  rest: {
    y: 0,
    scale: 1,
    transition: SPRING.premium,
  },
  hover: {
    y: -2,
    scale: 1.005,
    transition: SPRING.premium,
  },
} as const;

/** Button press — spring-based scale */
export const buttonPress = {
  rest: { scale: 1 },
  hover: { scale: 1.02, transition: SPRING.snappy },
  tap: {
    scale: 0.97,
    transition: { type: "spring" as const, stiffness: 500, damping: 30 },
  },
} as const;

/** Fade scale — for modals, tooltips, overlays */
export const fadeScale = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: DURATION.normal, ease: EASING.premium },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: DURATION.fast },
  },
} as const;

/** Slide from right — toasts, drawers */
export const slideRight = {
  hidden: { opacity: 0, x: 40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: SPRING.gentle,
  },
  exit: {
    opacity: 0,
    x: 40,
    transition: { duration: DURATION.fast, ease: EASING.smooth },
  },
} as const;

/** Slide from left — sidebar panels */
export const slideLeft = {
  hidden: { opacity: 0, x: -40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: SPRING.gentle,
  },
  exit: {
    opacity: 0,
    x: -40,
    transition: { duration: DURATION.fast, ease: EASING.smooth },
  },
} as const;

/** Slide up — for bottom sheets, popups */
export const slideUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: SPRING.premium,
  },
  exit: {
    opacity: 0,
    y: 12,
    transition: { duration: DURATION.fast, ease: EASING.snappy },
  },
} as const;

/** Number morph — count-up with blur transition */
export const numberMorph = {
  hidden: { opacity: 0, y: 10, filter: "blur(3px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: DURATION.number, ease: EASING.premium },
  },
} as const;

/** Chart draw — SVG path drawing animation */
export const chartDraw = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: DURATION.draw, ease: EASING.decelerate },
  },
} as const;

/** Status pulse — subtle glow for alert badges */
export const statusPulse = {
  initial: { scale: 1, opacity: 1 },
  animate: {
    scale: [1, 1.15, 1],
    opacity: [1, 0.8, 1],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
  },
} as const;

/** Success check — checkmark SVG draw */
export const successCheck = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: 0.4, ease: EASING.premium, delay: 0.1 },
  },
} as const;

/** Glow pulse — attention-drawing glow */
export const glowPulse = {
  initial: { boxShadow: "0 0 0 0 var(--glow-primary)" },
  animate: {
    boxShadow: [
      "0 0 0 0 var(--glow-primary)",
      "0 0 20px 4px var(--glow-primary)",
      "0 0 0 0 var(--glow-primary)",
    ],
    transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
  },
} as const;

/** Glow breath — subtle opacity breathing for active elements */
export const glowBreath = {
  initial: { opacity: 0.7 },
  animate: {
    opacity: [0.7, 1, 0.7],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
  },
} as const;

/** Skeleton shimmer pulse */
export const skeletonPulse = {
  initial: { opacity: 0.5 },
  animate: {
    opacity: [0.5, 0.8, 0.5],
    transition: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
  },
} as const;

/** Scroll reveal — on viewport entry */
export const scrollReveal = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, ease: EASING.premium },
  },
} as const;

/** State transition — switching between UI states */
export const stateTransition = {
  initial: { opacity: 0, scale: 0.97 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: DURATION.normal, ease: EASING.premium },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    transition: { duration: DURATION.fast },
  },
} as const;

/** List reorder — for animated list items */
export const listReorder = {
  layout: true,
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: SPRING.layout,
} as const;

/** Expand collapse — for accordion/collapsible sections */
export const expandCollapse = {
  initial: { height: 0, opacity: 0 },
  animate: {
    height: "auto",
    opacity: 1,
    transition: {
      height: { duration: DURATION.normal, ease: EASING.premium },
      opacity: { duration: DURATION.fast, delay: 0.05 },
    },
  },
  exit: {
    height: 0,
    opacity: 0,
    transition: {
      height: { duration: DURATION.fast, ease: EASING.snappy },
      opacity: { duration: DURATION.instant },
    },
  },
} as const;

/** Tooltip appear */
export const tooltipVariant = {
  hidden: { opacity: 0, y: 4, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: DURATION.micro, ease: EASING.snappy },
  },
  exit: {
    opacity: 0,
    y: 2,
    scale: 0.98,
    transition: { duration: DURATION.instant },
  },
} as const;

/** Progress bar fill animation */
export const progressFill = {
  hidden: { scaleX: 0 },
  visible: {
    scaleX: 1,
    transition: { duration: DURATION.cinematic, ease: EASING.premium },
  },
} as const;
