"use client";

import { ShieldCheck } from "lucide-react";

export function PiiMaskIndicator() {
  return (
    <span
      className="inline-flex items-center gap-1 text-gray-400"
      title="Donnee masquee (PII)"
    >
      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="font-mono text-xs">***</span>
    </span>
  );
}
