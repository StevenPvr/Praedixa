"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, BarChart3 } from "lucide-react";
import type { Locale } from "../../lib/i18n/config";
import { getValuePropContent } from "../../lib/content/value-prop";
import {
  heroPulsorHeadline,
  heroPulsorBadge,
  heroPulsorCta,
} from "../../lib/animations/variants";

interface HeroPulsorContentProps {
  locale: Locale;
  contactHref: string;
  proofHref: string;
}

export function HeroPulsorContent({
  locale,
  contactHref,
  proofHref,
}: HeroPulsorContentProps) {
  const vp = getValuePropContent(locale);
  const reduced = useReducedMotion();

  return (
    <motion.div
      className="relative z-10 flex w-full flex-col items-center px-5 text-center sm:px-6 lg:px-8"
      initial={reduced ? "visible" : "hidden"}
      animate="visible"
      transition={{ staggerChildren: 0.08, delayChildren: 0.1 }}
    >
      {/* Eyebrow */}
      <motion.p
        variants={heroPulsorCta}
        className="text-[13px] font-semibold uppercase tracking-[0.12em]"
        style={{ color: "rgba(17,24,39,0.55)" }}
      >
        {vp.heroKicker}
      </motion.p>

      {/* H1 with badge */}
      <motion.div variants={heroPulsorHeadline} className="relative mt-4">
        <h1
          className="text-[40px] font-[650] leading-[0.96] tracking-[-0.055em] min-[480px]:text-[44px] md:text-[60px] lg:text-[72px] xl:text-[84px] 2xl:text-[92px]"
          style={{
            color: "var(--hero-text)",
            lineHeight: "0.96em",
            textShadow: "0 2px 12px rgba(15,17,21,0.06)",
          }}
        >
          {vp.heroHeading}
          <br />
          <span>{vp.heroHeadingHighlight}</span>
        </h1>

        {/* Blue badge — floating with depth shadow */}
        <motion.span
          variants={heroPulsorBadge}
          className="hero-float absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 rounded-xl px-3.5 py-2 text-[13px] font-bold uppercase tracking-wide text-white md:translate-x-6 lg:translate-x-10"
          style={{
            background:
              "linear-gradient(135deg, #3D8FFF 0%, #2F80FF 50%, #1A6FFF 100%)",
            boxShadow:
              "0 4px 8px rgba(47,128,255,0.20), 0 12px 24px rgba(47,128,255,0.18), 0 24px 48px rgba(47,128,255,0.12)",
            animation: reduced ? "none" : "hero-float 4s ease-in-out infinite",
          }}
          aria-hidden="true"
        >
          {vp.heroBadgeText ?? "IA DÉCISIONNELLE"}
        </motion.span>
      </motion.div>

      {/* Subtext */}
      <motion.p
        variants={heroPulsorCta}
        className="mt-8 max-w-2xl text-[17px] leading-[28px] sm:text-[19px] sm:leading-[30px] lg:text-[21px] lg:leading-[32px]"
        style={{ color: "var(--hero-muted)" }}
      >
        {vp.heroSubheading}
      </motion.p>

      {/* CTAs */}
      <motion.div
        variants={heroPulsorCta}
        className="mt-10 flex w-full flex-col items-center gap-3.5 min-[480px]:w-auto min-[480px]:flex-row"
      >
        {/* Primary: dark pill with shimmer → contact */}
        <Link
          href={contactHref}
          className="hero-shimmer-cta group relative inline-flex h-[58px] w-full items-center justify-center gap-2.5 overflow-hidden rounded-[29px] px-8 text-[17px] font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] min-[480px]:w-auto"
          style={{
            background: "var(--hero-dark)",
            boxShadow:
              "0 4px 6px rgba(17,19,24,0.08), 0 12px 20px rgba(17,19,24,0.12), 0 24px 40px rgba(17,19,24,0.08)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow =
              "0 6px 10px rgba(17,19,24,0.10), 0 18px 28px rgba(17,19,24,0.16), 0 32px 52px rgba(17,19,24,0.12)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow =
              "0 4px 6px rgba(17,19,24,0.08), 0 12px 20px rgba(17,19,24,0.12), 0 24px 40px rgba(17,19,24,0.08)";
          }}
        >
          {/* Shimmer sweep overlay */}
          <span
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.08) 45%, rgba(255,255,255,0.14) 50%, rgba(255,255,255,0.08) 55%, transparent 60%)",
              backgroundSize: "200% 100%",
              animation: reduced
                ? "none"
                : "hero-shimmer 4s ease-in-out infinite",
            }}
            aria-hidden="true"
          />
          <span className="relative">{vp.ctaSecondary}</span>
          <ArrowUpRight
            className="relative h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            aria-hidden="true"
          />
        </Link>

        {/* Secondary: glass pill with depth → proof */}
        <Link
          href={proofHref}
          className="group inline-flex h-[58px] w-full items-center justify-center gap-2.5 rounded-[29px] border px-8 text-[17px] font-semibold backdrop-blur-[12px] transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] min-[480px]:w-auto"
          style={{
            background: "var(--hero-glass)",
            borderColor: "var(--hero-border-soft)",
            color: "var(--hero-dark)",
            boxShadow:
              "0 2px 4px rgba(15,17,21,0.03), 0 8px 16px rgba(15,17,21,0.04), inset 0 1px 0 rgba(255,255,255,0.5)",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.boxShadow =
              "0 4px 8px rgba(15,17,21,0.06), 0 14px 28px rgba(15,17,21,0.08), inset 0 1px 0 rgba(255,255,255,0.6)";
            el.style.background = "rgba(255,255,255,0.78)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.boxShadow =
              "0 2px 4px rgba(15,17,21,0.03), 0 8px 16px rgba(15,17,21,0.04), inset 0 1px 0 rgba(255,255,255,0.5)";
            el.style.background = "var(--hero-glass)";
          }}
        >
          <BarChart3
            className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:scale-110"
            aria-hidden="true"
          />
          <span>{vp.ctaPrimary}</span>
        </Link>
      </motion.div>

      {/* Trust chips — elevated glass */}
      <motion.div
        variants={heroPulsorCta}
        className="mt-8 flex flex-wrap justify-center gap-2"
      >
        {vp.reassurance.map((item) => (
          <span
            key={item}
            className="inline-flex h-8 items-center rounded-full border px-3.5 text-[13px] font-semibold backdrop-blur-sm transition-all duration-200 hover:-translate-y-px"
            style={{
              background: "rgba(255,255,255,0.60)",
              borderColor: "rgba(15,17,21,0.05)",
              color: "var(--hero-text)",
              boxShadow:
                "0 1px 3px rgba(15,17,21,0.03), 0 4px 8px rgba(15,17,21,0.02)",
            }}
          >
            {item}
          </span>
        ))}
      </motion.div>

      {/* Proof block — card-like elevation */}
      <motion.div
        variants={heroPulsorCta}
        className="mt-10 flex flex-col items-center gap-4 rounded-2xl px-8 py-6"
        style={{
          background: "rgba(255,255,255,0.35)",
          boxShadow:
            "0 1px 2px rgba(15,17,21,0.02), 0 4px 12px rgba(15,17,21,0.03), inset 0 1px 0 rgba(255,255,255,0.6)",
        }}
      >
        {/* Proof text */}
        <p
          className="text-[16px] font-medium leading-7 sm:text-[18px] sm:leading-7"
          style={{ color: "rgba(15,17,21,0.72)" }}
        >
          {vp.heroProofBlockText ?? ""}
        </p>

        {/* Role chips — with depth */}
        <div className="flex flex-wrap justify-center gap-3">
          {(vp.heroProofRoles ?? []).map((role) => (
            <span
              key={role}
              className="inline-flex h-8 items-center rounded-full border px-3 text-[12px] font-semibold uppercase tracking-wide transition-all duration-200 hover:-translate-y-px hover:shadow-md"
              style={{
                background: "rgba(255,255,255,0.72)",
                borderColor: "var(--hero-border-soft)",
                color: "var(--hero-text)",
                boxShadow: "0 1px 3px rgba(15,17,21,0.04)",
              }}
            >
              {role}
            </span>
          ))}
        </div>

        {/* Micro-pill — elevated */}
        {vp.heroProofMicropill && (
          <div
            className="inline-flex h-[38px] items-center rounded-[19px] border px-5 text-[13px] font-medium"
            style={{
              background: "var(--hero-glass-strong)",
              borderColor: "rgba(15,17,21,0.08)",
              color: "var(--hero-text)",
              boxShadow:
                "0 2px 4px rgba(15,17,21,0.03), 0 6px 12px rgba(15,17,21,0.04), inset 0 1px 0 rgba(255,255,255,0.5)",
            }}
          >
            {vp.heroProofMicropill}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
