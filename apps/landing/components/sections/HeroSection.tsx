"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { lazy, Suspense, useRef } from "react";
import Link from "next/link";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { useSplashComplete } from "../../context/SplashContext";
import {
  easingCurves,
  springConfig,
  durations,
} from "../../lib/animations/config";

// Lazy load 3D component for better initial load performance
const ProductShowcase3D = lazy(() => import("../hero/ProductShowcase3D"));

/**
 * Loading placeholder for 3D showcase
 */
function ShowcasePlaceholder() {
  return (
    <div
      className="w-full h-[400px] rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 animate-pulse"
      style={{
        border: "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
      }}
    >
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 text-sm">Chargement...</div>
      </div>
    </div>
  );
}

/**
 * Animation timeline for cinematic entrance (in seconds)
 */
const timeline = {
  background: { delay: 0, duration: 0.3 },
  title: { delay: 0.2, duration: 0.6 },
  subtitle: { delay: 0.4, duration: 0.5 },
  trustBadges: { delay: 0.6, duration: 0.4 },
  dashboard: { delay: 0.8, duration: 1.0 },
  decorations: { delay: 1.2, duration: 0.6 },
};

interface HeroSectionProps {
  className?: string;
}

/**
 * Hero section with Linear-style 3D product showcase.
 * Text at top, dual-panel 3D mockup below.
 * Cinematic entrance animation sequence.
 */
