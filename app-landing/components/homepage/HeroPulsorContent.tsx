"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "@phosphor-icons/react";
import type { Locale } from "../../lib/i18n/config";
import { getValuePropContent } from "../../lib/content/value-prop";
import { heroPulsorCta, heroPulsorHeadline } from "../../lib/animations/variants";

interface HeroPulsorContentProps {
  locale: Locale;
  contactHref: string;
  proofHref: string;
}

function HeroPrimaryCta({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-[58px] items-center justify-center gap-2.5 rounded-full bg-white px-7 text-[16px] font-semibold text-[#09111a] shadow-[0_22px_60px_-28px_rgba(255,255,255,0.7)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#f6efe4] active:scale-[0.98]"
    >
      <span>{label}</span>
      <ArrowUpRight size={16} weight="bold" aria-hidden="true" />
    </Link>
  );
}

function HeroSecondaryCta({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-[58px] items-center justify-center rounded-full border border-white/16 bg-white/8 px-7 text-[16px] font-semibold text-white backdrop-blur-md transition-colors duration-300 hover:bg-white/12 active:scale-[0.98]"
    >
      {label}
    </Link>
  );
}

function HeroProofStrip({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/58">
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </div>
  );
}

export function HeroPulsorContent({
  locale,
  contactHref,
  proofHref,
}: HeroPulsorContentProps) {
  const valueProp = getValuePropContent(locale);
  const reduced = useReducedMotion();

  return (
    <motion.div
      className="mx-auto w-full max-w-[1320px] px-5 sm:px-6 lg:px-8"
      initial={reduced ? "visible" : "hidden"}
      animate="visible"
      transition={{ staggerChildren: 0.08, delayChildren: 0.1 }}
    >
      <div className="max-w-[760px] text-white">
        <motion.div
          variants={heroPulsorCta}
          className="flex flex-wrap items-center gap-3"
        >
          <p className="rounded-full border border-white/14 bg-white/8 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/72 backdrop-blur-sm">
            {valueProp.heroKicker}
          </p>
        </motion.div>

        <motion.p
          variants={heroPulsorCta}
          className="mt-10 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/58"
        >
          {valueProp.heroOffer.title}
        </motion.p>

        <motion.div variants={heroPulsorHeadline} className="mt-4">
          <h1 className="max-w-[10.8ch] text-[3.35rem] font-semibold leading-[0.9] tracking-[-0.06em] text-white min-[480px]:text-[4rem] md:text-[5.2rem] lg:text-[6rem] xl:text-[6.6rem]">
            {valueProp.heroHeading}
            <br />
            <span className="text-[#f0c37a]">
              {valueProp.heroHeadingHighlight}
            </span>
          </h1>
        </motion.div>

        <motion.p
          variants={heroPulsorCta}
          className="mt-7 max-w-[40rem] text-[1rem] leading-7 text-white/76 sm:text-[1.1rem] sm:leading-8"
        >
          {valueProp.heroSubheading}
        </motion.p>

        <motion.div
          variants={heroPulsorCta}
          className="mt-10 flex flex-col items-start gap-3.5 sm:flex-row sm:flex-wrap"
        >
          <HeroPrimaryCta href={contactHref} label={valueProp.ctaSecondary} />
          <HeroSecondaryCta href={proofHref} label={valueProp.ctaPrimary} />
        </motion.div>

        <motion.p
          variants={heroPulsorCta}
          className="mt-7 max-w-[38rem] text-sm leading-6 text-white/58"
        >
          {valueProp.heroOffer.note}
        </motion.p>

        <motion.div variants={heroPulsorCta} className="mt-8">
          <HeroProofStrip items={valueProp.reassurance} />
        </motion.div>
      </div>
    </motion.div>
  );
}
