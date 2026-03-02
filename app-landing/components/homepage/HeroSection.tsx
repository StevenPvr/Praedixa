import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "@phosphor-icons/react/ssr";
import type { Locale } from "../../lib/i18n/config";
import type { Dictionary } from "../../lib/i18n/types";
import { getLocalizedPath } from "../../lib/i18n/config";
import { HeroBentoPreview } from "./HeroBentoPreview";

interface HeroSectionProps {
  locale: Locale;
  dict: Dictionary;
}

/* ── Component ───────────────────────────────────────────── */

export function HeroSection({ locale, dict }: HeroSectionProps) {
  const primaryCtaHref = `${getLocalizedPath(locale, "contact")}?intent=audit`;
  const incubatorLabel =
    locale === "fr"
      ? "INCUBÉ À EURATECHNOLOGIES — VERTICALE IA/DATA"
      : "INCUBATED AT EURATECHNOLOGIES — AI/DATA TRACK";

  return (
    <section className="relative overflow-hidden bg-cream">
      {/* ── Full viewport fit under sticky header ─────────── */}
      <div className="relative mx-auto grid min-h-[calc(100dvh-var(--header-h))] w-full max-w-7xl grid-rows-[1fr_auto] px-4 pb-4 pt-4 sm:px-6 sm:pb-5 sm:pt-5 lg:px-8 lg:pb-6 lg:pt-6">
        {/* Main row */}
        <div className="grid min-h-0 items-center gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] md:gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-10">
          {/* Left column */}
          <div className="min-w-0">
            {/* Kicker */}
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-200/85 bg-amber-50/75 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-amber-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden="true" />
              {dict.hero.kicker}
            </span>

            {/* Headline */}
            <h1 className="mt-4 text-4xl font-bold leading-[0.95] tracking-tighter text-ink sm:text-5xl md:text-5xl lg:text-6xl">
              {dict.hero.headline}{" "}
              <span className="text-brass">{dict.hero.headlineHighlight}</span>
            </h1>

            {/* Subtitle */}
            <p className="mt-3 max-w-[62ch] text-sm leading-relaxed text-neutral-600 sm:text-base">
              {dict.hero.subtitle}
            </p>

            {/* CTAs */}
            <div className="mt-5 flex flex-wrap items-center gap-2.5 sm:gap-3">
              <Link
                href={primaryCtaHref}
                className="btn-primary-gradient inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white no-underline transition-all duration-200 active:-translate-y-[1px] active:scale-[0.98]"
              >
                {dict.hero.ctaPrimary}
                <ArrowRight size={16} weight="bold" />
              </Link>
              <Link
                href={`/${locale}/pilot-protocol`}
                className="inline-flex items-center gap-2 rounded-full border border-neutral-300/90 bg-white/95 px-5 py-3 text-sm font-semibold text-ink no-underline transition-all duration-200 hover:border-neutral-400 hover:bg-neutral-50 active:-translate-y-[1px] active:scale-[0.98]"
              >
                {dict.hero.ctaSecondary}
              </Link>
            </div>

            {/* Metric chips */}
            <div className="mt-4 grid max-w-[62ch] grid-cols-1 gap-1.5 sm:grid-cols-3 sm:gap-2">
              {dict.hero.bullets.map((bullet) => (
                <span
                  key={bullet.metric}
                  className="inline-flex min-w-0 items-baseline gap-1.5 rounded-full border border-neutral-200/75 bg-white/95 px-3 py-1.5 text-[11px] leading-none shadow-[0_10px_20px_-18px_rgba(32,24,4,0.35)]"
                >
                  <strong className="shrink-0 font-bold text-brass">{bullet.metric}</strong>
                  <span className="truncate text-neutral-500">{bullet.text}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Right column */}
          <div className="relative hidden min-h-0 md:block">
            <div className="mx-auto w-full max-w-[540px] rounded-[2rem] border border-neutral-200/70 bg-white p-3 shadow-[0_28px_60px_-40px_rgba(32,24,4,0.22)]">
              <HeroBentoPreview locale={locale} />
            </div>
          </div>
        </div>

        {/* Bottom trust rail */}
        <div className="relative mt-4">
          <div className="flex flex-col items-start gap-2.5 rounded-2xl border border-neutral-200/75 bg-white px-3 py-2.5 shadow-[0_18px_30px_-28px_rgba(32,24,4,0.18)] sm:px-4 sm:py-3 lg:flex-row lg:items-center lg:gap-4">
            {/* Euratechnologies badge */}
            <div className="inline-flex shrink-0 items-center gap-x-2 rounded-xl border border-amber-200/65 bg-amber-50/35 px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
              <Image
                src="/partners/euratechnologies-logo-black.svg"
                alt="Logo Euratechnologies"
                width={150}
                height={28}
                className="h-4 w-auto"
                priority
              />
              <span className="border-l border-amber-200/60 pl-2 text-[10px] font-semibold tracking-[0.03em] text-neutral-500">
                {incubatorLabel}
              </span>
            </div>

            {/* Trust badges */}
            <div className="hidden h-4 w-px bg-neutral-200/70 lg:block" />
            <ul className="grid grid-cols-1 gap-x-4 gap-y-0.5 sm:grid-cols-2 xl:grid-cols-3">
              {dict.hero.trustBadges.map((badge, index) => (
                <li
                  key={badge}
                  className={`${index > 2 ? "hidden sm:flex" : "flex"} items-center gap-1.5 text-[10px] leading-snug text-neutral-500`}
                >
                  <ShieldCheck
                  size={11}
                  weight="fill"
                  className="shrink-0 text-amber-400"
                />
                <span>{badge}</span>
              </li>
            ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
