/**
 * Shared animation configuration for cinematic motion design.
 * Used across Hero, Problem, and other animated sections.
 */

/**
 * Custom easing curves for smooth, natural animations
 */
export const easingCurves = {
  /** Smooth deceleration - great for entrances */
  smoothOut: [0.16, 1, 0.3, 1] as const,
  /** Dramatic deceleration - for impactful reveals */
  dramatic: [0.22, 1, 0.36, 1] as const,
  /** Snappy entrance - quick but controlled */
  snappy: [0.4, 0, 0.2, 1] as const,
};

/**
 * Spring configurations for physics-based animations
 */
export const springConfig = {
  /** Fast and controlled - buttons, small elements */
  snappy: { stiffness: 400, damping: 30 },
  /** Balanced - general purpose */
  smooth: { stiffness: 100, damping: 20 },
  /** Slow and cinematic - large elements, 3D transforms */
  ultraSmooth: { stiffness: 50, damping: 20, mass: 1 },
};

/**
 * Standard animation durations (in seconds)
 */
export const durations = {
  /** Quick micro-interactions */
  fast: 0.15,
  /** Standard transitions */
  normal: 0.3,
  /** Slow, cinematic animations */
  slow: 0.6,
  /** Very slow, dramatic reveals */
  dramatic: 1.0,
};

/**
 * Stagger delays for sequential animations (in seconds)
 */
export const staggerDelays = {
  /** Fast stagger for lists */
  fast: 0.05,
  /** Normal stagger */
  normal: 0.08,
  /** Slow stagger for dramatic effect */
  slow: 0.12,
};

/**
 * Scroll-based animation configuration
 */
export const scrollConfig = {
  reveal: {
    /** Default threshold for triggering reveal (0-1) */
    threshold: 0.2,
    /** Default distance for reveal animations (pixels) */
    distance: 60,
    /** Default duration for reveal animations (seconds) */
    duration: 0.8,
  },
  parallax: {
    /** Subtle parallax effect */
    subtle: 0.1,
    /** Medium parallax effect */
    medium: 0.3,
    /** Deep parallax effect */
    deep: 0.5,
  },
};
