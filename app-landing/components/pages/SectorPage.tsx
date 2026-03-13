import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "@phosphor-icons/react/ssr";
import type { Locale } from "../../lib/i18n/config";
import { getLocalizedPath } from "../../lib/i18n/config";
import {
  getSectorDisplaySourceLinks,
  listSectorDifferentiationCards,
  type SectorPageEntry,
} from "../../lib/content/sector-pages";
import { PRAEDIXA_BASE_URL } from "../../lib/seo/entity";
import { serializeJsonForScriptTag } from "../../lib/security/json-script";
import { Kicker } from "../shared/Kicker";
import { SectionShell } from "../shared/SectionShell";

interface SectorPageProps {
  locale: Locale;
  entry: SectorPageEntry;
}

export function SectorPage({ locale, entry }: SectorPageProps) {
  const pilotHref = getLocalizedPath(locale, "deployment");
  const protocolHref = getLocalizedPath(locale, "deploymentProtocol");
  const displaySourceLinks = getSectorDisplaySourceLinks(entry);
  const differentiationCards = listSectorDifferentiationCards(locale);
  const canonicalPath =
    locale === "fr"
      ? `/fr/secteurs/${entry.slug}`
      : `/en/industries/${entry.slug}`;
  const canonicalUrl = `${PRAEDIXA_BASE_URL}${canonicalPath}`;
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Praedixa",
        item: `${PRAEDIXA_BASE_URL}/${locale}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: locale === "fr" ? "Secteurs" : "Industries",
        item:
          locale === "fr"
            ? `${PRAEDIXA_BASE_URL}/fr`
            : `${PRAEDIXA_BASE_URL}/en`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: entry.title,
        item: canonicalUrl,
      },
    ],
  };
  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: entry.metaTitle,
    description: entry.metaDescription,
    url: canonicalUrl,
    inLanguage: locale,
    mainEntity: {
      "@type": "Service",
      name: `Praedixa — ${entry.title}`,
      provider: {
        "@type": "Organization",
        name: "Praedixa",
        url: PRAEDIXA_BASE_URL,
      },
      description: entry.valuePropBody,
      areaServed: "France",
    },
  };
  const Icon = entry.icon;

  return (
    <>
      <SectionShell className="pb-12 pt-14 md:pb-16 md:pt-18">
        <article className="mx-auto max-w-6xl">
          <script
            id={`sector-breadcrumb-jsonld-${entry.id}`}
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: serializeJsonForScriptTag(breadcrumbJsonLd),
            }}
          />
          <script
            id={`sector-webpage-jsonld-${entry.id}`}
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: serializeJsonForScriptTag(webPageJsonLd),
            }}
          />

          <nav className="text-xs text-neutral-400" aria-label="Breadcrumb">
            <Link
              href={`/${locale}`}
              className="text-neutral-400 no-underline hover:text-ink"
            >
              Praedixa
            </Link>
            {" / "}
            <span className="text-neutral-600">{entry.title}</span>
          </nav>

          <div className="mt-6 overflow-hidden rounded-[2.3rem] border border-neutral-200/85 bg-[linear-gradient(140deg,rgba(255,255,255,0.98)_0%,rgba(247,241,227,0.96)_58%,rgba(255,255,255,0.98)_100%)] shadow-[0_40px_120px_-72px_rgba(15,23,42,0.58)]">
            <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
                <Kicker>{entry.heroKicker}</Kicker>
                <div className="mt-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-200 bg-white/82 text-brass shadow-[0_16px_35px_-25px_rgba(120,87,18,0.45)]">
                  <Icon size={28} />
                </div>
                <h1 className="mt-6 max-w-[14ch] text-4xl font-semibold leading-[0.96] tracking-[-0.05em] text-ink sm:text-5xl lg:text-[4.2rem]">
                  {entry.heroTitle}
                </h1>
                <p className="mt-5 max-w-[62ch] text-base leading-relaxed text-neutral-600 sm:text-lg">
                  {entry.heroSubtitle}
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href={pilotHref}
                    className="btn-primary-gradient inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white no-underline transition-all duration-200 active:scale-[0.98]"
                  >
                    {locale === "fr"
                      ? "Parler du déploiement"
                      : "Discuss deployment"}
                    <ArrowRight size={16} weight="bold" />
                  </Link>
                  <Link
                    href={protocolHref}
                    className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white/82 px-5 py-3 text-sm font-semibold text-ink no-underline transition-colors hover:border-neutral-400 hover:bg-white"
                  >
                    {locale === "fr"
                      ? "Voir le protocole de mise en place"
                      : "View the deployment protocol"}
                  </Link>
                </div>
              </div>

              <div className="border-t border-neutral-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.72)_0%,rgba(250,246,236,0.92)_100%)] px-6 py-8 sm:px-8 lg:border-l lg:border-t-0 lg:px-9 lg:py-10">
                <Kicker className="text-neutral-500">
                  {entry.proofKicker}
                </Kicker>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
                  {entry.proofTitle}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                  {entry.proofIntro}
                </p>

                <div className="mt-6 space-y-3">
                  {entry.proofs.map((proof) => (
                    <article
                      key={`${proof.value}-${proof.label}`}
                      className="rounded-[1.35rem] border border-neutral-200/80 bg-white/86 p-4 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.35)]"
                    >
                      <p className="text-2xl font-semibold tracking-tight text-ink">
                        {proof.value}
                      </p>
                      <p className="mt-1 text-sm font-medium text-neutral-700">
                        {proof.label}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                        {proof.detail}
                      </p>
                      <a
                        href={proof.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brass no-underline hover:text-brass-700"
                      >
                        {proof.sourceLabel}
                        <ArrowUpRight size={14} weight="bold" />
                      </a>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </article>
      </SectionShell>

      <SectionShell className="bg-white py-10 md:py-14">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[2rem] border border-neutral-200/80 bg-neutral-50/70 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] md:p-8">
            <Kicker>{entry.challengeKicker}</Kicker>
            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-ink">
              {entry.challengeTitle}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-neutral-600">
              {entry.challengeBody}
            </p>
          </section>

          <div className="grid gap-4 md:grid-cols-3">
            {entry.challenges.map((challenge) => (
              <article
                key={challenge.title}
                className="rounded-[1.6rem] border border-neutral-200/80 bg-white p-5 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.18)]"
              >
                <h3 className="text-lg font-semibold tracking-tight text-ink">
                  {challenge.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                  {challenge.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </SectionShell>

      <SectionShell className="section-dark relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_420px_at_8%_4%,rgba(250,204,21,0.1),transparent_55%),radial-gradient(900px_420px_at_92%_0%,rgba(255,255,255,0.05),transparent_58%)]"
        />
        <div className="relative grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] md:p-8">
            <Kicker className="text-neutral-100">
              {entry.valuePropKicker}
            </Kicker>
            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-white">
              {entry.valuePropTitle}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-neutral-300">
              {entry.valuePropBody}
            </p>
            <div className="mt-6 space-y-3">
              {differentiationCards.map((card) => (
                <article
                  key={card.title}
                  className="grid gap-3 rounded-[1.35rem] border border-white/10 bg-white/[0.05] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:grid-cols-[minmax(0,13rem)_1fr] sm:items-start"
                >
                  <h3 className="text-sm font-semibold tracking-tight text-white sm:text-[0.95rem]">
                    {card.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-neutral-300">
                    {card.body}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.03)_100%)] p-6 shadow-[0_30px_70px_-50px_rgba(2,6,23,0.85)] md:p-8">
            <Kicker className="text-neutral-100">{entry.loopKicker}</Kicker>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
              {entry.loopTitle}
            </h2>
            <p className="mt-3 max-w-[64ch] text-sm leading-relaxed text-neutral-300">
              {entry.loopIntro}
            </p>

            <div className="mt-8 grid gap-3 xl:grid-cols-2">
              {entry.loopSteps.map((step, index) => (
                <article
                  key={step.title}
                  className="grid gap-4 rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:grid-cols-[3rem_1fr] sm:items-start"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-amber-300/20 bg-amber-400/10 text-xs font-semibold text-amber-100">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight text-white">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-neutral-300">
                      {step.body}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </SectionShell>

      <SectionShell className="py-10 md:py-14">
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-[2rem] border border-neutral-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(250,246,236,0.9)_100%)] p-6 md:p-8">
            <Kicker>{entry.kpiKicker}</Kicker>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink">
              {entry.kpiTitle}
            </h2>
            <ul className="mt-6 list-none space-y-3 p-0">
              {entry.kpis.map((kpi) => (
                <li
                  key={kpi}
                  className="m-0 flex items-start gap-3 rounded-[1.2rem] border border-neutral-200/80 bg-white/88 px-4 py-3 text-sm text-neutral-700"
                >
                  <span className="mt-1 block h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                  {kpi}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-[2rem] border border-neutral-200/80 bg-white p-6 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.18)] md:p-8">
            <Kicker>{entry.decisionKicker}</Kicker>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink">
              {entry.decisionTitle}
            </h2>
            <ul className="mt-6 list-none space-y-3 p-0">
              {entry.decisions.map((decision) => (
                <li
                  key={decision}
                  className="m-0 flex items-start gap-3 rounded-[1.2rem] border border-neutral-200/80 bg-neutral-50/75 px-4 py-3 text-sm text-neutral-700"
                >
                  <span className="mt-1 block h-2 w-2 shrink-0 rounded-full bg-brass" />
                  {decision}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-[2rem] border border-neutral-200/80 bg-neutral-950 px-6 py-8 text-white shadow-[0_34px_80px_-60px_rgba(15,23,42,0.95)] md:px-8 lg:col-span-2">
            <Kicker className="text-amber-200">
              {locale === "fr"
                ? "Passer de l'exemple à vos données"
                : "Move from examples to your own data"}
            </Kicker>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
              {entry.ctaTitle}
            </h2>
            <p className="mt-4 max-w-[68ch] text-base leading-relaxed text-neutral-300">
              {entry.ctaBody}
            </p>

            <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,0.76fr)_minmax(0,1.24fr)] lg:items-start">
              <div className="flex flex-wrap gap-3">
                <Link
                  href={pilotHref}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-neutral-950 no-underline transition-colors hover:bg-amber-50"
                >
                  {locale === "fr"
                    ? "Parler du déploiement"
                    : "Discuss deployment"}
                  <ArrowRight size={16} weight="bold" />
                </Link>
                <Link
                  href={protocolHref}
                  className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/[0.06] px-5 py-3 text-sm font-semibold text-white no-underline transition-colors hover:bg-white/[0.1]"
                >
                  {locale === "fr"
                    ? "Voir le protocole de mise en place"
                    : "View the deployment protocol"}
                </Link>
              </div>

              <div className="border-t border-white/10 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/52">
                  {locale === "fr" ? "Sources" : "Sources"}
                </p>
                <ul className="mt-3 list-none space-y-2 p-0">
                  {displaySourceLinks.map((source) => (
                    <li key={source.url} className="m-0">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-neutral-300 no-underline hover:text-white"
                      >
                        {source.label}
                        <ArrowUpRight size={14} weight="bold" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </div>
      </SectionShell>
    </>
  );
}
