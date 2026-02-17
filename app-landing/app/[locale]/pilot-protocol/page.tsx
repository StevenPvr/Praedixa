import { notFound } from "next/navigation";
import Link from "next/link";
import { isValidLocale } from "../../../lib/i18n/config";
import { getDictionary } from "../../../lib/i18n/get-dictionary";
import { PraedixaLogo } from "../../../components/logo/PraedixaLogo";
import { CheckIcon } from "../../../components/icons";
import type { Metadata } from "next";
import { buildLocaleMetadata, localePathMap } from "../../../lib/seo/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isValidLocale(locale)) return {};
  const isFr = locale === "fr";
  return buildLocaleMetadata({
    locale,
    paths: localePathMap("/fr/pilot-protocol", "/en/pilot-protocol"),
    title: isFr ? "Praedixa | Protocole pilote" : "Praedixa | Pilot protocol",
    description: isFr
      ? "Protocole du pilote Praedixa : cadrage, livrables et gouvernance."
      : "Praedixa pilot protocol: framing, deliverables, and governance.",
  });
}

export default async function PilotProtocolPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();

  const dict = await getDictionary(locale);
  const { pilot, howItWorks, security } = dict;
  const isFr = locale === "fr";

  return (
    <div className="min-h-screen bg-cream print:bg-white">
      {/* Print-optimized header */}
      <header className="section-shell py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PraedixaLogo
              variant="geometric"
              size={32}
              color="oklch(0.16 0.01 55)"
              strokeWidth={1.1}
            />
            <span className="font-serif text-xl text-charcoal">Praedixa</span>
          </div>
          <Link href={`/${locale}`} className="btn-ghost text-sm print:hidden">
            {isFr ? "Retour au site" : "Back to site"}
          </Link>
        </div>
      </header>

      <main className="section-shell pb-16">
        {/* Title */}
        <div className="border-b border-neutral-200 pb-8">
          <p className="section-kicker">{pilot.kicker}</p>
          <h1 className="mt-3 font-serif text-4xl text-charcoal sm:text-5xl">
            {pilot.heading}
          </h1>
          <p className="section-lead">{pilot.subheading}</p>
        </div>

        {/* Steps */}
        <section className="mt-10">
          <h2 className="font-serif text-2xl text-charcoal">
            {howItWorks.heading}
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {howItWorks.steps.map((step) => (
              <div key={step.number} className="craft-card p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded border border-brass-200 bg-brass-50 text-xs font-bold text-brass-700">
                    {step.number}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-charcoal">
                      {step.title}
                    </h3>
                    <p className="text-2xs text-brass-600">{step.subtitle}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-neutral-600">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Included / Excluded */}
        <section className="mt-10 grid gap-6 sm:grid-cols-2">
          <div>
            <h2 className="font-serif text-xl text-charcoal">
              {pilot.included.title}
            </h2>
            <ul className="mt-4 grid gap-2">
              {pilot.included.items.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm text-neutral-600"
                >
                  <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-brass-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-serif text-xl text-charcoal">
              {pilot.excluded.title}
            </h2>
            <ul className="mt-4 grid gap-2">
              {pilot.excluded.items.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm text-neutral-500"
                >
                  <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full border border-neutral-300" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* KPIs */}
        <section className="mt-10">
          <h2 className="font-serif text-xl text-charcoal">
            {pilot.kpis.title}
          </h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {pilot.kpis.items.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 text-sm text-neutral-600"
              >
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-brass-500" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Governance */}
        <section className="mt-10">
          <h2 className="font-serif text-xl text-charcoal">
            {pilot.governance.title}
          </h2>
          <ul className="mt-4 grid gap-2">
            {pilot.governance.items.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 text-sm text-neutral-600"
              >
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-brass-500" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Security summary */}
        <section className="mt-10 border-t border-neutral-200 pt-8">
          <h2 className="font-serif text-xl text-charcoal">
            {security.heading}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {security.tiles.slice(0, 4).map((tile) => (
              <div key={tile.title} className="text-sm">
                <p className="font-medium text-charcoal">{tile.title}</p>
                <p className="text-neutral-600">{tile.description}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 rounded-lg border border-brass-100 bg-brass-50 px-4 py-3 text-sm text-brass-800">
            {security.honesty}
          </p>
        </section>

        {/* CTA */}
        <section className="mt-10 text-center print:hidden">
          <p className="text-sm text-neutral-600">{pilot.urgency}</p>
          <Link
            href={`/${locale}/${locale === "fr" ? "devenir-pilote" : "pilot-application"}`}
            className="btn-primary mt-4"
          >
            {pilot.ctaPrimary}
          </Link>
        </section>

        {/* Print footer */}
        <div className="mt-12 hidden border-t border-neutral-200 pt-6 text-center text-xs text-neutral-500 print:block">
          praedixa.com &middot;{" "}
          {isFr ? "Document confidentiel" : "Confidential document"}
        </div>
      </main>
    </div>
  );
}
