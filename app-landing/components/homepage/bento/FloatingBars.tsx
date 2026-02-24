"use client";

import React from "react";
import { motion } from "framer-motion";

const BARS = [
  { h: "60%", delay: 0 },
  { h: "80%", delay: 0.3 },
  { h: "45%", delay: 0.6 },
  { h: "70%", delay: 0.9 },
  { h: "55%", delay: 1.2 },
];

function FloatingBarsInner() {
  return (
    <div className="flex h-full items-end gap-1.5">
      {BARS.map((bar, i) => (
        <motion.div
          key={i}
          className="flex-1 rounded-t-sm bg-gradient-to-t from-brass-300 to-brass-100"
          animate={{
            height: [bar.h, `calc(${bar.h} + 12%)`, bar.h],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: bar.delay,
          }}
          style={{ height: bar.h }}
        />
      ))}
    </div>
  );
}

export const FloatingBars = React.memo(FloatingBarsInner);
