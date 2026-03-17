import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import type { Locale } from "../../lib/i18n/config";
import {
  listSectorPages,
  getSectorPageHref,
} from "../../lib/content/sector-pages";
import { SectionShellV2 } from "../shared/SectionShellV2";
import { Kicker } from "../shared/Kicker";

interface SectorCardsSectionProps {
  locale: Locale;
}

export function SectorCardsSection({ locale }: SectorCardsSectionProps) {
  const sectors = listSectorPages(locale).slice(0, 4);
  const kicker = locale === "fr" ? "Secteurs" : "Industries";
  const heading =
    locale === "fr"
      ? "Une solution adaptée à votre secteur."
      : "A solution tailored to your industry.";

  return (
    <SectionShellV2 id="secteurs">
      <Kicker>{kicker}</Kicker>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink-950 md:text-4xl">
        {heading}
      </h2>

      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {sectors.map((sector) => (
          <Link
            key={sector.id}
            href={getSectorPageHref(locale, sector.id)}
            className="light-card group flex flex-col justify-between rounded-card border border-v2-border-200 bg-surface-0 p-6 no-underline transition-transform duration-300 hover:-translate-y-1"
          >
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-ink-950">
                {sector.shortLabel}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">
                {sector.homepageHook}
              </p>
              {sector.homepageStat ? (
                <p className="mt-3 font-mono text-sm text-proof-500">
                  {sector.homepageStat}
                </p>
              ) : null}
            </div>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-950 transition-colors group-hover:text-proof-500">
              {locale === "fr" ? "Explorer" : "Explore"}
              <ArrowRight
                size={14}
                weight="bold"
                className="transition-transform duration-200 group-hover:translate-x-1"
              />
            </span>
          </Link>
        ))}
      </div>
    </SectionShellV2>
  );
}
