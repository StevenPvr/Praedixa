"use client";

import { motion } from "framer-motion";
import { sectionReveal, viewportOnce } from "../../lib/animations/variants";
import {
  trustLogos,
  trustBandTitle,
  trustBandSubtitle,
} from "../../lib/content/trust-logos";

function SectorChip({ label }: { label: string }) {
  return (
    <div className="flex h-11 w-44 shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-white/90 px-4">
      <span className="text-xs font-semibold uppercase tracking-wide text-charcoal/70">
        {label}
      </span>
    </div>
  );
}

export function TrustBand() {
  return (
    <section
      aria-label={trustBandTitle}
      className="border-y border-neutral-200/90 bg-[oklch(0.968_0.004_95)] py-10 md:py-12"
    >
      <div className="section-shell text-center">
        <motion.p
          variants={sectionReveal}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="section-kicker"
        >
          {trustBandTitle}
        </motion.p>
        <motion.p
          variants={sectionReveal}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="mt-2 text-sm text-neutral-600"
        >
          {trustBandSubtitle}
        </motion.p>
      </div>

      <div
        className="mt-7 overflow-hidden"
        style={{
          maskImage:
            "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
        }}
      >
        <div
          className="marquee-track flex w-max items-center gap-6"
          style={{ animation: "marquee 28s linear infinite" }}
        >
          {trustLogos.map((logo) => (
            <SectorChip key={logo.id} label={logo.label} />
          ))}
          <div aria-hidden="true" className="contents">
            {trustLogos.map((logo) => (
              <SectorChip key={`${logo.id}-dup`} label={logo.label} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
