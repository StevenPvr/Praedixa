import { create } from "zustand";

interface ScrollState {
  progress: number;
  velocity: number;
  direction: 1 | -1;
  currentAct: number;
  gpuTier: 0 | 1 | 2;
}

interface ScrollActions {
  setScroll: (progress: number, velocity: number, direction: 1 | -1) => void;
  setAct: (act: number) => void;
  setGpuTier: (tier: 0 | 1 | 2) => void;
}

function getActFromProgress(progress: number): number {
  if (progress < 0.15) return 0;
  if (progress < 0.3) return 1;
  if (progress < 0.5) return 2;
  if (progress < 0.68) return 3;
  if (progress < 0.8) return 4;
  if (progress < 0.92) return 5;
  return 6;
}

export const useScrollStore = create<ScrollState & ScrollActions>((set) => ({
  progress: 0,
  velocity: 0,
  direction: 1,
  currentAct: 0,
  gpuTier: 2,

  setScroll: (progress, velocity, direction) =>
    set({
      progress,
      velocity,
      direction,
      currentAct: getActFromProgress(progress),
    }),
  setAct: (act) => set({ currentAct: act }),
  setGpuTier: (tier) => set({ gpuTier: tier }),
}));
