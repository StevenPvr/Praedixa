import {
  ArrowDown,
  ArrowUpRight,
  ShieldCheck,
  Sparkle,
} from "@phosphor-icons/react/dist/ssr";
import { HeroSignalBoard } from "./HeroSignalBoard";
import type { Dictionary } from "../../lib/i18n/types";
import type { Locale } from "../../lib/i18n/config";
import { localizedSlugs } from "../../lib/i18n/config";

interface HeroSectionProps {
  dict: Dictionary;
  locale: Locale;
}

export function HeroSection({ dict, locale }: HeroSectionProps) {
  const { hero } = dict;
  const pilotHref = `/${locale}/${localizedSlugs.pilot[locale]}`;
  const protocolHref = `/${locale}/pilot-protocol`;

  return (
    <section
      id="hero"
      className="relative flex min-h-[100dvh] items-center overflow-hidden pt-20 md:pt-24"
    >
      <div className="section-shell">
        <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-[1.4fr_1fr] md:gap-16 lg:gap-20">
          <div>
            <p className="section-kicker">
              <Sparkle size={12} weight="fill" />
              {hero.kicker}
            </p>

            <h1 className="mt-4 text-4xl font-bold leading-[0.98] tracking-[-0.045em] text-[var(--ink)] sm:text-5xl md:text-[4.5rem] lg:text-[5.25rem]">
              {hero.headline}
              <span className="block text-[var(--accent-600)]">
                {hero.headlineHighlight}
              </span>
            </h1>

            <p className="hero-subtitle-lcp text-body mt-6 font-[ui-sans-serif,system-ui,-apple-system,sans-serif]">
              {hero.subtitle}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a href={pilotHref} className="btn-primary">
                <Sparkle size={15} weight="fill" />
                {hero.ctaPrimary}
                <ArrowUpRight size={16} weight="bold" />
              </a>

              <a href={protocolHref} className="btn-secondary group/cta2">
                {hero.ctaSecondary}
                <span className="inline-block transition-transform duration-300 group-hover/cta2:translate-y-0.5">
                  <ArrowDown size={14} weight="bold" />
                </span>
              </a>
            </div>

            <ul
              role="list"
              className="mt-10 flex flex-wrap items-center gap-x-1 gap-y-1.5 text-xs text-[var(--ink-muted)]"
            >
              <li className="inline-flex shrink-0">
                <ShieldCheck
                  size={13}
                  weight="duotone"
                  className="text-[var(--accent-600)]"
                />
              </li>
              {hero.trustBadges.map((badge, i) => (
                <li key={badge} className="inline-flex items-center gap-1">
                  {i > 0 && (
                    <span
                      className="mx-1 text-[var(--line-strong)]"
                      aria-hidden="true"
                    >
                      ·
                    </span>
                  )}
                  {badge}
                </li>
              ))}
            </ul>
          </div>

          <div className="hero-board-glow relative">
            <HeroSignalBoard />
          </div>
        </div>
      </div>
    </section>
  );
}
