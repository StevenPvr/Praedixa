"use client";

import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export function DiveTransition() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // We pin this container to create a long scroll space where the user "dives" into the 3D scene
    // The actual 3D camera zoom is handled inside `Nebula.tsx` by reading the scroll store `progress`,
    // which progresses globally. Here, we just create the necessary physical scrolling distance.
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: containerRef.current,
        start: "top top",
        end: "+=20%", // Just 20vh - extremely fast, practically a snap
        pin: true,
        scrub: true,
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-screen pointer-events-none relative z-0"
      aria-hidden="true"
    />
  );
}
