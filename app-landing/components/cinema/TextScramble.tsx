"use client";

import { useEffect, useRef, useState, useMemo } from "react";

// Clean, minimal character set — avoids jarring symbols
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

interface TextScrambleProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
  as?: "h1" | "h2" | "h3" | "span" | "p" | "div";
  flashOnComplete?: boolean;
}

export function TextScramble({
  text,
  className,
  style: externalStyle,
  delay = 0,
  as: Tag = "span",
  flashOnComplete = false,
}: TextScrambleProps) {
  const [display, setDisplay] = useState(() => {
    if (Tag === "h1" || Tag === "h2" || Tag === "h3") return text;
    return text.replace(/[^ ]/g, "\u00A0");
  });
  const [started, setStarted] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const frameRef = useRef(0);

  // Pre-generate random characters per position for consistency
  const randomChars = useMemo(() => {
    return text
      .split("")
      .map(() =>
        Array.from(
          { length: 6 },
          () => CHARS[Math.floor(Math.random() * CHARS.length)],
        ),
      );
  }, [text]);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced) {
      setDisplay(text);
      return;
    }

    const timer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timer);
  }, [delay, text]);

  useEffect(() => {
    if (!started) return;

    const chars = text.split("");
    const totalDuration = 900; // Total animation length (ms)
    // Each character's reveal is staggered across the wave
    const staggerPerChar = totalDuration / (chars.length + 8);
    const charAnimDuration = 350; // How long each char scrambles before locking
    const startTime = performance.now();

    function tick() {
      const now = performance.now();
      const elapsed = now - startTime;

      let allDone = true;

      const result = chars.map((c, i) => {
        if (c === " ") return " ";

        // Each character starts its animation at a staggered time
        const charStart = i * staggerPerChar;
        const charElapsed = elapsed - charStart;

        if (charElapsed < 0) {
          // Not started yet — show blank
          allDone = false;
          return "\u00A0";
        }

        if (charElapsed >= charAnimDuration) {
          // Locked — show final character
          return c;
        }

        // In-progress: cycle through pre-generated random chars smoothly
        allDone = false;
        const progress = charElapsed / charAnimDuration;
        // Ease-out: slow down the scramble as it approaches the final char
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        const cycleIndex = Math.floor(
          easedProgress * (randomChars[i]!.length - 1),
        );

        // Near the end, start showing the real character intermittently
        if (progress > 0.7 && Math.random() < (progress - 0.7) / 0.3) {
          return c;
        }

        return randomChars[i]![cycleIndex] ?? c;
      });

      setDisplay(result.join(""));

      if (allDone) {
        setDisplay(text);
        if (flashOnComplete) {
          setIsFlashing(true);
          window.setTimeout(() => setIsFlashing(false), 250);
        }
        return;
      }

      frameRef.current = requestAnimationFrame(tick);
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [started, text, randomChars, flashOnComplete]);

  return (
    <Tag
      className={className}
      style={{
        ...externalStyle,
        ...(isFlashing
          ? { textShadow: "0 0 24px oklch(0.7 0.15 247 / 0.6)" }
          : {}),
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {display}
    </Tag>
  );
}
