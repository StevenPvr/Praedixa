"use client";

import { useEffect, type ReactNode } from "react";
import { useScrollStore } from "../../lib/stores/scroll-store";
import { detectGpuTier, type GpuTier } from "../../lib/webgl/gpu-detect";

export function useGpuTier() {
  return useScrollStore((state) => state.gpuTier);
}

export function GpuTierProvider({ children }: { children: ReactNode }) {
  const setGpuTier = useScrollStore((state) => state.setGpuTier);

  useEffect(() => {
    setGpuTier(detectGpuTier());
  }, [setGpuTier]);

  return <>{children}</>;
}

export type { GpuTier };
