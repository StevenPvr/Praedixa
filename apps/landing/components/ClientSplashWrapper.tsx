"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

// Import SplashScreen with SSR disabled to avoid hydration issues
const SplashScreen = dynamic(
  () => import("./SplashScreen").then((mod) => mod.SplashScreen),
  {
    ssr: false,
    loading: () => (
      // Static fallback during initial load (before JS hydrates)
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0a",
        }}
      >
        <div
          style={{ color: "white", fontSize: "1.5rem", letterSpacing: "0.3em" }}
        >
          PRAEDIXA
        </div>
      </div>
    ),
  },
);

interface ClientSplashWrapperProps {
  children: ReactNode;
}

export function ClientSplashWrapper({ children }: ClientSplashWrapperProps) {
  return <SplashScreen>{children}</SplashScreen>;
}
