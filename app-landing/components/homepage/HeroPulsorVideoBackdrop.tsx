"use client";

import { useReducedMotion } from "framer-motion";

export function HeroPulsorVideoBackdrop() {
  const reduced = useReducedMotion();

  return (
    <div aria-hidden="true" className="absolute inset-0">
      <video
        data-testid="hero-background-video"
        className="h-full w-full object-cover"
        autoPlay={!reduced}
        muted
        loop={!reduced}
        playsInline
        preload="metadata"
        poster="/hero-video/restaurant-hero-poster.jpg"
      >
        <source src="/hero-video/restaurant-hero-loop.mp4" type="video/mp4" />
      </video>

      <div
        data-testid="hero-video-overlay-base"
        className="absolute inset-0 bg-[rgba(7,12,17,0.3)]"
      />
      <div
        data-testid="hero-video-overlay-gradient"
        className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,12,17,0.64)_0%,rgba(7,12,17,0.54)_36%,rgba(7,12,17,0.22)_62%,rgba(7,12,17,0.44)_100%)]"
      />
      <div className="absolute inset-0 bg-[radial-gradient(92%_82%_at_50%_18%,rgba(230,182,112,0.16),transparent_58%)]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(180deg,rgba(7,12,17,0)_0%,rgba(7,12,17,0.42)_100%)]" />
    </div>
  );
}
