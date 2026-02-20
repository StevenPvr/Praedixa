"use client";

import { useEffect, useRef, useState } from "react";

interface CheckDrawProps {
  className?: string;
}

export function CheckDraw({ className }: CheckDrawProps) {
  const ref = useRef<SVGSVGElement>(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setDrawn(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <svg
      ref={ref}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path
        d="M5 13l4 4L19 7"
        style={{
          strokeDasharray: 24,
          strokeDashoffset: drawn ? 0 : 24,
          transition: "stroke-dashoffset 300ms ease-out",
        }}
      />
    </svg>
  );
}