export function HeroSection({ className }: HeroSectionProps) {
  const prefersReducedMotion = useReducedMotion();
  const { isSplashComplete } = useSplashComplete();
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  // Parallax for decorations
  const decorationY = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const decorationOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <section
      id="hero"
      data-testid="hero-section"
      ref={sectionRef}
      className={`relative min-h-screen bg-cream overflow-hidden ${className || ""}`}
    >
      {/* Geometric decorations with parallax */}
      <motion.div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
        style={{
          y: prefersReducedMotion ? 0 : decorationY,
          opacity: prefersReducedMotion ? 1 : decorationOpacity,
        }}
        initial={{ opacity: 0 }}
        animate={isSplashComplete ? { opacity: 1 } : { opacity: 0 }}
        transition={{
          duration: prefersReducedMotion ? 0.01 : timeline.decorations.duration,
          delay: prefersReducedMotion ? 0 : timeline.decorations.delay,
          ease: easingCurves.smoothOut,
        }}
      >
        {/* Top right square */}
        <div className="absolute -top-16 -right-16 w-64 h-64 border-2 border-neutral-200 rotate-12" />
        {/* Grid dots pattern */}
        <div className="absolute top-1/4 right-1/4 grid grid-cols-4 gap-4">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="w-2 h-2 bg-neutral-200 rounded-full" />
          ))}
        </div>
        {/* Additional decorative elements */}
        <div className="absolute bottom-1/4 left-[16%] w-32 h-32 border border-neutral-300/50 rotate-45" />
      </motion.div>

      {/* Hero content - Text at top */}
      <div className="relative max-w-7xl mx-auto px-4 pt-20 lg:pt-24 pb-4">
        <div>
          <div className="w-full text-center">
            {/* Main heading with staggered word animation */}
            {/* Main heading with staggered word animation */}
            <motion.h1
              className="font-serif text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight text-charcoal leading-tight mb-4"
              initial={{ opacity: 0, y: 30 }}
              animate={
                isSplashComplete ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }
              }
              transition={{
                duration: prefersReducedMotion ? 0.01 : timeline.title.duration,
                delay: prefersReducedMotion ? 0 : timeline.title.delay,
                ease: easingCurves.smoothOut,
              }}
            >
              <motion.span
                className="inline-block"
                initial={{ opacity: 0, y: 20 }}
                animate={
                  isSplashComplete
                    ? { opacity: 1, y: 0 }
                    : { opacity: 0, y: 20 }
                }
                transition={{
                  duration: prefersReducedMotion ? 0.01 : 0.5,
                  delay: prefersReducedMotion ? 0 : timeline.title.delay,
                  ease: easingCurves.smoothOut,
                }}
              >
                Sécurisez la couverture
              </motion.span>{" "}
              <motion.span
                className="relative inline-block"
                initial={{ opacity: 0, y: 20 }}
                animate={
                  isSplashComplete
                    ? { opacity: 1, y: 0 }
                    : { opacity: 0, y: 20 }
                }
                transition={{
                  duration: prefersReducedMotion ? 0.01 : 0.5,
                  delay: prefersReducedMotion ? 0 : timeline.title.delay + 0.1,
                  ease: easingCurves.smoothOut,
                }}
              >
                <span className="relative">
                  terrain.
                  <motion.span
                    className="absolute bottom-1 left-0 w-full h-2 bg-amber-400/40 -z-10"
                    initial={{ scaleX: 0 }}
                    animate={isSplashComplete ? { scaleX: 1 } : { scaleX: 0 }}
                    transition={{
                      duration: prefersReducedMotion ? 0.01 : 0.6,
                      delay: prefersReducedMotion
                        ? 0
                        : timeline.title.delay + 0.3,
                      ease: easingCurves.smoothOut,
                    }}
                    style={{ transformOrigin: "left" }}
                  />
                </span>
              </motion.span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              className="text-base sm:text-lg text-gray-secondary max-w-2xl mx-auto mb-6 leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={
                isSplashComplete ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
              }
              transition={{
                duration: prefersReducedMotion
                  ? 0.01
                  : timeline.subtitle.duration,
                delay: prefersReducedMotion ? 0 : timeline.subtitle.delay,
                ease: easingCurves.smoothOut,
              }}
            >
              Pour vos équipes terrain multi-sites. En{" "}
              <span className="text-amber-500 font-semibold">48h</span>,
              Praedixa anticipe la{" "}
              <span className="text-amber-500 font-semibold">
                sous-couverture
              </span>{" "}
              (capacité vs charge), chiffre le coût des trous de planning et
              propose un{" "}
              <span className="text-amber-500 font-semibold">
                plan d&apos;action
              </span>
              — à partir d&apos;exports simples,{" "}
              <span className="text-amber-500 font-semibold">
                sans intégration
              </span>
              .
            </motion.p>

            {/* CTAs */}
            <motion.div
              className="flex flex-col sm:flex-row gap-3 justify-center mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={
                isSplashComplete ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
              }
              transition={{
                duration: prefersReducedMotion ? 0.01 : 0.5,
                delay: prefersReducedMotion
                  ? 0
                  : timeline.subtitle.delay + 0.15,
                ease: easingCurves.smoothOut,
              }}
            >
              <Link href="/devenir-pilote">
                <motion.span
                  className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-white bg-charcoal hover:bg-charcoal/90 transition-all duration-150 rounded-md group"
                  whileHover={{
                    scale: 1.02,
                    boxShadow: "0 0 30px rgba(251, 191, 36, 0.3)",
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  Devenir entreprise pilote
                  <ArrowRightIcon className="ml-2 transition-transform group-hover:translate-x-1" />
                </motion.span>
              </Link>
              <a
                href="#solution"
                className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium text-gray-secondary hover:text-charcoal transition-all duration-150"
              >
                Découvrir la solution →
              </a>
            </motion.div>

            {/* Trust badges with staggered scale-in */}
            <motion.div
              className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500"
              initial={{ opacity: 0 }}
              animate={isSplashComplete ? { opacity: 1 } : { opacity: 0 }}
              transition={{
                duration: prefersReducedMotion
                  ? 0.01
                  : timeline.trustBadges.duration,
                delay: prefersReducedMotion ? 0 : timeline.trustBadges.delay,
                ease: easingCurves.smoothOut,
              }}
            >
              {["Diagnostic 48h", "Sans intégration", "Hébergement France"].map(
                (badge, index) => (
                  <motion.span
                    key={badge}
                    className="flex items-center gap-2"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={
                      isSplashComplete
                        ? { opacity: 1, scale: 1 }
                        : { opacity: 0, scale: 0.8 }
                    }
                    transition={{
                      duration: prefersReducedMotion ? 0.01 : 0.3,
                      delay: prefersReducedMotion
                        ? 0
                        : timeline.trustBadges.delay + index * 0.08,
                      type: "spring",
                      ...springConfig.snappy,
                    }}
                  >
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                    {badge}
                  </motion.span>
                ),
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* 3D Product Showcase with cinematic entrance - deep perspective */}
      <div className="relative hidden md:block mt-8 lg:mt-12 pb-32">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            className="-ml-24 lg:-ml-48"
            initial={{
              opacity: 0,
              y: 120,
              scale: 0.9,
            }}
            animate={
              isSplashComplete
                ? {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                  }
                : {
                    opacity: 0,
                    y: 120,
                    scale: 0.9,
                  }
            }
            transition={{
              duration: prefersReducedMotion
                ? 0.01
                : timeline.dashboard.duration,
              delay: prefersReducedMotion ? 0 : timeline.dashboard.delay,
              type: "spring",
              stiffness: 40,
              damping: 25,
              mass: 1.5,
            }}
            style={{
              transformStyle: "preserve-3d",
            }}
          >
            <Suspense fallback={<ShowcasePlaceholder />}>
              <ProductShowcase3D />
            </Suspense>
          </motion.div>
        </div>
      </div>

      {/* Mobile fallback */}
      <div className="md:hidden px-4 pb-12">
        <MobileShowcase />
      </div>
    </section>
  );
}

/**
 * Mobile showcase - simplified version for smaller screens
 */
function MobileShowcase() {
  const prefersReducedMotion = useReducedMotion();
  const { isSplashComplete } = useSplashComplete();

  return (
    <motion.div
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: "rgba(20, 20, 22, 0.95)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
      }}
      initial={{ opacity: 0, y: 30 }}
      animate={isSplashComplete ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{
        duration: prefersReducedMotion ? 0.01 : durations.normal,
        delay: prefersReducedMotion ? 0 : timeline.dashboard.delay,
        ease: easingCurves.smoothOut,
      }}
    >
      {/* Window chrome */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{
          background: "rgba(0, 0, 0, 0.3)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
        }}
      >
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[rgb(255,95,86)]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[rgb(255,189,46)]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[rgb(39,201,63)]" />
        </div>
        <div className="flex-1 flex justify-center">
          <div
            className="px-3 py-0.5 rounded text-[10px] font-mono"
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              color: "rgb(90, 90, 95)",
            }}
          >
            praedixa.app
          </div>
        </div>
      </div>

      {/* Content preview */}
      <div className="p-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[
            { label: "Cash IJSS", value: "—", change: "" },
            { label: "ETP manquants", value: "—", change: "" },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="p-3 rounded-lg"
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.04)",
              }}
            >
              <div
                className="text-[10px] mb-1"
                style={{ color: "rgb(90, 90, 95)" }}
              >
                {kpi.label}
              </div>
              <div className="flex items-baseline gap-1">
                <span
                  className="text-lg font-semibold"
                  style={{ color: "rgb(247, 248, 248)" }}
                >
                  {kpi.value}
                </span>
                <span
                  className="text-[10px]"
                  style={{ color: "rgb(52, 211, 153)" }}
                >
                  {kpi.change}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Mini chart */}
        <div
          className="p-3 rounded-lg"
          style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.04)",
          }}
        >
          <div className="text-xs mb-2" style={{ color: "rgb(140, 140, 145)" }}>
            Sous-couverture par site
          </div>
          <div className="h-16 flex items-end gap-1">
            {[45, 52, 38, 65, 72, 58, 48, 55].map((h, i) => (
              <motion.div
                key={i}
                className="flex-1 rounded-t"
                style={{
                  background:
                    i >= 6 ? "rgb(251, 191, 36)" : "rgba(251, 191, 36, 0.4)",
                }}
                initial={{ height: 0 }}
                animate={
                  isSplashComplete
                    ? { height: `${h.toString()}%` }
                    : { height: 0 }
                }
                transition={{
                  delay: isSplashComplete ? 0.5 + i * 0.05 : 0,
                  duration: 0.4,
                  ease: easingCurves.smoothOut,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M4 10H16M16 10L11 5M16 10L11 15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
      />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}
