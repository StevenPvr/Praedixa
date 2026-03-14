import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import { getLocalizedPath } from "../../lib/i18n/config";
import type { Locale } from "../../lib/i18n/config";
import type { Dictionary } from "../../lib/i18n/types";
import { heroIndustryMontageMedia } from "../../lib/media/hero-industries";
import { HeroBackgroundVideo } from "./HeroBackgroundVideo";

interface HeroSectionProps {
  locale: Locale;
  dict: Dictionary;
}

const heroKickerAccentClass =
  "text-[var(--brass-dark-700)] [text-shadow:0_0_20px_rgba(244,231,198,0.16)]";
const heroHeadlineAccentClass =
  "font-bold text-[var(--brass-400)] [text-shadow:0_10px_26px_rgba(148,110,20,0.24)]";

function renderHeadlineWithAccents(
  text: string,
  keywords: readonly string[],
  accentClassName: string,
) {
  if (keywords.length === 0) {
    return text;
  }

  const uniqueKeywords = [...new Set(keywords)].filter((keyword) =>
    text.includes(keyword),
  );

  if (uniqueKeywords.length === 0) {
    return text;
  }

  const pattern = new RegExp(
    `(${uniqueKeywords
      .map((keyword) => keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|")})`,
    "g",
  );

  return text.split(pattern).map((part, index) =>
    uniqueKeywords.includes(part) ? (
      <span key={`${part}-${index}`} className={accentClassName}>
        {part}
      </span>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    ),
  );
}

