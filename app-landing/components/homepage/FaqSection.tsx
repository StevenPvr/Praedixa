import type { Dictionary } from "../../lib/i18n/types";
import { SectionShell } from "../shared/SectionShell";
import { Kicker } from "../shared/Kicker";
import { FaqSectionClient } from "./FaqSectionClient";

interface FaqSectionProps {
  dict: Dictionary;
}

export function FaqSection({ dict }: FaqSectionProps) {
  return (
    <SectionShell id="faq" className="relative py-24 md:py-32">
      <div className="grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.45fr)] md:gap-16">
        <div className="md:sticky md:top-24 md:self-start">
          <Kicker className="tracking-[0.12em] text-brass-700">
            {dict.faq.kicker}
          </Kicker>
          <h2 className="mt-4 text-4xl font-semibold tracking-tighter text-ink md:text-5xl md:leading-[0.98]">
            {dict.faq.heading}
          </h2>
          <p className="mt-5 max-w-[34ch] text-base leading-relaxed text-neutral-600">
            {dict.faq.subheading}
          </p>

          <div className="mt-8 max-w-md rounded-3xl border border-border-subtle/90 bg-white/75 p-5 shadow-[0_20px_40px_-20px_rgba(28,22,14,0.25)] backdrop-blur-xl">
            <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-brass-700">
              {dict.faq.signalLabel}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              {dict.faq.signalBody}
            </p>
            <div className="mt-4 h-px w-full bg-gradient-to-r from-amber-200/80 via-amber-100/40 to-transparent" />
            <p className="mt-4 text-2xs uppercase tracking-[0.12em] text-neutral-500">
              {dict.faq.categoryHint}
            </p>
          </div>
        </div>

        <div>
          <FaqSectionClient dict={dict} />
        </div>
      </div>
    </SectionShell>
  );
}
