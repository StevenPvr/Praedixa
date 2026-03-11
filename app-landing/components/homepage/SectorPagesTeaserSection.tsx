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
    heading: "4 verticales nettes. Une même boucle de décision.",
    subheading:
      "Praedixa ne vend pas un outil de planning generique. Chaque verticale exprime une douleur d'effectif differente, mais la meme boucle DecisionOps: federer les systemes utiles, predire, arbitrer, declencher, prouver le ROI.",
    cta: "Voir la verticale",
  },
  en: {
    kicker: "Solutions by industry",
    heading: "Four clear verticals. One decision loop.",
    subheading:
      "Praedixa does not sell a generic scheduling tool. Each industry expresses a different staffing problem, but the same DecisionOps loop: federate the useful systems, predict needs, compare actions, trigger the first move, prove ROI.",
    cta: "View industry page",
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
