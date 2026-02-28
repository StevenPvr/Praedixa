"use client";

import { motion } from "framer-motion";
import { ShimmerBar } from "./bento/ShimmerBar";
import { BreathingDot } from "./bento/BreathingDot";
import { FloatingBars } from "./bento/FloatingBars";
import { CounterTick } from "./bento/CounterTick";

const SPRING = { type: "spring" as const, stiffness: 100, damping: 20 };

/**
 * Card class — diffusion shadow + subtle border.
 * Inner 1px white refraction (inset shadow) for a premium "glass" feel.
 */
const card =
  "rounded-[1.5rem] border border-neutral-200/60 bg-white p-5 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.8)]";

export function HeroBentoPreview() {
  return (
    <div className="relative w-full">
      <div className="grid grid-cols-[2fr_1fr] grid-rows-[auto_auto] gap-3">
        {/* Top-left: Forecast chart (large) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING, delay: 0.5 }}
          className={`row-span-1 ${card}`}
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-neutral-400">
              Forecast
            </span>
            <BreathingDot />
          </div>
          <div className="h-24">
            <FloatingBars />
          </div>
        </motion.div>

        {/* Top-right: Counter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING, delay: 0.65 }}
          className={`flex flex-col justify-between ${card}`}
        >
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-neutral-400">
            Processed
          </span>
          <CounterTick />
        </motion.div>

        {/* Bottom-left: Coverage progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING, delay: 0.8 }}
          className={card}
        >
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-neutral-400">
            Coverage analysis
          </span>
          <div className="mt-3 space-y-2.5">
            <ShimmerBar />
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-500">Processing 3 sites...</span>
              <span className="font-mono font-medium text-brass">67%</span>
            </div>
          </div>
        </motion.div>

        {/* Bottom-right: Pipeline status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING, delay: 0.95 }}
          className={card}
        >
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-neutral-400">
            Status
          </span>
          <div className="mt-3 space-y-2">
            {["Ingestion", "Model", "Output"].map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <motion.span
                  className="h-1.5 w-1.5 rounded-full bg-brass"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.5,
                  }}
                />
                <span className="text-xs text-neutral-500">{label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
