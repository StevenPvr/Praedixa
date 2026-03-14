import Link from "next/link";
import {
  buildContactIntentHref,
  getLocalizedPath,
  type Locale,
} from "../../lib/i18n/config";
import { getValuePropContent } from "../../lib/content/value-prop";
import { CorePageJsonLd } from "../seo/CorePageJsonLd";
import { BreadcrumbTrail } from "../shared/BreadcrumbTrail";
import { Kicker } from "../shared/Kicker";
import { SectionShell } from "../shared/SectionShell";

export function ServicesPage({ locale }: { locale: Locale }) {
  const content = getValuePropContent(locale);
  const copy = content.services;
  const scopingHref = buildContactIntentHref(locale, "deployment");
  const proofHref = getLocalizedPath(locale, "decisionLogProof");

  return (
    <SectionShell className="py-14 md:py-20">
      <CorePageJsonLd
        locale={locale}
        name={copy.heading}
        description={content.servicesMeta.description}
        path={getLocalizedPath(locale, "services")}
        breadcrumbs={[
          {
            name: locale === "fr" ? "Accueil" : "Home",
            path: `/${locale}`,
          },
          {
            name: copy.heading,
            path: getLocalizedPath(locale, "services"),
          },
        ]}
      />
      <article className="mx-auto max-w-[1400px]">
        <header className="grid grid-cols-1 gap-8 border-b border-neutral-200/80 pb-10 md:grid-cols-[1.3fr_0.7fr] md:items-end">
          <div>
            <BreadcrumbTrail
              items={[
                {
                  label: locale === "fr" ? "Accueil" : "Home",
                  href: `/${locale}`,
                },
                { label: copy.heading },
              ]}
            />
            <Kicker>{copy.kicker}</Kicker>
            <h1 className="mt-4 max-w-4xl text-4xl font-bold leading-none tracking-tighter text-ink md:text-6xl">
              {copy.heading}
            </h1>
            <p className="mt-5 max-w-[66ch] text-base leading-relaxed text-neutral-600">
              {copy.subheading}
            </p>
          </div>

          <div className="rounded-[1.7rem] border border-amber-200/80 bg-amber-50/70 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-brass-700">
              {copy.timelineTitle}
            </p>
            <ol className="mt-4 list-none space-y-3 p-0">
              {copy.timeline.map((step) => (
                <li key={step.title} className="m-0">
                  <p className="text-sm font-semibold text-ink">{step.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-neutral-600">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </header>

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[1.12fr_0.88fr]">
          <section className="rounded-[2rem] border border-neutral-200/80 bg-white/95 p-7 shadow-[0_22px_46px_-38px_rgba(15,23,42,0.18)] md:p-9">
            <SectionList title={copy.deliveredTitle} items={copy.delivered} />
            <SectionList
              className="mt-8 border-t border-neutral-200/80 pt-8"
              title={copy.notDeliveredTitle}
              items={copy.notDelivered}
            />
          </section>

          <div className="space-y-6">
            <section className="rounded-[1.7rem] border border-neutral-200/80 bg-neutral-50/80 p-6">
              <SectionList
                title={copy.clientNeedsTitle}
                items={copy.clientNeeds}
              />
            </section>
            <section className="rounded-[1.7rem] border border-neutral-200/80 bg-white/95 p-6">
              <SectionList
                title={copy.participantsTitle}
                items={copy.participants}
              />
            </section>
            <section className="rounded-[1.7rem] border border-neutral-200/80 bg-white/95 p-6">
              <SectionList title={copy.reviewTitle} items={copy.reviewItems} />
            </section>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-neutral-200/80 pt-8">
          <Link
            href={scopingHref}
            className="btn-primary-gradient inline-flex items-center rounded-xl px-5 py-3 text-sm font-semibold text-white no-underline transition-all duration-200 active:-translate-y-[1px] active:scale-[0.99]"
          >
            {copy.primaryCtaLabel}
          </Link>
          <Link
            href={proofHref}
            className="inline-flex items-center rounded-xl border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-ink no-underline transition-colors duration-200 hover:bg-neutral-50"
          >
            {copy.secondaryCtaLabel}
          </Link>
        </div>

        <p className="mt-4 max-w-[72ch] text-sm leading-relaxed text-neutral-600">
          {copy.bottomNote}
        </p>
      </article>
    </SectionShell>
  );
}

function SectionList({
  className = "",
  title,
  items,
}: {
  className?: string;
  title: string;
  items: string[];
}) {
  return (
    <div className={className}>
      <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
      <ul className="mt-4 list-none space-y-2.5 p-0">
        {items.map((item) => (
          <li
            key={item}
            className="m-0 flex items-start gap-2.5 text-sm leading-relaxed text-neutral-700"
          >
            <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
