"use client";

import { useRef, useEffect, useCallback } from "react";
import { useReducedMotion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { HeroSection } from "./HeroSection";
import { ProblemSection } from "./ProblemSection";
import type { Dictionary } from "../../lib/i18n/types";
import type { Locale } from "../../lib/i18n/config";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface HeroTransitionWrapperProps {
  dict: Dictionary;
  locale: Locale;
}

/**
 * Two-phase scroll:
 *   Phase 1 (0 → 0.4) — Hero zooms/fades, ProblemSection scales in
 *   Phase 2 (0.4 → 1.0) — ProblemSection content scrolls via translateY
 */
export function HeroTransitionWrapper({
  dict,
  locale,
}: HeroTransitionWrapperProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const heroContentRef = useRef<HTMLDivElement>(null);
  const heroLayerRef = useRef<HTMLDivElement>(null);
  const problemRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const applyProgress = useCallback((progress: number) => {
    const hero = heroContentRef.current;
    const heroLayer = heroLayerRef.current;
    const problem = problemRef.current;
    const bg = document.getElementById("global-bg");
    if (!hero || !heroLayer || !problem) return;

    const TRANSITION_END = 0.4;

    if (progress <= TRANSITION_END) {
      // ── Phase 1: Hero → Problem transition ──
      const t = progress / TRANSITION_END; // 0 → 1

      // Hero content zoom + fade
      const heroScale = 1 + t * 1.8;
      hero.style.transform = `translate3d(0,0,0) scale(${heroScale})`;
      hero.style.opacity = `${1 - t}`;

      // Hero layer disappears (delayed)
      const layerP = Math.max(0, (t - 0.6) / 0.4);
      heroLayer.style.opacity = `${1 - layerP}`;
      heroLayer.style.pointerEvents = layerP >= 1 ? "none" : "auto";

      // Background dark → light
      if (bg) {
        const bgP = Math.max(0, Math.min((t - 0.3) / 0.5, 1));
        const l = 0.14 + bgP * (0.975 - 0.14);
        const c = 0.025 - bgP * (0.025 - 0.004);
        const h = 247 + bgP * (260 - 247);
        bg.style.backgroundColor = `oklch(${l} ${c} ${h})`;
      }

      // ProblemSection appears (delayed, ease-out)
      const probP = Math.max(0, (t - 0.5) / 0.5);
      const probEased = 1 - Math.pow(1 - probP, 2);
      const probScale = 0.88 + probEased * 0.12;
      problem.style.transform = `translate3d(0, 0, 0) scale(${probScale})`;
      problem.style.opacity = `${probEased}`;
    } else {
      // ── Phase 2: Scroll through ProblemSection content ──
      hero.style.opacity = "0";
      heroLayer.style.opacity = "0";
      heroLayer.style.pointerEvents = "none";
      problem.style.opacity = "1";

      if (bg) {
        bg.style.backgroundColor = "oklch(0.975 0.004 260)";
      }

      // Translate problem content upward to simulate scroll
      const scrollP = (progress - TRANSITION_END) / (1 - TRANSITION_END);
      const contentHeight = problem.scrollHeight;
      const viewportHeight = window.innerHeight;
      const maxScroll = Math.max(0, contentHeight - viewportHeight);
      const scrollY = scrollP * maxScroll;
      problem.style.transform = `translate3d(0, -${scrollY}px, 0)`;
    }
  }, []);

  useEffect(() => {
    if (shouldReduceMotion || typeof window === "undefined") return;
    if (!outerRef.current) return;

    applyProgress(0);

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: outerRef.current,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.3,
        onUpdate: (self) => {
          applyProgress(self.progress);
        },
      });
    }, outerRef);

    return () => ctx.revert();
  }, [shouldReduceMotion, applyProgress]);

  return (
    <div ref={outerRef} style={{ height: "300vh" }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* Problem section layer — behind hero */}
        <div
          ref={problemRef}
          className="absolute inset-x-0 top-0 z-10"
          style={{ willChange: "transform, opacity", minHeight: "100vh" }}
        >
          <ProblemSection dict={dict} />
        </div>

        {/* Hero layer — on top, zooms/fades away */}
        <div
          ref={heroLayerRef}
          id="hero"
          data-testid="hero-section"
          className="section-dark absolute inset-0 z-20"
          style={{ willChange: "opacity", background: "transparent" }}
        >
          <HeroSection dict={dict} locale={locale} ref={heroContentRef} />
        </div>
      </div>
    </div>
  );
}
