"use client";

import { useState, useEffect } from "react";

/**
 * Hook to determine when the app is ready to display content.
 * Waits for a minimum branding time and document readiness.
 *
 * @param minDisplayTime - Minimum time in ms to show splash (default: 2000ms)
 * @returns Object with isReady boolean
 */
export function useAppReady(minDisplayTime: number = 2000): {
  isReady: boolean;
} {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const checkReady = () => {
      // Wait for minimum display time for branding
      timeoutId = setTimeout(() => {
        setIsReady(true);
      }, minDisplayTime);
    };

    // Check if document is already loaded
    if (document.readyState === "complete") {
      checkReady();
    } else {
      // Wait for window load event
      const handleLoad = () => {
        checkReady();
      };
      window.addEventListener("load", handleLoad);

      // Fallback: start timer anyway after a short delay
      // This handles cases where load event already fired
      const fallbackTimeout = setTimeout(checkReady, 100);

      return () => {
        window.removeEventListener("load", handleLoad);
        clearTimeout(fallbackTimeout);
        clearTimeout(timeoutId);
      };
    }

    return () => {
      clearTimeout(timeoutId);
    };
  }, [minDisplayTime]);

  return { isReady };
}
