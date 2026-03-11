"use client";

import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react";
import type { Locale } from "../../lib/i18n/config";
import { getLocalizedPath } from "../../lib/i18n/config";
import type { Dictionary } from "../../lib/i18n/types";
import {
  CheckBadgeIcon,
  DecisionGraphIcon,
  MinusBadgeIcon,
} from "../shared/icons/MarketingIcons";
import { Kicker } from "../shared/Kicker";
import { SectionShell } from "../shared/SectionShell";

interface ServicesPageProps {
  locale: Locale;
  dict: Dictionary;
}

function toList(value: string[] | null | undefined): string[] {
  return Array.isArray(value) ? value : [];
}

function isPositiveComparisonValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (/(^|\s)(non|not)\b/.test(normalized)) return false;
  return /(inclus|included|yes|oui)\b/.test(normalized);
}

export function ServicesPage({ locale, dict }: ServicesPageProps) {
  const copy = dict.servicesPage;
  const pilotHref = getLocalizedPath(locale, "pilot");
  const contactHref = getLocalizedPath(locale, "contact");
  const fullPackageIncludes = toList(copy.fullPackage.includes);
  const forecastsIncludes = toList(copy.forecastsOnly.includes);
  const forecastsLimits = toList(copy.forecastsOnly.limits);
  const comparisonRows = Array.isArray(copy.comparison.columns)
    ? copy.comparison.columns
    : [];
  const decisionItems = toList(copy.decisionGuide.items);
  const hasComparison = comparisonRows.length > 0;
  const localeCopy =
    locale === "fr"
      ? {
          serviceKicker: "Choisir votre point de départ",
          methodKicker: "Quand choisir chaque mode",
          comparisonFallback: "Comparatif indisponible pour le moment.",
          criterionLabel: "Critère",
          signatureLabel: "Offre Praedixa",
          forecastingLabel: "Diagnostic ROI",
          includesFallback: "Aucun élément renseigné pour le moment.",
          limitsFallback: "Aucune limite renseignée pour le moment.",
          decisionFallback: "Guide de décision indisponible pour le moment.",
        }
      : {
          serviceKicker: "Choose your starting point",
          methodKicker: "Selection method",
          comparisonFallback: "Comparison is currently unavailable.",
          criterionLabel: "Criterion",
          signatureLabel: "Praedixa offer",
          forecastingLabel: "ROI diagnostic",
          includesFallback: "No item is available yet.",
          limitsFallback: "No limit is available yet.",
          decisionFallback: "Decision guide is currently unavailable.",
        };

  return (
    <SectionShell className="py-14 md:py-20">
      <article className="mx-auto max-w-[1400px]">
        <header className="grid grid-cols-1 gap-6 border-b border-neutral-200/80 pb-10 md:grid-cols-[1.45fr_0.55fr] md:items-end md:gap-10">
          <div>
            <Kicker>{copy.kicker}</Kicker>
            <h1 className="mt-4 max-w-4xl text-4xl font-bold leading-none tracking-tighter text-ink md:text-6xl">
              {copy.heading}
            </h1>
            <p className="mt-5 max-w-[66ch] text-base leading-relaxed text-neutral-600">
              {copy.subheading}
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/65 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.11em] text-brass-700">
              <DecisionGraphIcon size={14} />
              {localeCopy.serviceKicker}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-neutral-700">
              {copy.bottomNote}
            </p>
          </div>
        </header>

        <section className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-[1.38fr_0.62fr]">
          <section className="rounded-[2rem] border border-amber-200/80 bg-[linear-gradient(165deg,rgba(244,231,198,0.62)_0%,rgba(252,248,238,0.9)_68%,rgba(255,255,255,0.95)_100%)] p-7 shadow-[0_22px_45px_-40px_rgba(32,24,4,0.45),inset_0_1px_0_rgba(255,255,255,0.8)] md:p-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-brass-700">
              {copy.fullPackage.badge}
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink md:text-4xl">
              {copy.fullPackage.title}
            </h2>
            <p className="mt-4 max-w-[65ch] text-sm leading-relaxed text-neutral-700 md:text-base">
              {copy.fullPackage.summary}
            </p>

            <div className="mt-7 border-t border-amber-200/80 pt-6">
              <h3 className="text-sm font-semibold text-ink">
                {copy.fullPackage.includesTitle}
              </h3>
              <ul className="mt-4 list-none space-y-2.5 p-0">
                {fullPackageIncludes.length > 0 ? (
                  fullPackageIncludes.map((item) => (
                    <li
                      key={item}
                      className="m-0 flex items-start gap-2.5 text-sm text-neutral-700"
                    >
                      <CheckBadgeIcon
                        size={18}
                        className="mt-0.5 shrink-0 text-amber-600"
                      />
                      {item}
                    </li>
                  ))
                ) : (
                  <li className="m-0 text-sm text-neutral-500">
                    {localeCopy.includesFallback}
                  </li>
                )}
              </ul>
            </div>

            <Link
              href={pilotHref}
              className="btn-primary-gradient mt-8 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white no-underline transition-all duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] active:-translate-y-[1px] active:scale-[0.99]"
            >
              {copy.fullPackage.cta}
              <ArrowUpRight size={16} weight="bold" />
            </Link>
          </section>

          <div className="space-y-6">
            <section className="rounded-[1.7rem] border border-neutral-200/80 bg-white/95 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] md:p-7">
              <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-neutral-500">
                {copy.forecastsOnly.badge}
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink md:text-2xl">
                {copy.forecastsOnly.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                {copy.forecastsOnly.summary}
              </p>

              <h3 className="mt-5 text-sm font-semibold text-ink">
                {copy.forecastsOnly.includesTitle}
              </h3>
              <ul className="mt-3 list-none space-y-2 p-0">
                {forecastsIncludes.length > 0 ? (
                  forecastsIncludes.map((item) => (
                    <li
                      key={item}
                      className="m-0 flex items-start gap-2 text-sm text-neutral-600"
                    >
                      <CheckBadgeIcon
                        size={16}
                        className="mt-0.5 shrink-0 text-neutral-500"
                      />
                      {item}
                    </li>
                  ))
                ) : (
                  <li className="m-0 text-sm text-neutral-500">
                    {localeCopy.includesFallback}
                  </li>
                )}
              </ul>

              <h3 className="mt-5 text-sm font-semibold text-ink">
                {copy.forecastsOnly.limitsTitle}
              </h3>
              <ul className="mt-3 list-none space-y-2 p-0">
                {forecastsLimits.length > 0 ? (
                  forecastsLimits.map((item) => (
                    <li
                      key={item}
                      className="m-0 flex items-start gap-2 text-sm text-neutral-600"
                    >
                      <MinusBadgeIcon
                        size={16}
                        className="mt-0.5 shrink-0 text-neutral-500"
                      />
                      {item}
                    </li>
                  ))
                ) : (
                  <li className="m-0 text-sm text-neutral-500">
                    {localeCopy.limitsFallback}
                  </li>
                )}
              </ul>

              <Link
                href={contactHref}
                className="mt-6 inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-ink no-underline transition-all duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:border-neutral-400 hover:bg-neutral-50 active:-translate-y-[1px] active:scale-[0.99]"
              >
                {copy.forecastsOnly.cta}
                <ArrowUpRight size={15} weight="bold" />
              </Link>
            </section>

            <section className="rounded-[1.7rem] border border-neutral-200/80 bg-neutral-50/90 p-6 md:p-7">
              <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-neutral-500">
                {localeCopy.methodKicker}
              </p>
              <h2 className="mt-2 text-lg font-semibold tracking-tight text-ink">
                {copy.decisionGuide.title}
              </h2>
              <ul className="mt-4 list-none space-y-2.5 p-0">
                {decisionItems.length > 0 ? (
                  decisionItems.map((item, index) => (
                    <li
                      key={item}
                      className="m-0 flex items-start gap-2.5 text-sm text-neutral-700"
                    >
                      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-amber-300 bg-amber-100 text-[11px] font-semibold text-amber-700">
                        {index + 1}
                      </span>
                      {item}
                    </li>
                  ))
                ) : (
                  <li className="m-0 text-sm text-neutral-500">
                    {localeCopy.decisionFallback}
                  </li>
                )}
              </ul>
            </section>
          </div>
        </section>

        <section className="mt-10 rounded-[2rem] border border-neutral-200/80 bg-white/96 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <h2 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">
              {copy.comparison.title}
            </h2>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center rounded-full border border-brass-300 bg-brass-50 px-3 py-1 font-medium text-brass-700">
                {localeCopy.signatureLabel}
              </span>
              <span className="inline-flex items-center rounded-full border border-neutral-300 bg-neutral-100 px-3 py-1 font-medium text-neutral-600">
                {localeCopy.forecastingLabel}
              </span>
            </div>
          </div>

          {hasComparison ? (
            <div className="mt-6">
              <div className="hidden grid-cols-[1.25fr_0.78fr_0.78fr] gap-4 border-b border-neutral-200 pb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-500 md:grid">
                <p>{localeCopy.criterionLabel}</p>
                <p>{copy.fullPackage.badge}</p>
                <p>{copy.forecastsOnly.title}</p>
              </div>

              <ul className="list-none divide-y divide-neutral-200 p-0">
                {comparisonRows.map((row) => (
                  <li
                    key={row.criterion}
                    className="grid grid-cols-1 gap-2 py-4 md:grid-cols-[1.25fr_0.78fr_0.78fr] md:gap-4"
                  >
                    <p className="m-0 text-sm leading-relaxed text-neutral-700">
                      {row.criterion}
                    </p>
                    <p
                      className={`m-0 inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                        isPositiveComparisonValue(row.fullPackage)
                          ? "border border-amber-300 bg-amber-50 text-amber-700"
                          : "border border-neutral-300 bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {row.fullPackage}
                    </p>
                    <p
                      className={`m-0 inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                        isPositiveComparisonValue(row.forecastsOnly)
                          ? "border border-amber-300 bg-amber-50 text-amber-700"
                          : "border border-neutral-300 bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {row.forecastsOnly}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-4 text-sm text-neutral-500">
              {localeCopy.comparisonFallback}
            </p>
          )}
        </section>
      </article>
    </SectionShell>
  );
}
