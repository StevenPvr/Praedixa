import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Circle,
  LockKey,
  Sparkle,
} from "@phosphor-icons/react/dist/ssr";
import { isValidLocale } from "../../../lib/i18n/config";
import { getDictionary } from "../../../lib/i18n/get-dictionary";
import { PraedixaLogo } from "../../../components/logo/PraedixaLogo";
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
  const pilotHref = `/${locale}/${locale === "fr" ? "devenir-pilote" : "pilot-application"}`;

  return (
    <main id="main-content" tabIndex={-1} className="min-h-[100dvh] py-24">
      <div className="section-shell max-w-6xl">
        <header className="panel-glass flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3">
          <div className="flex items-center gap-2.5">
            <PraedixaLogo
              variant="geometric"
              size={28}
              color="var(--ink-soft)"
              strokeWidth={1.1}
            />
            <span className="text-base font-semibold tracking-tight text-[var(--ink)]">
              Praedixa
            </span>
          </div>
          <Link href={`/${locale}`} className="btn-secondary">
            <ArrowLeft size={14} weight="bold" />
            {isFr ? "Retour au site" : "Back to site"}
          </Link>
        </header>

        <article className="panel-glass mt-6 rounded-3xl p-6 md:p-10">
          <p className="section-kicker">
            <Sparkle size={12} weight="fill" />
            {pilot.kicker}
          </p>
          <h1 className="mt-3 text-4xl leading-none tracking-tighter text-[var(--ink)] md:text-6xl">
            {pilot.heading}
          </h1>
          <p className="section-lead">{pilot.subheading}</p>

          <section className="mt-10">
            <h2 className="text-2xl tracking-tight text-[var(--ink)]">
              {howItWorks.heading}
            </h2>
            <div className="mt-5 grid gap-4 md:grid-cols-12">
              {howItWorks.steps.map((step, index) => (
                <article
                  key={step.number}
                  className={`rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 ${
                    index % 2 === 0 ? "md:col-span-7" : "md:col-span-5"
                  }`}
                >
                  <p className="font-mono text-xs text-[var(--ink-muted)]">
                    {step.number}
                  </p>
                  <h3 className="mt-2 text-lg tracking-tight text-[var(--ink)]">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--accent-700)]">
                    {step.subtitle}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">
                    {step.description}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-10 grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
              <h2 className="text-xl tracking-tight text-[var(--ink)]">
                {pilot.included.title}
              </h2>
              <ul className="mt-3 grid gap-2">
                {pilot.included.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm text-[var(--ink-soft)]"
                  >
                    <Check
                      size={14}
                      weight="bold"
                      className="mt-0.5 shrink-0 text-[var(--accent-700)]"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
              <h2 className="text-xl tracking-tight text-[var(--ink)]">
                {pilot.excluded.title}
              </h2>
              <ul className="mt-3 grid gap-2">
                {pilot.excluded.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm text-[var(--ink-soft)]"
                  >
                    <Circle
                      size={12}
                      weight="regular"
                      className="mt-1 shrink-0 text-[var(--ink-muted)]"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          </section>

          <section className="mt-10 grid gap-4 md:grid-cols-[1.2fr_1fr]">
            <article className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
              <h2 className="text-xl tracking-tight text-[var(--ink)]">
                {pilot.kpis.title}
              </h2>
              <ul className="mt-3 grid gap-2 md:grid-cols-2">
                {pilot.kpis.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm text-[var(--ink-soft)]"
                  >
                    <Check
                      size={14}
                      weight="bold"
                      className="mt-0.5 shrink-0 text-[var(--accent-700)]"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
              <h2 className="text-xl tracking-tight text-[var(--ink)]">
                {pilot.governance.title}
              </h2>
              <ul className="mt-3 grid gap-2">
                {pilot.governance.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm text-[var(--ink-soft)]"
                  >
                    <Check
                      size={14}
                      weight="bold"
                      className="mt-0.5 shrink-0 text-[var(--accent-700)]"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          </section>

          <section className="mt-10 border-t border-[var(--line)] pt-8">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[var(--ink-muted)]">
              <LockKey size={14} weight="duotone" />
              {security.heading}
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {security.tiles.slice(0, 4).map((tile) => (
                <article
                  key={tile.title}
                  className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3"
                >
                  <p className="text-sm font-medium text-[var(--ink)]">
                    {tile.title}
                  </p>
                  <p className="mt-1 text-sm text-[var(--ink-soft)]">
                    {tile.description}
                  </p>
                </article>
              ))}
            </div>
            <p className="mt-4 rounded-xl border border-[var(--accent-200)] bg-[var(--accent-50)] px-4 py-3 text-sm text-[var(--ink-soft)]">
              {security.honesty}
            </p>
          </section>

          <section className="mt-10 flex flex-wrap items-center gap-3">
            <Link href={pilotHref} className="btn-primary">
              {pilot.ctaPrimary}
              <ArrowUpRight size={15} weight="bold" />
            </Link>
          </section>
        </article>
      </div>
    </main>
  );
}
