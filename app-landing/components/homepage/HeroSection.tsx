import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import type { Locale } from "../../lib/i18n/config";
import { getLocalizedPath } from "../../lib/i18n/config";
import {
  getSectorPageHref,
  listSectorPages,
} from "../../lib/content/sector-pages";
import { heroIndustryMontageMedia } from "../../lib/media/hero-industries";
import type { Dictionary } from "../../lib/i18n/types";
import { HeroBackgroundVideo } from "./HeroBackgroundVideo";

interface HeroSectionProps {
  locale: Locale;
  dict: Dictionary;
}

const heroKickerSegments = [
  "RH",
  "FINANCE",
  "OPÉRATIONS",
  "SUPPLY CHAIN",
] as const;
const heroProofClaims = [
  "Entreprise française",
  "Données hébergées en France sur Scaleway",
] as const;
const heroAccentClass =
  "text-[var(--brass-dark-700)] [text-shadow:0_0_20px_rgba(244,231,198,0.16)]";
const heroProofClaimClass =
  "inline-flex min-h-[2.25rem] w-full items-center justify-center rounded-full border border-[rgba(244,231,198,0.2)] bg-[rgba(244,231,198,0.08)] px-3 py-1.5 text-center text-[11px] font-semibold text-[var(--brass-dark-700)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]";

