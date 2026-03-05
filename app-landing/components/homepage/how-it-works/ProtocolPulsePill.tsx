"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";

interface ProtocolPulsePillProps {
  label: string;
}

function ProtocolPulsePillInner({ label }: ProtocolPulsePillProps) {
  const reducedMotion = useReducedMotion();

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-100">
      <span className="relative flex h-2.5 w-2.5">
        {reducedMotion ? null : (
          <motion.span
            className="absolute inset-0 rounded-full bg-amber-300"
            animate={{ scale: [1, 1.5, 1], opacity: [0.75, 0.2, 0.75] }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: "easeInOut",
              type: "tween",
            }}
          />
        )}
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-300" />
      </span>
      {label}
    </span>
  );
}

export const ProtocolPulsePill = React.memo(ProtocolPulsePillInner);
