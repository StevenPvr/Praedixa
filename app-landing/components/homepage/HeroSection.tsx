import Image from "next/image";
import { PraedixaLogo } from "@praedixa/ui";
import {
  buildContactIntentHref,
  getLocalizedPath,
  type Locale,
} from "../../lib/i18n/config";
import type { Dictionary } from "../../lib/i18n/types";
import { getValuePropContent } from "../../lib/content/value-prop";
import { heroIndustryMontageMedia } from "../../lib/media/hero-industries";
import { MagneticActionLink } from "../shared/motion/MagneticActionLink";
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

function HeroManifestoPanel({
  copy,
  hasManifestoLabel,
  heroChrome,
  heroManifestoBridge,
  trustBadges,
}: {
  copy: {
    manifestoLabel: string;
    manifestoQuote: string;
    pillars: Dictionary["hero"]["bullets"];
  };
  hasManifestoLabel: boolean;
  heroChrome: { shelfEyebrow: string };
  heroManifestoBridge: string;
  trustBadges: string[];
}) {
  const manifestoHeadingClassName = `${hasManifestoLabel ? "mt-3" : "mt-0"} max-w-[30ch] text-[1.7rem] font-semibold leading-[1.08] tracking-[-0.03em] text-ink sm:text-[2rem] lg:text-[2.35rem]`;

  return (
    <section className="relative z-10 -mt-10 pb-10 md:-mt-14 md:pb-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] border border-neutral-200/75 bg-[rgba(249,246,239,0.94)] shadow-[0_40px_120px_-64px_rgba(2,6,23,0.72)] backdrop-blur-xl">
          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(280px,0.92fr)] lg:gap-10 lg:p-12">
            <HeroManifestoBody
              bridge={heroManifestoBridge}
              copy={copy}
              hasManifestoLabel={hasManifestoLabel}
              headingClassName={manifestoHeadingClassName}
            />
            <HeroTrustShelf
              shelfEyebrow={heroChrome.shelfEyebrow}
              trustBadges={trustBadges}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroManifestoBody({
  bridge,
  copy,
  hasManifestoLabel,
  headingClassName,
}: {
  bridge: string;
  copy: {
    manifestoLabel: string;
    manifestoQuote: string;
    pillars: Dictionary["hero"]["bullets"];
  };
  hasManifestoLabel: boolean;
  headingClassName: string;
}) {
  return (
    <div className="max-w-[60ch]">
      {hasManifestoLabel ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass-700">
          {copy.manifestoLabel}
        </p>
      ) : null}
      <p className={headingClassName}>{copy.manifestoQuote}</p>
      <p className="mt-6 max-w-[58ch] text-base leading-relaxed text-neutral-700 md:text-lg">
        {bridge}
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
  );
}

function HeroTrustShelf({
  shelfEyebrow,
  trustBadges,
}: {
  shelfEyebrow: string;
  trustBadges: string[];
}) {
  return (
    <div className="lg:pl-6">
      <div className="rounded-[1.65rem] border border-neutral-200/85 bg-white/72 p-5 shadow-[0_22px_50px_-38px_rgba(15,23,42,0.24),inset_0_1px_0_rgba(255,255,255,0.9)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass-700">
          {shelfEyebrow}
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
  );
}

function HeroOfferDescriptor({
  offer,
}: {
  offer: {
    badge: string;
    title: string;
    body: string;
    note: string;
  };
}) {
  return (
    <div className="mt-8 max-w-[60ch] rounded-[1.7rem] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.09)_0%,rgba(255,255,255,0.05)_100%)] p-4 shadow-[0_28px_72px_-50px_rgba(2,6,23,0.86),inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-xl sm:p-5">
      <div className="grid gap-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:gap-5">
        <div className="md:pr-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brass-dark-700)]">
            {offer.badge}
          </p>
          <p className="mt-3 text-lg font-semibold tracking-[-0.03em] text-white sm:text-[1.15rem]">
            {offer.title}
          </p>
        </div>
        <div className="border-t border-white/10 pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0">
          <p className="text-sm leading-relaxed text-[rgba(255,255,255,0.8)]">
            {offer.body}
          </p>
          <p className="mt-3 text-xs leading-relaxed text-[rgba(244,231,198,0.9)]">
            {offer.note}
          </p>
        </div>
      </div>
    </div>
  );
}

function HeroBrandSignature() {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.08)_100%)] px-8 py-7 shadow-[0_38px_90px_-54px_rgba(2,6,23,0.86),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-xl">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_28%_24%,rgba(244,231,198,0.2),transparent_36%),radial-gradient(circle_at_74%_78%,rgba(255,255,255,0.08),transparent_42%)]"
      />
      <div className="relative inline-flex items-center gap-4">
        <span className="relative inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/18 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(244,231,198,0.16),transparent_68%)]"
          />
          <PraedixaLogo
            size={30}
            color="rgba(255,255,255,0.98)"
            className="relative"
          />
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgba(244,231,198,0.82)]">
            Decision intelligence
          </p>
          <span className="mt-1 block text-[2rem] font-semibold tracking-[-0.06em] text-white [text-shadow:0_16px_42px_rgba(2,6,23,0.58)]">
            Praedixa
          </span>
        </div>
      </div>
    </div>
  );
}

