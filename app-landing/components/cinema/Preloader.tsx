"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProgress } from "@react-three/drei";
import { useGpuTier } from "./GpuTier";

export function Preloader() {
  const [progressVal, setProgressVal] = useState(0);
  const [done, setDone] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const gpuTier = useGpuTier();
  const { progress: r3fProgress, active, total } = useProgress();

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (done) return;

    if (gpuTier === 0) {
      if (isMounted) {
        setProgressVal(100);
        setDone(true);
        setTimeout(() => setHidden(true), 1200);
      }
      return;
    }

    const targetProgress =
      isMounted && !active && total === 0 ? 100 : r3fProgress;
    setProgressVal(Math.round(targetProgress));

    if (isMounted && !active && targetProgress >= 100) {
      setDone(true);
      setTimeout(() => setHidden(true), 1200);
    }

    const failsafe = setTimeout(() => {
      if (done) return;
      setProgressVal(100);
      setDone(true);
      setTimeout(() => setHidden(true), 1200);
    }, 8000);

    return () => clearTimeout(failsafe);
  }, [gpuTier, r3fProgress, active, total, isMounted, done]);

  if (hidden) return null;

  const strokeProgress = 188 - (188 * progressVal) / 100;

  return (
    <AnimatePresence>
      {!hidden && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center">
          {gpuTier > 0 ? (
            <>
              <motion.div
                className="absolute inset-x-0 top-0 h-1/2"
                style={{ background: "oklch(0.10 0.025 247)" }}
                animate={done ? { y: "-100%" } : { y: 0 }}
                transition={{
                  duration: 0.8,
                  delay: 0.4,
                  ease: [0.76, 0, 0.24, 1],
                }}
              />
              <motion.div
                className="absolute inset-x-0 bottom-0 h-1/2"
                style={{ background: "oklch(0.10 0.025 247)" }}
                animate={done ? { y: "100%" } : { y: 0 }}
                transition={{
                  duration: 0.8,
                  delay: 0.4,
                  ease: [0.76, 0, 0.24, 1],
                }}
              />
            </>
          ) : (
            <motion.div
              className="absolute inset-0"
              style={{ background: "oklch(0.10 0.025 247)" }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            />
          )}

          <motion.div
            className="relative z-10 flex flex-col items-center"
            animate={
              done
                ? { scale: [1, 1.05, 1], opacity: [1, 1, 0] }
                : { scale: 1, opacity: 1 }
            }
            transition={done ? { duration: 0.4, times: [0, 0.5, 1] } : {}}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 60 60"
              fill="none"
              className="mb-6"
            >
              <path
                d="M30 5 L50 15 L50 35 L30 55 L10 35 L10 15 Z"
                stroke="oklch(0.63 0.165 246)"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  strokeDasharray: 188,
                  strokeDashoffset: strokeProgress,
                  transition: "stroke-dashoffset 100ms linear",
                }}
              />
              <path
                d="M30 15 L40 22 L40 38 L30 45 L20 38 L20 22 Z"
                stroke="oklch(0.63 0.165 246 / 0.5)"
                strokeWidth="1"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  strokeDasharray: 100,
                  strokeDashoffset: 100 - (100 * progressVal) / 100,
                  transition: "stroke-dashoffset 100ms linear",
                }}
              />
            </svg>

            <AnimatePresence>
              {!done && (
                <motion.div
                  className="h-px w-32 overflow-hidden bg-white/10"
                  exit={{ opacity: 0 }}
                >
                  <div
                    className="h-full transition-[width] duration-100 linear"
                    style={{
                      width: `${progressVal}%`,
                      background: "var(--brand-400, oklch(0.63 0.165 246))",
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {!done && (
                <motion.p
                  aria-live="polite"
                  className="mt-3 text-[11px] font-sans uppercase tracking-[0.2em]"
                  style={{ color: "oklch(0.5 0.02 248)" }}
                  exit={{ opacity: 0 }}
                >
                  Chargement de l&apos;expérience...
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
