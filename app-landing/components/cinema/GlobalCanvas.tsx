"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useGpuTier } from "./GpuTier";
import type { SceneProps } from "@/components/cinema/Scene";
import { useScrollStore } from "@/lib/stores/scroll-store";

const Scene = dynamic<SceneProps>(
  () => import("@/components/cinema/Scene").then((m) => m.default),
  { ssr: false },
);

export function GlobalCanvas() {
  const gpuTier = useGpuTier();
  const [reducedMotion, setReducedMotion] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const progress = useScrollStore((s) => s.progress);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(media.matches);
    onChange();
    media.addEventListener("change", onChange);

    // Allow one frame for Lenis/ScrollStore to gauge initial window.scrollY
    requestAnimationFrame(() => setHydrated(true));

    return () => media.removeEventListener("change", onChange);
  }, []);

  // Avoid mounting heavy canvas until we know initial scroll position
  if (!hydrated) return null;

  // Unmount completely if low GPU, reduced motion, or scrolled past hero
  if (gpuTier === 0 || reducedMotion || progress > 0.16) return null;

  return (
    <div
      className="fixed inset-0 z-0"
      style={{ pointerEvents: "none" }}
      aria-hidden="true"
      role="presentation"
    >
      <Scene gpuTier={gpuTier} />
    </div>
  );
}
