"use client";

import { motion } from "framer-motion";
import { sectionReveal, viewportOnce } from "../../lib/animations/variants";
import {
  trustLogos,
  trustBandTitle,
  trustBandSubtitle,
} from "../../lib/content/trust-logos";

function PlaceholderLogo({ label }: { label: string }) {
  return (
    <div className="flex h-12 w-32 flex-shrink-0 items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-neutral-100/60 px-4 md:h-14 md:w-40">
      <span className="text-xs font-medium text-neutral-400">{label}</span>
    </div>
  );
}

export function TrustBand() {
  return (
    <section
      aria-label={trustBandTitle}
      className="border-y border-neutral-200 bg-cream py-10 md:py-14"
    >
      <div className="mx-auto max-w-7xl px-6 text-center">
        <motion.p
          variants={sectionReveal}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="text-sm font-semibold uppercase tracking-wider text-amber-600"
        >
          {trustBandTitle}
        </motion.p>
        <motion.p
          variants={sectionReveal}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="mt-1 text-sm text-neutral-400"
        >
          {trustBandSubtitle}
        </motion.p>
      </div>

      <div
        className="mt-8 overflow-hidden"
        style={{
          maskImage:
            "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
        }}
      >
        <div
          className="marquee-track flex w-max items-center gap-8"
          style={{ animation: "marquee 30s linear infinite" }}
        >
          {trustLogos.map((logo) => (
            <PlaceholderLogo key={logo.id} label={logo.label} />
          ))}
          <div aria-hidden="true" className="contents">
            {trustLogos.map((logo) => (
              <PlaceholderLogo key={`${logo.id}-dup`} label={logo.label} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
