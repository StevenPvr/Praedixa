"use client";

import React from "react";
import { motion } from "framer-motion";

function BreathingDotInner() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="relative flex h-2.5 w-2.5">
        <motion.span
          className="absolute inset-0 rounded-full bg-brass-400"
          animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0.2, 0.6] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brass" />
      </span>
      <span className="text-xs font-medium text-neutral-500">Live</span>
    </div>
  );
}

export const BreathingDot = React.memo(BreathingDotInner);