export function HeroSection({ locale, dict }: HeroSectionProps) {
  const isFr = locale === "fr";
  const hero = dict.hero;
  const copy = {
    kicker: hero.kicker,
    heading: hero.headline,
    headingHighlight: hero.headlineHighlight,
    subtitle: hero.subtitle,
    manifestoLabel: hero.manifestoLabel,
    manifestoQuote: hero.manifestoQuote,
    pillars: hero.bullets,
    ctaPrimary: hero.ctaPrimary,
    ctaSecondary: hero.ctaSecondary,
    ctaTertiary: hero.ctaTertiary,
    microcopy: hero.ctaMeta,
    trustBadges: hero.trustBadges,
    industriesLabel: isFr ? "Solutions par secteur" : "Solutions by industry",
  };

  const exampleHref = getLocalizedPath(locale, "decisionLogProof");
  const deploymentHref = getLocalizedPath(locale, "deployment");
  const proofRequestHref = `${getLocalizedPath(locale, "contact")}?intent=proof`;
  const hasManifestoLabel = copy.manifestoLabel.trim().length > 0;
  const heroKickerLabel = copy.kicker;
  const heroSupportLine =
    copy.microcopy.trim().length > 0
      ? copy.microcopy
      : isFr
        ? "Lecture seule au démarrage · données agrégées · impact relu dans le temps"
        : "Read-only on your tools · human validation · impact reviewed over time";
  const heroChrome = isFr
    ? {
        kicker: "Réseaux multi-sites · arbitrages critiques · impact relu",
        shelfEyebrow: "Ce que Praedixa clarifie d’abord",
      }
    : {
        kicker: "Multi-site networks · critical trade-offs · impact reviewed",
        shelfEyebrow: "What Praedixa clarifies first",
      };

  const trustBadges = copy.trustBadges.slice(0, 4);
  const heroManifestoBridge = isFr
    ? "Praedixa entre par les arbitrages qui coûtent le plus vite: renforcer, réallouer, reporter ou ajuster le niveau de service avant que l’urgence ne décide à votre place."
    : "Praedixa starts with the trade-offs that get expensive fastest: reinforce, reallocate, postpone, or adjust the service level before urgency decides for you.";

  return (
    <>
      <section className="relative isolate min-h-[calc(100dvh-var(--header-h))] overflow-hidden bg-neutral-950">
        <div aria-hidden="true" className="absolute inset-0">
          <Image
            src={heroIndustryMontageMedia.poster}
            alt=""
            fill
            priority
            unoptimized
            sizes="100vw"
            className="object-cover"
          />
          <HeroBackgroundVideo
            key={heroIndustryMontageMedia.mp4Src}
            poster={heroIndustryMontageMedia.poster}
            src={heroIndustryMontageMedia.mp4Src}
          />
          <div className="absolute inset-0 bg-[linear-gradient(98deg,rgba(10,8,6,0.72)_4%,rgba(10,8,6,0.56)_28%,rgba(10,8,6,0.24)_52%,rgba(10,8,6,0.12)_74%,rgba(10,8,6,0.06)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_84%,rgba(244,231,198,0.08),transparent_28%)]" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(180deg,transparent,rgba(10,8,6,0.34))]" />
        </div>

        <div className="relative mx-auto flex min-h-[calc(100dvh-var(--header-h))] max-w-7xl items-center px-4 pb-8 pt-14 sm:px-6 md:pb-10 lg:px-8 lg:pb-14">
          <div className="flex min-h-full max-w-3xl flex-col justify-center py-4 lg:py-8">
            <div>
              <div
                aria-label={heroKickerLabel}
                className="inline-flex flex-wrap items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgba(255,255,255,0.78)] shadow-[0_18px_40px_-34px_rgba(2,6,23,0.8)] backdrop-blur-md"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full bg-[var(--brass-dark-600)] shadow-[0_0_12px_rgba(244,231,198,0.35)]"
                  aria-hidden="true"
                />
                <span className={isFr ? heroKickerAccentClass : undefined}>
                  {copy.kicker}
                </span>
              </div>

              <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgba(255,255,255,0.52)]">
                {heroChrome.kicker}
              </p>

              <h1 className="mt-3 max-w-[10ch] text-[3.9rem] font-semibold leading-[0.88] tracking-[-0.065em] text-white sm:text-[5rem] lg:text-[6.3rem]">
                {copy.heading}
              </h1>

              <p className="mt-4 max-w-[18ch] text-[2.2rem] font-semibold leading-[0.93] tracking-[-0.05em] text-[rgba(255,255,255,0.92)] [text-shadow:0_12px_36px_rgba(2,6,23,0.3)] sm:max-w-[19ch] sm:text-[3rem] lg:max-w-[18ch] lg:text-[4.1rem]">
                {isFr
                  ? renderHeadlineWithAccents(
                      copy.headingHighlight,
                      ["marge"],
                      heroHeadlineAccentClass,
                    )
                  : copy.headingHighlight}
              </p>

              <p className="mt-6 max-w-[58ch] text-base leading-relaxed text-[rgba(255,255,255,0.68)] md:text-lg">
                {copy.subtitle}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                <Link
                  href={exampleHref}
                  className="group inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-white px-6 py-3 text-sm font-semibold text-neutral-950 no-underline shadow-[0_30px_72px_-42px_rgba(2,6,23,0.82)] transition-all duration-300 [transition-timing-function:var(--ease-snappy)] hover:bg-amber-50 hover:shadow-[0_38px_90px_-48px_rgba(2,6,23,0.9)] active:translate-y-[1px] active:scale-[0.98]"
                >
                  {copy.ctaPrimary}
                  <span
                    aria-hidden="true"
                    className="transition-transform duration-200 [transition-timing-function:var(--ease-snappy)] group-hover:translate-x-0.5"
                  >
                    <ArrowRight size={16} weight="bold" />
                  </span>
                </Link>
                <Link
                  href={deploymentHref}
                  className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-white/18 bg-white/10 px-6 py-3 text-sm font-semibold text-white no-underline shadow-[0_18px_40px_-34px_rgba(2,6,23,0.72)] backdrop-blur-sm transition-all duration-300 [transition-timing-function:var(--ease-snappy)] hover:border-white/28 hover:bg-white/16 active:translate-y-[1px] active:scale-[0.98]"
                >
                  {copy.ctaSecondary}
                </Link>
                <Link
                  href={proofRequestHref}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[rgba(255,255,255,0.78)] no-underline transition-colors duration-200 hover:text-white"
                >
                  {copy.ctaTertiary}
                </Link>
              </div>

              <p className="mt-5 max-w-[56ch] text-sm font-medium tracking-[-0.01em] text-[rgba(255,255,255,0.56)]">
                {heroSupportLine}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 -mt-10 pb-10 md:-mt-14 md:pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-[2rem] border border-neutral-200/75 bg-[rgba(249,246,239,0.94)] shadow-[0_40px_120px_-64px_rgba(2,6,23,0.72)] backdrop-blur-xl">
            <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(280px,0.92fr)] lg:gap-10 lg:p-12">
              <div className="max-w-[60ch]">
                {hasManifestoLabel ? (
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass-700">
                    {copy.manifestoLabel}
                  </p>
                ) : null}
                <p
                  className={`${hasManifestoLabel ? "mt-3" : "mt-0"} max-w-[30ch] text-[1.7rem] font-semibold leading-[1.08] tracking-[-0.03em] text-ink sm:text-[2rem] lg:text-[2.35rem]`}
                >
                  {copy.manifestoQuote}
                </p>
                <p className="mt-6 max-w-[58ch] text-base leading-relaxed text-neutral-700 md:text-lg">
                  {heroManifestoBridge}
                </p>
                <ul className="mt-6 grid gap-3 sm:grid-cols-3">
                  {copy.pillars.map((pillar) => (
                    <li
                      key={`${pillar.metric}-${pillar.text}`}
                      className="rounded-[1.35rem] border border-neutral-200/85 bg-white/68 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]"
                    >
                      <p className="text-sm font-semibold tracking-[-0.02em] text-ink">
                        {pillar.metric}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-neutral-600">
                        {pillar.text}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="lg:pl-6">
                <div className="rounded-[1.65rem] border border-neutral-200/85 bg-white/72 p-5 shadow-[0_22px_50px_-38px_rgba(15,23,42,0.24),inset_0_1px_0_rgba(255,255,255,0.9)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass-700">
                    {heroChrome.shelfEyebrow}
                  </p>
                  <ul className="mt-4 divide-y divide-neutral-200/80">
                    {trustBadges.map((badge) => (
                      <li
                        key={badge}
                        className="py-3 text-sm leading-relaxed text-neutral-700 first:pt-0 last:pb-0"
                      >
                        {badge}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