function renderHeadlineWithAccents(text: string, keywords: readonly string[]) {
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
      <span key={`${part}-${index}`} className={heroAccentClass}>
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
    microcopy: hero.ctaMeta,
    trustBadges: hero.trustBadges,
    industriesLabel: isFr ? "Solutions par secteur" : "Solutions by industry",
  };

  const auditHref = `${getLocalizedPath(locale, "contact")}?intent=audit`;
  const secondaryHref = isFr
    ? getLocalizedPath(locale, "howItWorksPage")
    : getLocalizedPath(locale, "pilot");
  const hasManifestoLabel = copy.manifestoLabel.trim().length > 0;
  const heroKickerLabel = isFr ? heroKickerSegments.join(" · ") : copy.kicker;
  const showFrenchProofRail = isFr;
  const hasMicrocopy = copy.microcopy.trim().length > 0;
  const industries = listSectorPages(locale).map((sector) => ({
    href: getSectorPageHref(locale, sector.id),
    label: sector.shortLabel,
    icon: sector.icon,
  }));

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
            mp4Src={heroIndustryMontageMedia.mp4Src}
          />
          <div className="absolute inset-0 bg-[linear-gradient(112deg,rgba(2,6,23,0.68)_12%,rgba(2,6,23,0.24)_48%,rgba(2,6,23,0.6)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_18%,rgba(250,204,21,0.1),transparent_26%),radial-gradient(circle_at_18%_82%,rgba(255,255,255,0.04),transparent_32%)]" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(180deg,transparent,rgba(2,6,23,0.56))]" />
        </div>

        <div className="relative mx-auto flex min-h-[calc(100dvh-var(--header-h))] max-w-7xl flex-col justify-center px-4 pb-8 pt-14 sm:px-6 md:pb-10 lg:px-8 lg:pb-16">
          <div className="max-w-3xl md:-translate-y-8 lg:-translate-y-12">
            <div
              aria-label={heroKickerLabel}
              className="inline-flex flex-wrap items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/78 shadow-[0_18px_40px_-34px_rgba(2,6,23,0.8)] backdrop-blur-md"
            >
              <span
                className="h-1.5 w-1.5 rounded-full bg-[var(--brass-dark-600)] shadow-[0_0_12px_rgba(244,231,198,0.35)]"
                aria-hidden="true"
              />
              {isFr ? (
                <span className="flex flex-wrap items-center gap-1.5">
                  {heroKickerSegments.map((segment, index) => (
                    <span
                      key={segment}
                      className="inline-flex items-center gap-1.5"
                    >
                      {index > 0 ? (
                        <span
                          className="text-[color:rgba(244,231,198,0.42)]"
                          aria-hidden="true"
                        >
                          ·
                        </span>
                      ) : null}
                      <span className="text-[var(--brass-dark-700)] [text-shadow:0_0_18px_rgba(244,231,198,0.14)]">
                        {segment}
                      </span>
                    </span>
                  ))}
                </span>
              ) : (
                copy.kicker
              )}
            </div>

            <h1 className="mt-7 max-w-[15ch] text-5xl font-semibold leading-[0.9] tracking-[-0.05em] text-white sm:text-6xl lg:text-[5.35rem]">
              {isFr
                ? renderHeadlineWithAccents(copy.heading, ["données"])
                : copy.heading}
              <span className="mt-2 block text-white/76">
                {isFr
                  ? renderHeadlineWithAccents(copy.headingHighlight, [
                      "Décidez",
                      "Prouvez",
                    ])
                  : copy.headingHighlight}
              </span>
            </h1>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={auditHref}
                className="group inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-white px-6 py-3 text-sm font-semibold text-neutral-950 no-underline shadow-[0_26px_56px_-36px_rgba(2,6,23,0.7)] transition-all duration-300 [transition-timing-function:var(--ease-snappy)] hover:bg-amber-50 hover:shadow-[0_32px_70px_-38px_rgba(2,6,23,0.78)] active:translate-y-[1px] active:scale-[0.98]"
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
                href={secondaryHref}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-white/18 bg-white/10 px-6 py-3 text-sm font-semibold text-white no-underline shadow-[0_18px_40px_-34px_rgba(2,6,23,0.72)] backdrop-blur-sm transition-all duration-300 [transition-timing-function:var(--ease-snappy)] hover:border-white/28 hover:bg-white/16 active:translate-y-[1px] active:scale-[0.98]"
              >
                {copy.ctaSecondary}
              </Link>
            </div>

            {hasMicrocopy ? (
              <p className="mt-4 text-xs font-medium text-white">
                {copy.microcopy}
              </p>
            ) : null}
          </div>

          {showFrenchProofRail ? (
            <div className="mt-10 rounded-[1.65rem] border border-[rgba(244,231,198,0.16)] bg-[linear-gradient(180deg,rgba(244,231,198,0.1)_0%,rgba(244,231,198,0.06)_100%)] px-4 py-3 shadow-[0_24px_60px_-42px_rgba(2,6,23,0.86),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md">
              <div
                className="grid w-full grid-cols-3 gap-2 md:gap-3"
                aria-label="Preuves d'ancrage français"
              >
                {heroProofClaims.map((claim) => (
                  <span key={claim} className={heroProofClaimClass}>
                    {claim}
                  </span>
                ))}
                <span
                  aria-label="Incubée à Euratechnologies"
                  className={`${heroProofClaimClass} gap-2.5`}
                >
                  <span className="whitespace-nowrap text-[11px] font-semibold text-[var(--brass-dark-700)]">
                    Incubée à
                  </span>
                  <Image
                    src="/logos/euratechnologies-wordmark-white.png"
                    alt="Euratechnologies"
                    width={217}
                    height={35}
                    className="h-[0.95rem] w-auto max-w-none shrink-0 object-contain opacity-95"
                  />
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="relative z-10 -mt-10 pb-10 md:-mt-14 md:pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-[2rem] border border-neutral-200/75 bg-[rgba(249,246,239,0.94)] shadow-[0_40px_120px_-64px_rgba(2,6,23,0.72)] backdrop-blur-xl">
            <div className="p-6 sm:p-8 lg:p-12">
              <div className="max-w-5xl">
                {hasManifestoLabel ? (
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass-700">
                    {copy.manifestoLabel}
                  </p>
                ) : null}
                <blockquote
                  className={`${hasManifestoLabel ? "mt-3" : "mt-0"} max-w-[22ch] text-3xl font-semibold leading-[1.04] tracking-[-0.04em] text-ink sm:text-[2.6rem] lg:text-[3.2rem]`}
                >
                  “{copy.manifestoQuote}”
                </blockquote>
                <p className="mt-6 max-w-[58ch] text-base leading-relaxed text-neutral-700 md:text-lg">
                  {copy.subtitle}
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  {copy.pillars.map((pillar) => (
                    <div
                      key={pillar.metric}
                      className="rounded-[1.35rem] border border-neutral-200/80 bg-white/72 px-4 py-4 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.28)] backdrop-blur"
                    >
                      <p className="text-sm font-semibold tracking-tight text-ink">
                        {pillar.metric}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-neutral-600">
                        {pillar.text}
                      </p>
                    </div>
                  ))}
                </div>

                <nav
                  aria-label={copy.industriesLabel}
                  className="mt-8 flex flex-wrap gap-2"
                >
                  {industries.map((industry) => {
                    const Icon = industry.icon;
                    return (
                      <Link
                        key={industry.label}
                        href={industry.href}
                        className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200/80 bg-white/78 px-3 py-1.5 text-[11px] font-semibold text-neutral-600 no-underline backdrop-blur transition-all duration-200 [transition-timing-function:var(--ease-snappy)] hover:border-neutral-300 hover:bg-white hover:text-ink active:scale-[0.98]"
                      >
                        <Icon size={13} weight="bold" aria-hidden="true" />
                        {industry.label}
                      </Link>
                    );
                  })}
                </nav>

                {hasMicrocopy ? (
                  <div className="mt-8 rounded-[1.5rem] border border-neutral-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.85)_0%,rgba(255,255,255,0.65)_100%)] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                    <p className="text-sm leading-relaxed text-neutral-700">
                      {copy.microcopy}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
