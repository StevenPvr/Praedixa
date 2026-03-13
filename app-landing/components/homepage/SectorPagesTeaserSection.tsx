import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import type { Locale } from "../../lib/i18n/config";
import {
  listSectorPages,
  getSectorPageHref,
} from "../../lib/content/sector-pages";
import { Kicker } from "../shared/Kicker";
import { SectionShell } from "../shared/SectionShell";

interface SectorPagesTeaserSectionProps {
  locale: Locale;
}

const copy = {
  fr: {
    kicker: "Solutions par secteur",
    heading: "Quatre secteurs. Un même moteur de décision.",
    subheading:
      "Praedixa n'est pas limité au staffing. Nous commençons par le risque le plus coûteux de chaque réseau, qu'il touche les effectifs, la demande, les stocks, les approvisionnements ou la rétention.",
    cta: "Voir le cas sectoriel",
  },
  en: {
    kicker: "Solutions by industry",
    heading: "Four sectors. One decision engine.",
    subheading:
      "Praedixa is not limited to staffing. We start with the most costly risk in each network, whether it touches staffing, demand, inventory, supply, or retention.",
    cta: "See the industry case",
  },
} as const;

export function SectorPagesTeaserSection({
  locale,
}: SectorPagesTeaserSectionProps) {
  const sectors = listSectorPages(locale);
  const c = copy[locale];

  return (
    <SectionShell className="py-12 md:py-16">
      <div className="rounded-[2.25rem] border border-neutral-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(249,246,239,0.94)_100%)] p-6 shadow-[0_34px_90px_-64px_rgba(15,23,42,0.42)] md:p-8 lg:p-10">
        <div className="max-w-3xl">
          <Kicker>{c.kicker}</Kicker>
          <h2 className="mt-4 text-4xl font-semibold leading-[1.02] tracking-tighter text-ink md:text-5xl">
            {c.heading}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-neutral-600 md:text-lg">
            {c.subheading}
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {sectors.map((sector) => {
            const Icon = sector.icon;
            return (
              <article
                key={sector.id}
                className="group rounded-[1.7rem] border border-neutral-200/80 bg-white/94 p-5 shadow-[0_22px_50px_-42px_rgba(15,23,42,0.28)] transition-all duration-200 hover:-translate-y-1 hover:border-amber-300/70 hover:shadow-[0_30px_65px_-45px_rgba(15,23,42,0.35)]"
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-brass">
                  <Icon size={22} />
                </div>
                <h3 className="mt-5 text-xl font-semibold tracking-tight text-ink">
                  {sector.title}
                </h3>
                <p className="mt-3 text-sm font-semibold leading-relaxed text-neutral-800">
                  {sector.homepageHook}
                </p>
                <p className="mt-4 text-sm leading-relaxed text-neutral-600">
                  {sector.homepageProblem}
                </p>
                <div className="mt-5 rounded-[1.25rem] border border-neutral-200/80 bg-neutral-50/70 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">
                    {locale === "fr" ? "Preuve chiffrée" : "Proof point"}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-700">
                    {sector.homepageStat}
                  </p>
                </div>
                <Link
                  href={getSectorPageHref(locale, sector.id)}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brass no-underline transition-colors hover:text-brass-700"
                >
                  {c.cta}
                  <ArrowRight
                    size={16}
                    weight="bold"
                    className="transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </SectionShell>
  );
}
