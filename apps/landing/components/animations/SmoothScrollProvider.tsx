"use client";

import { createContext, useEffect, useState, ReactNode } from "react";
import Lenis from "lenis";
import { createLenis } from "../../lib/smooth-scroll/lenis";
import { useReducedMotion } from "../../hooks/useReducedMotion";

export const LenisContext = createContext<Lenis | null>(null);

interface SmoothScrollProviderProps {
  children: ReactNode;
}

/**
 * Provider component for Lenis smooth scroll.
 * Initializes Lenis on mount and manages the RAF loop.
 * Disables smooth scroll when prefers-reduced-motion is enabled.
 */
export function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    // Don't initialize Lenis if user prefers reduced motion
    if (prefersReducedMotion) {
      return;
    }

    const lenisInstance = createLenis();
    setLenis(lenisInstance);

    // RAF loop for Lenis
    function raf(time: number) {
      lenisInstance.raf(time);
      requestAnimationFrame(raf);
    }

    const rafId = requestAnimationFrame(raf);

    // Cleanup
    return () => {
      cancelAnimationFrame(rafId);
      lenisInstance.destroy();
      setLenis(null);
    };
  }, [prefersReducedMotion]);

  return (
    <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>
  );
}
