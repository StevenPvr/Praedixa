"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface CountUpProps {
  value: string;
  className?: string;
  duration?: number;
}

function parseNumeric(
  val: string,
): { prefix: string; num: number; suffix: string } | null {
  const match = val.match(/^([^\d]*)(\d+(?:[.,]\d+)?)(.*)$/);
  if (!match) return null;
  return {
    prefix: match[1] ?? "",
    num: parseFloat(match[2]!.replace(",", ".")),
    suffix: match[3] ?? "",
  };
}

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function CountUp({ value, className, duration = 1500 }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);
  const [glowing, setGlowing] = useState(false);
  const hasAnimated = useRef(false);

  const animate = useCallback(() => {
    const parsed = parseNumeric(value);
    if (!parsed || hasAnimated.current) {
      setDisplay(value);
      return;
    }
    hasAnimated.current = true;

    const start = performance.now();
    function tick() {
      const elapsed = performance.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutExpo(progress);
      const current = Math.round(eased * parsed!.num);
      setDisplay(`${parsed!.prefix}${current}${parsed!.suffix}`);

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        setDisplay(value);
        setGlowing(true);
        setTimeout(() => setGlowing(false), 600);
      }
    }
    requestAnimationFrame(tick);
  }, [value, duration]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          animate();
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [animate]);

  return (
    <span
      ref={ref}
      className={className}
      style={{
        boxShadow: glowing
          ? "0 0 30px -8px oklch(0.63 0.165 246 / 0.3)"
          : "none",
        transition: "box-shadow 600ms ease",
      }}
    >
      {display}
    </span>
  );
}
