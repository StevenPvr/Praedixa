"use client";

import { useEffect, useRef } from "react";
import Lenis from "lenis";
import { useScrollStore } from "../../lib/stores/scroll-store";

export function LenisProvider({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const setScroll = useScrollStore.getState().setScroll;
    let lastY = window.scrollY;
    let lastTs = performance.now();

    // ── Set initial scroll state immediately ──
    const maxScroll = Math.max(
      1,
      document.documentElement.scrollHeight - window.innerHeight,
    );
    setScroll(Math.min(1, Math.max(0, lastY / maxScroll)), 0, 1);

    const updateNativeScroll = () => {
      const now = performance.now();
      const y = window.scrollY;
      const max = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const progress = Math.min(1, Math.max(0, y / max));
      const dt = Math.max(16, now - lastTs);
      const velocity = ((y - lastY) / dt) * 16;
      const direction: 1 | -1 = y >= lastY ? 1 : -1;

      setScroll(progress, velocity, direction);
      lastY = y;
      lastTs = now;
    };

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced) {
      updateNativeScroll();
      window.addEventListener("scroll", updateNativeScroll, { passive: true });
      window.addEventListener("resize", updateNativeScroll);
      return () => {
        window.removeEventListener("scroll", updateNativeScroll);
        window.removeEventListener("resize", updateNativeScroll);
      };
    }

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 1.5,
    });
    lenisRef.current = lenis;

    let lastProgress = 0;

    lenis.on("scroll", (e: { progress: number; velocity: number }) => {
      const dir: 1 | -1 = e.progress >= lastProgress ? 1 : -1;
      lastProgress = e.progress;
      setScroll(e.progress, e.velocity, dir);
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  return <>{children}</>;
}
