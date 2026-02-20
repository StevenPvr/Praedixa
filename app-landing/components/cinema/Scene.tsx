"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect } from "react";
import { NeuralNetwork } from "@/components/cinema/NeuralNetwork";
import { useScrollStore } from "@/lib/stores/scroll-store";

export interface SceneProps {
  gpuTier: 1 | 2;
}

export default function Scene({ gpuTier }: SceneProps) {
  const setGpuTier = useScrollStore((s) => s.setGpuTier);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) return;

    let rafId = 0;
    let frames = 0;
    const start = performance.now();

    const sample = (time: number) => {
      if (document.visibilityState === "visible") frames += 1;

      if (time - start >= 2000) {
        const fps = frames / ((time - start) / 1000);
        if (fps < 30) {
          const nextTier = Math.max(0, gpuTier - 1) as 0 | 1 | 2;
          setGpuTier(nextTier);
        }
        return;
      }

      rafId = requestAnimationFrame(sample);
    };

    rafId = requestAnimationFrame(sample);
    return () => cancelAnimationFrame(rafId);
  }, [gpuTier, setGpuTier]);

  return (
    <Canvas
      dpr={[1, gpuTier === 2 ? 1.5 : 1]}
      camera={{ position: [0, 0, 12], fov: 50, near: 0.1, far: 100 }}
      gl={{
        antialias: false,
        alpha: true,
        powerPreference: "high-performance",
      }}
      style={{ background: "transparent" }}
    >
      <Suspense fallback={null}>
        <NeuralNetwork gpuTier={gpuTier} />
      </Suspense>
    </Canvas>
  );
}
