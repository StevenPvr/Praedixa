"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, EnvelopeSimple, CheckCircle } from "@phosphor-icons/react";
import type { Locale } from "../../lib/i18n/config";
import { getLocalizedPath } from "../../lib/i18n/config";
import type { Dictionary } from "../../lib/i18n/types";
import { SectionShell } from "../shared/SectionShell";
import { Kicker } from "../shared/Kicker";

interface ContactCtaSectionProps {
  locale: Locale;
  dict: Dictionary;
}

const SPRING = { type: "spring" as const, stiffness: 100, damping: 20 };
const VP = { once: true, margin: "-60px" as const };

export function ContactCtaSection({ locale, dict }: ContactCtaSectionProps) {
  const pilotHref = getLocalizedPath(locale, "pilot");
  const contactHref = getLocalizedPath(locale, "contact");

  return (
    <SectionShell id="contact" className="section-dark">
      <div className="grid grid-cols-1 gap-12 md:grid-cols-[1.4fr_1fr] md:items-center">
        {/* Left: heading + CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VP}
          transition={SPRING}
        >
          <Kicker className="text-brass-300">{dict.contact.kicker}</Kicker>
          <h2 className="mt-3 max-w-xl text-4xl font-bold tracking-tighter text-white md:text-5xl" style={{ lineHeight: 1.05 }}>
            {dict.contact.heading}
          </h2>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-neutral-300">
            {dict.contact.subheading}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href={pilotHref}
              className="btn-primary-gradient inline-flex items-center gap-2 rounded-lg px-6 py-3.5 text-sm font-semibold text-white no-underline transition-all duration-150 active:scale-[0.98] active:-translate-y-[1px]"
            >
              {dict.contact.ctaPrimary}
              <ArrowRight size={16} weight="bold" />
            </Link>
            <Link
              href={contactHref}
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-6 py-3.5 text-sm font-semibold text-white no-underline transition-all duration-150 hover:border-white/40 hover:bg-white/5 active:scale-[0.98] active:-translate-y-[1px]"
            >
              <EnvelopeSimple size={16} weight="bold" />
              {dict.contact.ctaSecondary}
            </Link>
          </div>
        </motion.div>

        {/* Right: trust items */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={VP}
          transition={{ ...SPRING, delay: 0.15 }}
        >
          <div className="border-t-2 border-brass-400/50 pt-6">
            <div className="space-y-3">
              {dict.contact.trustItems.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2.5 text-sm text-neutral-300"
                >
                  <CheckCircle
                    size={16}
                    weight="fill"
                    className="shrink-0 text-brass-400"
                  />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </SectionShell>
  );
}
