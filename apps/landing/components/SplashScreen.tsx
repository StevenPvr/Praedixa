"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppReady } from "../hooks/useAppReady";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useSplashComplete } from "../context/SplashContext";
import { easingCurves } from "../lib/animations/config";

// Logo color - white on dark splash background
const LOGO_COLOR = "#ffffff";

/**
 * Logo SVG component with draw animation - Industrial style with fine lines
 */
function AnimatedLogo({ animate }: { animate: boolean }) {
  const prefersReducedMotion = useReducedMotion();
  const strokeWidth = 2; // Fine lines

  return (
    <svg
      width="128"
      height="128"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="splash-logo"
    >
      {/* Outer square frame */}
      <motion.rect
        x="4"
        y="4"
        width="56"
        height="56"
        stroke={LOGO_COLOR}
        strokeWidth={strokeWidth}
        fill="none"
        initial={
          prefersReducedMotion || !animate
            ? { pathLength: 1 }
            : { pathLength: 0 }
        }
        animate={{ pathLength: 1 }}
        transition={{
          duration: prefersReducedMotion ? 0 : 0.7,
          ease: easingCurves.smoothOut,
          delay: 0.3,
        }}
      />
      {/* P - vertical bar */}
      <motion.line
        x1="18"
        y1="16"
        x2="18"
        y2="48"
        stroke={LOGO_COLOR}
        strokeWidth={strokeWidth * 1.5}
        strokeLinecap="square"
        initial={
          prefersReducedMotion || !animate
            ? { pathLength: 1 }
            : { pathLength: 0 }
        }
        animate={{ pathLength: 1 }}
        transition={{
          duration: prefersReducedMotion ? 0 : 0.5,
          ease: easingCurves.smoothOut,
          delay: 0.6,
        }}
      />
      {/* P - top horizontal */}
      <motion.line
        x1="18"
        y1="16"
        x2="38"
        y2="16"
        stroke={LOGO_COLOR}
        strokeWidth={strokeWidth * 1.5}
        strokeLinecap="square"
        initial={
          prefersReducedMotion || !animate
            ? { pathLength: 1 }
            : { pathLength: 0 }
        }
        animate={{ pathLength: 1 }}
        transition={{
          duration: prefersReducedMotion ? 0 : 0.3,
          ease: easingCurves.smoothOut,
          delay: 0.8,
        }}
      />
      {/* P - right vertical */}
      <motion.line
        x1="38"
        y1="16"
        x2="38"
        y2="29"
        stroke={LOGO_COLOR}
        strokeWidth={strokeWidth * 1.5}
        strokeLinecap="square"
        initial={
          prefersReducedMotion || !animate
            ? { pathLength: 1 }
            : { pathLength: 0 }
        }
        animate={{ pathLength: 1 }}
        transition={{
          duration: prefersReducedMotion ? 0 : 0.25,
          ease: easingCurves.smoothOut,
          delay: 0.95,
        }}
      />
      {/* P - middle horizontal */}
      <motion.line
        x1="38"
        y1="29"
        x2="18"
        y2="29"
        stroke={LOGO_COLOR}
        strokeWidth={strokeWidth * 1.5}
        strokeLinecap="square"
        initial={
          prefersReducedMotion || !animate
            ? { pathLength: 1 }
            : { pathLength: 0 }
        }
        animate={{ pathLength: 1 }}
        transition={{
          duration: prefersReducedMotion ? 0 : 0.3,
          ease: easingCurves.smoothOut,
          delay: 1.05,
        }}
      />
      {/* Decorative dot */}
      <motion.circle
        cx="50"
        cy="42"
        r="4"
        fill={LOGO_COLOR}
        initial={
          prefersReducedMotion || !animate
            ? { scale: 1, opacity: 1 }
            : { scale: 0, opacity: 0 }
        }
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          duration: prefersReducedMotion ? 0 : 0.3,
          ease: easingCurves.smoothOut,
          delay: 1.2,
        }}
      />
    </svg>
  );
}

/**
 * Animated text component with stagger effect
 */
function AnimatedText({ text, animate }: { text: string; animate: boolean }) {
  const prefersReducedMotion = useReducedMotion();
  const letters = text.split("");

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.08,
        delayChildren: prefersReducedMotion ? 0 : 1.0,
      },
    },
  };

  const letterVariants = {
    hidden: {
      opacity: prefersReducedMotion ? 1 : 0,
      y: prefersReducedMotion ? 0 : 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.4,
        ease: easingCurves.smoothOut,
      },
    },
  };

  return (
    <motion.div
      className="flex justify-center"
      variants={containerVariants}
      initial="hidden"
      animate={animate ? "visible" : "hidden"}
      aria-hidden="true"
    >
      {letters.map((letter, index) => (
        <motion.span
          key={index}
          variants={letterVariants}
          className="splash-letter"
        >
          {letter}
        </motion.span>
      ))}
    </motion.div>
  );
}

interface SplashScreenProps {
  children: ReactNode;
}

/**
 * Splash Screen Component
 *
 * Displays an animated loading screen while the app initializes.
 *
 * Features:
 * - Logo with stroke draw animation
 * - Text with letter-by-letter stagger
 * - Respects prefers-reduced-motion
 * - Minimum display time for branding
 * - Elegant fade-out transition
 */
export function SplashScreen({ children }: SplashScreenProps) {
  const { isReady } = useAppReady(1400);
  const prefersReducedMotion = useReducedMotion();
  const { markSplashComplete } = useSplashComplete();
  const [showSplash, setShowSplash] = useState(true);
  const [animationStarted, setAnimationStarted] = useState(false);

  // Start animations after mount and prevent scroll
  useEffect(() => {
    // Scroll to top immediately
    window.scrollTo(0, 0);

    // Prevent scrolling while splash is visible
    document.body.style.overflow = "hidden";

    // Small delay to ensure smooth start
    const timer = setTimeout(() => {
      setAnimationStarted(true);
    }, 100);

    return () => {
      clearTimeout(timer);
      // Cleanup: re-enable scrolling on unmount
      document.body.style.overflow = "";
    };
  }, []);

  // Hide splash when ready
  useEffect(() => {
    if (isReady) {
      // Add small delay for exit animation to complete
      const timer = setTimeout(
        () => {
          setShowSplash(false);
          // Re-enable scrolling
          document.body.style.overflow = "";
          // Ensure we're at the top
          window.scrollTo(0, 0);
          // Signal to other components that splash is done
          markSplashComplete();
        },
        prefersReducedMotion ? 100 : 600,
      );
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isReady, prefersReducedMotion, markSplashComplete]);

  const exitVariants = {
    exit: {
      opacity: 0,
      scale: prefersReducedMotion ? 1 : 1.05,
      transition: {
        duration: prefersReducedMotion ? 0.1 : 0.6,
        ease: easingCurves.smoothOut,
      },
    },
  };

  return (
    <>
      <AnimatePresence mode="wait">
        {showSplash && (
          <motion.div
            key="splash"
            className="splash-screen"
            exit={exitVariants.exit}
            role="status"
            aria-label="Chargement de Praedixa"
          >
            <div className="splash-content">
              <AnimatedLogo animate={animationStarted} />
              <div className="splash-text-container">
                <AnimatedText text="PRAEDIXA" animate={animationStarted} />
              </div>
            </div>
            <span className="sr-only">Chargement en cours...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Render children but hide while splash is visible */}
      <div
        style={{
          opacity: showSplash ? 0 : 1,
          visibility: showSplash ? "hidden" : "visible",
          transition: "opacity 0.3s ease-out",
        }}
      >
        {children}
      </div>
    </>
  );
}

export default SplashScreen;
