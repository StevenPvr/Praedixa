"use client";

import React from "react";
import { motion } from "framer-motion";

function ShimmerBarInner() {
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-neutral-100">
      <motion.div
        className="absolute inset-y-0 left-0 w-1/2 rounded-full bg-gradient-to-r from-brass-200 via-brass-300 to-brass-200"
        animate={{ x: ["-100%", "200%"] }}
        transition={{
          duration: 2.4,
          repeat: Infinity,
          ease: "easeInOut",
          repeatDelay: 0.6,
        }}
      />
    </div>
  );
}

export const ShimmerBar = React.memo(ShimmerBarInner);
