"use client";

import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";

interface SplashContextType {
  /** Whether the splash screen animation is complete */
  isSplashComplete: boolean;
  /** Mark the splash as complete (called by SplashScreen) */
  markSplashComplete: () => void;
}

const SplashContext = createContext<SplashContextType | undefined>(undefined);

interface SplashProviderProps {
  children: ReactNode;
}

/**
 * Provider for splash screen completion state.
 * Used to coordinate animations that should wait for the splash to finish.
 *
 * The SplashScreen component calls markSplashComplete() when the splash
 * animation is done, which triggers entrance animations in Hero and other sections.
 */
export function SplashProvider({ children }: SplashProviderProps) {
  const [isSplashComplete, setIsSplashComplete] = useState(false);

  const markSplashComplete = useCallback(() => {
    setIsSplashComplete(true);
  }, []);

  return (
    <SplashContext.Provider value={{ isSplashComplete, markSplashComplete }}>
      {children}
    </SplashContext.Provider>
  );
}

/**
 * Hook to check if the splash screen is complete.
 * Components can use this to delay their entrance animations.
 *
 * @example
 * ```tsx
 * const { isSplashComplete } = useSplashComplete();
 *
 * return (
 *   <motion.div
 *     initial={{ opacity: 0 }}
 *     animate={isSplashComplete ? { opacity: 1 } : { opacity: 0 }}
 *   />
 * );
 * ```
 */
export function useSplashComplete(): SplashContextType {
  const context = useContext(SplashContext);

  // If used outside provider (e.g., in tests), return a default completed state
  if (!context) {
    return {
      isSplashComplete: true,
      markSplashComplete: () => {
        /* no-op */
      },
    };
  }

  return context;
}

export default SplashContext;
