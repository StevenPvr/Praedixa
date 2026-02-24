import { notFound } from "next/navigation";
import { isValidLocale } from "../../../lib/i18n/config";
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

  const { getDictionary } = await import("../../../lib/i18n/get-dictionary");
  const dict = await getDictionary(locale);
  const p = dict.pilot;
  const isFr = locale === "fr";

  const { getLocalizedPath } = await import("../../../lib/i18n/config");
  const pilotHref = getLocalizedPath(locale, "pilot");

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
      <span className="inline-block text-xs font-semibold uppercase tracking-[0.08em] text-brass">
        {p.kicker}
      </span>
      <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink sm:text-3xl md:text-4xl">
        {isFr ? "Protocole pilote" : "Pilot protocol"}
      </h1>
      <p className="mt-4 max-w-[58ch] text-base leading-relaxed text-neutral-500">
        {p.subheading}
      </p>

      <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-border-subtle bg-white p-6">
          <h2 className="text-sm font-semibold text-ink">{p.included.title}</h2>
          <ul className="mt-3 list-none space-y-2 p-0">
            {p.included.items.map((item: string) => (
              <li key={item} className="m-0 flex items-start gap-2 text-sm text-neutral-600">
                <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-brass-300" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border-subtle bg-white p-6">
          <h2 className="text-sm font-semibold text-ink">{p.excluded.title}</h2>
          <ul className="mt-3 list-none space-y-2 p-0">
            {p.excluded.items.map((item: string) => (
              <li key={item} className="m-0 flex items-start gap-2 text-sm text-neutral-400 line-through">
                <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-300" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-border-subtle bg-white p-6">
          <h2 className="text-sm font-semibold text-ink">{p.kpis.title}</h2>
          <ul className="mt-3 list-none space-y-2 p-0">
            {p.kpis.items.map((item: string) => (
              <li key={item} className="m-0 text-sm text-neutral-600">{item}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border-subtle bg-white p-6">
          <h2 className="text-sm font-semibold text-ink">{p.governance.title}</h2>
          <ul className="mt-3 list-none space-y-2 p-0">
            {p.governance.items.map((item: string) => (
              <li key={item} className="m-0 text-sm text-neutral-600">{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-border-subtle bg-white p-6">
        <h2 className="text-sm font-semibold text-ink">{p.selection.title}</h2>
        <ul className="mt-3 list-none space-y-2 p-0">
          {p.selection.items.map((item: string) => (
            <li key={item} className="m-0 text-sm text-neutral-600">{item}</li>
          ))}
        </ul>
      </div>

      <div className="mt-8 rounded-xl border border-brass-200 bg-brass-50/50 p-6">
        <h2 className="text-sm font-semibold text-brass-700">{p.upcoming.title}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-brass-600">
          {p.upcoming.description}
        </p>
      </div>

      <p className="mt-6 text-xs text-neutral-400">{p.urgency}</p>

      <div className="mt-8 border-t border-border-subtle pt-8">
        <a
          href={pilotHref}
          className="inline-flex items-center rounded-lg bg-brass px-5 py-3 text-sm font-semibold text-white no-underline transition-all duration-150 hover:bg-brass-600 active:scale-[0.98]"
        >
          {p.ctaPrimary}
        </a>
        <p className="mt-2 text-xs text-neutral-400">{p.ctaMeta}</p>
      </div>
    </div>
  );
}
