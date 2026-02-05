"use client";

import { useContext } from "react";
import { LenisContext } from "../components/animations/SmoothScrollProvider";
import type Lenis from "lenis";

interface ScrollToOptions {
  offset?: number;
  duration?: number;
  immediate?: boolean;
}

interface SmoothScrollReturn {
  lenis: Lenis | null;
  scrollTo: (
    target: string | number | HTMLElement,
    options?: ScrollToOptions,
  ) => void;
}

/**
 * Hook to access Lenis smooth scroll instance and scrollTo method.
 * Use this for programmatic scroll navigation.
 */
export function useSmoothScroll(): SmoothScrollReturn {
  const lenis = useContext(LenisContext);

  const scrollTo = (
    target: string | number | HTMLElement,
    options?: ScrollToOptions,
  ) => {
    if (!lenis) {
      // Fallback to native scroll if Lenis is not available
      if (typeof target === "string") {
        const element = document.querySelector(target);
        element?.scrollIntoView({ behavior: "smooth" });
      } else if (typeof target === "number") {
        window.scrollTo({ top: target, behavior: "smooth" });
      } else {
        target.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }

    lenis.scrollTo(target, options);
  };

  return { lenis, scrollTo };
}
