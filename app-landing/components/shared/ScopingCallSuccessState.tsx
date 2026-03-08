"use client";

import { CheckCircle } from "@phosphor-icons/react";
import type { ScopingCallCopy } from "./scoping-call.types";

export function ScopingCallSuccessState({
  className,
  copy,
}: {
  className?: string;
  copy: ScopingCallCopy;
}) {
  return (
    <section
      className={`rounded-[2rem] border border-amber-200/80 bg-[linear-gradient(165deg,rgba(244,231,198,0.62)_0%,rgba(252,248,238,0.9)_72%,rgba(255,255,255,0.96)_100%)] p-6 shadow-[0_22px_46px_-38px_rgba(32,24,4,0.25),inset_0_1px_0_rgba(255,255,255,0.82)] ${className ?? ""}`}
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <CheckCircle size={22} weight="fill" className="mt-0.5 text-amber-700" />
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-ink">{copy.successTitle}</h2>
          <p className="mt-1 text-sm leading-relaxed text-neutral-700">{copy.successBody}</p>
        </div>
      </div>
    </section>
  );
}