function HeroBrandRail() {
  return (
    <div className="relative w-full max-w-[25rem] xl:max-w-[27rem]">
      <div
        aria-hidden="true"
        className="absolute -left-10 top-8 h-44 w-44 rounded-full bg-[radial-gradient(circle_at_center,rgba(244,231,198,0.16),transparent_72%)] blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute inset-y-10 left-5 w-px bg-[linear-gradient(180deg,rgba(255,255,255,0),rgba(255,255,255,0.22),rgba(255,255,255,0))]"
      />
      <div className="relative ml-auto flex min-h-[20rem] items-center justify-end pl-8">
        <span
          aria-hidden="true"
          className="absolute right-4 top-1/2 h-28 w-28 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_74%)] blur-3xl"
        />
        <HeroBrandSignature />
      </div>
    </div>
  );
}

export function HeroSection({ locale, dict }: HeroSectionProps) {
  const isFr = locale === "fr";
  const hero = dict.hero;
  const valueProp = getValuePropContent(locale);
  const copy = {
    kicker: valueProp.heroKicker,
    heading: valueProp.heroHeading,
    headingHighlight: valueProp.heroHeadingHighlight,
    subtitle: valueProp.heroSubheading,
    offer: valueProp.heroOffer,
    manifestoLabel: hero.manifestoLabel,
    manifestoQuote: hero.manifestoQuote,
    pillars: hero.bullets,
    ctaPrimary: valueProp.ctaPrimary,
    ctaSecondary: valueProp.ctaSecondary,
    trustBadges: valueProp.reassurance,
  };

  const exampleHref = getLocalizedPath(locale, "decisionLogProof");
  const scopingHref = buildContactIntentHref(locale, "deployment");
  const hasManifestoLabel = copy.manifestoLabel.trim().length > 0;
  const heroKickerLabel = copy.kicker;
  const heroChrome = isFr
    ? {
        shelfEyebrow: "Ce qu’un acheteur peut vérifier maintenant",
      }
    : {
        shelfEyebrow: "What a buyer can verify now",
      };

  const heroTrustBadges = copy.trustBadges.slice(0, 4);
  const heroManifestoBridge = isFr
    ? "Praedixa resserre l’entrée sur un premier arbitrage coûteux à objectiver, sur vos données existantes, avec une lecture exploitable par Ops et Finance avant toute montée en charge."
    : "Praedixa narrows the entry point to one costly trade-off worth objectifying, on top of your existing data, with an Ops-and-Finance-readable frame before any broader rollout.";

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

        <div className="relative mx-auto grid min-h-[calc(100dvh-var(--header-h))] max-w-7xl items-center gap-10 px-4 pb-8 pt-14 sm:px-6 md:pb-10 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.64fr)] lg:gap-12 lg:px-8 lg:pb-14 xl:grid-cols-[minmax(0,0.96fr)_minmax(320px,0.72fr)] xl:gap-16">
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

              <h1 className="mt-3 max-w-[11ch] text-[3.9rem] font-semibold leading-[0.88] tracking-[-0.065em] text-white sm:text-[5rem] lg:text-[6.3rem]">
                {copy.heading}
              </h1>

              <p className="mt-4 max-w-[20ch] text-[2.1rem] font-semibold leading-[0.93] tracking-[-0.05em] text-[rgba(255,255,255,0.92)] [text-shadow:0_12px_36px_rgba(2,6,23,0.3)] sm:max-w-[21ch] sm:text-[2.9rem] lg:max-w-[20ch] lg:text-[4rem]">
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

              <HeroOfferDescriptor offer={copy.offer} />

              <div className="mt-8 flex flex-col gap-3.5 sm:flex-row sm:flex-wrap sm:items-center">
                <MagneticActionLink
                  href={exampleHref}
                  label={copy.ctaPrimary}
                  wrapperClassName="sm:w-auto"
                  className="rounded-full border-white/70 bg-white px-6 text-neutral-950 shadow-[0_30px_72px_-42px_rgba(2,6,23,0.82)] hover:border-white hover:bg-amber-50 hover:shadow-[0_38px_90px_-48px_rgba(2,6,23,0.9)] sm:w-auto"
                />
                <MagneticActionLink
                  href={scopingHref}
                  label={copy.ctaSecondary}
                  wrapperClassName="sm:w-auto"
                  className="rounded-full border-white/16 bg-white/[0.05] px-6 text-white hover:border-white/28 hover:bg-white/[0.1] sm:w-auto"
                />
              </div>
            </div>
          </div>

          <div className="hidden lg:flex lg:min-h-full lg:items-center lg:justify-end">
            <HeroBrandRail />
          </div>
        </div>
      </section>

      <HeroManifestoPanel
        copy={copy}
        hasManifestoLabel={hasManifestoLabel}
        heroChrome={heroChrome}
        heroManifestoBridge={heroManifestoBridge}
        trustBadges={heroTrustBadges}
      />
    </>
  );
}
