import Image from "next/image";
import {
  buildContactIntentHref,
  getLocalizedPath,
} from "../../lib/i18n/config";
import type { Locale } from "../../lib/i18n/config";
import { getValuePropContent } from "../../lib/content/value-prop";
import { heroIndustryMontageMedia } from "../../lib/media/hero-industries";
import { ButtonPrimary } from "../shared/v2/ButtonPrimary";
import { ButtonSecondary } from "../shared/v2/ButtonSecondary";
import { ChipV2 } from "../shared/v2/ChipV2";
import { CalendlyExpertLink } from "../shared/CalendlyExpertLink";
import { HeroV2Client } from "./HeroV2Client";

interface HeroV2SectionProps {
  locale: Locale;
}

export function HeroV2Section({ locale }: HeroV2SectionProps) {
  const vp = getValuePropContent(locale);

  const exampleHref = getLocalizedPath(locale, "decisionLogProof");
  const scopingHref = buildContactIntentHref(locale, "deployment");

  return (
    <section className="hero-dark relative isolate -mt-[var(--header-h)] overflow-hidden bg-ink-950">
      <div className="relative mx-auto flex min-h-[100dvh] max-w-content items-center px-4 pb-8 pt-[calc(var(--header-h)+3.5rem)] sm:px-6 lg:px-8 lg:pb-14">
        <div className="grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <HeroV2CopyColumn
            locale={locale}
            kicker={vp.heroKicker}
            heading={vp.heroHeading}
            headingHighlight={vp.heroHeadingHighlight}
            subheading={vp.heroSubheading}
            primaryHref={exampleHref}
            primaryLabel={vp.ctaPrimary}
            secondaryHref={scopingHref}
            secondaryLabel={vp.ctaSecondary}
            calendlyExpertLabel={vp.ctaCalendlyExpert}
            reassurance={vp.reassurance}
          />
          <HeroV2DesktopMedia />
          <HeroV2MobileCard />
        </div>
      </div>
    </section>
  );
}

function HeroV2CopyColumn({
  locale,
  kicker,
  heading,
  headingHighlight,
  subheading,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  calendlyExpertLabel,
  reassurance,
}: {
  locale: Locale;
  kicker: string;
  heading: string;
  headingHighlight: string;
  subheading: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
  calendlyExpertLabel: string;
  reassurance: string[];
}) {
  return (
    <div className="py-6 lg:py-10">
      <HeroV2Eyebrow kicker={kicker} />
      <h1 className="mt-5 text-[2.5rem] font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:text-[3.5rem] lg:text-[4rem]">
        {heading}
        <br />
        <span className="text-signal-500">{headingHighlight}</span>
      </h1>
      <p className="mt-6 max-w-[50ch] text-base leading-relaxed text-[rgba(255,255,255,0.74)] md:text-lg">
        {subheading}
      </p>
      <HeroV2Actions
        locale={locale}
        primaryHref={primaryHref}
        primaryLabel={primaryLabel}
        secondaryHref={secondaryHref}
        secondaryLabel={secondaryLabel}
        calendlyExpertLabel={calendlyExpertLabel}
      />
      <HeroV2ProofChips items={reassurance} />
    </div>
  );
}

function HeroV2Eyebrow({ kicker }: { kicker: string }) {
  return (
    <div className="inline-flex items-center gap-2.5 rounded-full border border-white/[0.14] bg-white/[0.08] px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgba(255,255,255,0.82)] backdrop-blur-md">
      <span
        className="h-1.5 w-1.5 rounded-full bg-signal-500 shadow-[0_0_12px_rgba(214,245,109,0.35)]"
        aria-hidden="true"
      />
      {kicker}
    </div>
  );
}

function HeroV2Actions({
  locale,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  calendlyExpertLabel,
}: {
  locale: Locale;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
  calendlyExpertLabel: string;
}) {
  return (
    <div className="mt-10 flex flex-col gap-3.5">
      <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center">
        <ButtonPrimary href={primaryHref} label={primaryLabel} />
        <ButtonSecondary
          href={secondaryHref}
          label={secondaryLabel}
          className="border-white/20 bg-white/[0.06] text-white hover:border-white/30 hover:bg-white/[0.1]"
        />
      </div>
      <CalendlyExpertLink
        locale={locale}
        label={calendlyExpertLabel}
        className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-[rgba(255,255,255,0.78)] underline decoration-white/25 underline-offset-4 transition-colors hover:text-white hover:decoration-white/50 focus-visible:rounded focus-visible:ring-2 focus-visible:ring-signal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 focus-visible:outline-none"
      />
    </div>
  );
}

function HeroV2ProofChips({ items }: { items: string[] }) {
  return (
    <div className="mt-8 flex flex-wrap gap-2">
      {items.map((item) => (
        <ChipV2
          key={item}
          variant="neutral"
          label={item}
          className="border-white/10 bg-white/[0.06] text-[rgba(255,255,255,0.72)]"
        />
      ))}
    </div>
  );
}

function HeroV2DesktopMedia() {
  return (
    <div className="relative hidden lg:block">
      <HeroV2MediaFrame />
    </div>
  );
}

function HeroV2MediaFrame() {
  return (
    <div className="relative h-[620px] w-full overflow-hidden rounded-panel shadow-3">
      <Image
        src={heroIndustryMontageMedia.poster}
        alt=""
        fill
        priority
        unoptimized
        sizes="(min-width: 1024px) 50vw, 100vw"
        className="object-cover"
      />
      <HeroV2Client
        poster={heroIndustryMontageMedia.poster}
        videoSrc={heroIndustryMontageMedia.mp4Src}
      />
      <div className="absolute inset-0 bg-black/[0.22]" aria-hidden="true" />
    </div>
  );
}

function HeroV2MobileCard() {
  return null;
}
