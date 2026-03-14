import Link from "next/link";
import type { ReactNode } from "react";
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

function DecisionProofTable({
  copy,
}: {
  copy: ReturnType<typeof getValuePropContent>["proof"];
}) {
  return (
    <div className="mt-10 overflow-x-auto rounded-[1.8rem] border border-neutral-200/80 bg-white/95 shadow-[0_22px_46px_-38px_rgba(15,23,42,0.16)]">
      <div className="border-b border-neutral-200/80 px-6 py-4">
        <h2 className="text-lg font-semibold tracking-tight text-ink">
          {copy.tableTitle}
        </h2>
      </div>
      <table className="min-w-full border-collapse text-left text-sm">
        <thead className="bg-neutral-50/90 text-neutral-600">
          <tr>
            <HeaderCell>{copy.tableColumns.option}</HeaderCell>
            <HeaderCell>{copy.tableColumns.actionCost}</HeaderCell>
            <HeaderCell>{copy.tableColumns.inactionCost}</HeaderCell>
            <HeaderCell>{copy.tableColumns.serviceRisk}</HeaderCell>
            <HeaderCell>{copy.tableColumns.decision}</HeaderCell>
            <HeaderCell>{copy.tableColumns.observedEffect}</HeaderCell>
            <HeaderCell>{copy.tableColumns.limitation}</HeaderCell>
          </tr>
        </thead>
        <tbody>
          {copy.rows.map((row) => (
            <tr key={row.option} className="border-t border-neutral-200/80">
              <BodyCell strong>{row.option}</BodyCell>
              <BodyCell>{row.actionCost}</BodyCell>
              <BodyCell>{row.inactionCost}</BodyCell>
              <BodyCell>{row.serviceRisk}</BodyCell>
              <BodyCell>{row.decision}</BodyCell>
              <BodyCell>{row.observedEffect}</BodyCell>
              <BodyCell>{row.limitation}</BodyCell>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function getProofBlocks(copy: ReturnType<typeof getValuePropContent>["proof"]) {
  return [
    { title: copy.situationTitle, paragraphs: copy.situationBody },
    { title: copy.optionsTitle, paragraphs: copy.optionsBody },
    { title: copy.decisionTitle, paragraphs: copy.decisionBody },
    { title: copy.impactTitle, paragraphs: copy.impactBody },
    { title: copy.limitsTitle, paragraphs: copy.limitsBody },
    { title: copy.dataTitle, paragraphs: copy.dataBody },
  ];
}

function DecisionProofMetadata({
  copy,
  description,
  locale,
  path,
}: {
  copy: ReturnType<typeof getValuePropContent>["proof"];
  description: string;
  locale: Locale;
  path: string;
}) {
  const homeLabel = locale === "fr" ? "Accueil" : "Home";

  return (
    <>
      <CorePageJsonLd
        locale={locale}
        name={copy.title}
        description={description}
        path={path}
        breadcrumbs={[
          { name: homeLabel, path: `/${locale}` },
          { name: copy.title, path },
        ]}
      />
      <BreadcrumbTrail
        items={[
          { label: homeLabel, href: `/${locale}` },
          { label: copy.title },
        ]}
      />
    </>
  );
}

function DecisionProofActions({
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: {
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
}) {
  return (
    <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-neutral-200/80 pt-8">
      <Link
        href={primaryHref}
        className="btn-primary-gradient inline-flex items-center rounded-xl px-5 py-3 text-sm font-semibold text-white no-underline transition-all duration-200 active:-translate-y-[1px] active:scale-[0.99]"
      >
        {primaryLabel}
      </Link>
      <Link
        href={secondaryHref}
        className="inline-flex items-center rounded-xl border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-ink no-underline transition-colors duration-200 hover:bg-neutral-50"
      >
        {secondaryLabel}
      </Link>
    </div>
  );
}

function DecisionProofBlocks({
  blocks,
  copy,
}: {
  blocks: ReturnType<typeof getProofBlocks>;
  copy: ReturnType<typeof getValuePropContent>["proof"];
}) {
  return (
    <>
      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {blocks.map((block) => (
          <ContentBlock
            key={block.title}
            title={block.title}
            paragraphs={block.paragraphs}
          />
        ))}
      </div>

      <div className="mt-6 rounded-[1.7rem] border border-amber-200/80 bg-amber-50/70 p-6">
        <ContentBlock
          title={copy.nextTitle}
          paragraphs={copy.nextBody}
          compact
        />
      </div>
    </>
  );
}

function DecisionProofLead({
  kicker,
  lead,
  title,
}: {
  kicker: string;
  lead: string;
  title: string;
}) {
  return (
    <>
      <Kicker>{kicker}</Kicker>
      <h1 className="mt-4 max-w-4xl text-4xl font-bold leading-none tracking-tighter text-ink md:text-6xl">
        {title}
      </h1>
      <p className="mt-5 max-w-[72ch] text-base leading-relaxed text-neutral-600">
        {lead}
      </p>
    </>
  );
}

export function DecisionProofPage({ locale }: { locale: Locale }) {
  const content = getValuePropContent(locale);
  const copy = content.proof;
  const proofPath = getLocalizedPath(locale, "decisionLogProof");
  const scopingHref = buildContactIntentHref(locale, "deployment");
  const servicesHref = getLocalizedPath(locale, "services");
  const blocks = getProofBlocks(copy);

  return (
    <SectionShell className="py-14 md:py-20">
      <article className="mx-auto max-w-[1400px]">
        <DecisionProofMetadata
          copy={copy}
          description={content.proofMeta.description}
          locale={locale}
          path={proofPath}
        />
        <DecisionProofLead
          kicker={copy.kicker}
          lead={copy.lead}
          title={copy.title}
        />

        <DecisionProofTable copy={copy} />
        <DecisionProofBlocks blocks={blocks} copy={copy} />
        <DecisionProofActions
          primaryHref={scopingHref}
          primaryLabel={copy.primaryCtaLabel}
          secondaryHref={servicesHref}
          secondaryLabel={copy.secondaryCtaLabel}
        />
      </article>
    </SectionShell>
  );
}

function ContentBlock({
  title,
  paragraphs,
  compact = false,
}: {
  title: string;
  paragraphs: string[];
  compact?: boolean;
}) {
  const wrapperClassName = compact
    ? ""
    : "rounded-[1.7rem] border border-neutral-200/80 bg-white/95 p-6";

  return (
    <section className={wrapperClassName}>
      <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
      {paragraphs.map((paragraph) => (
        <p
          key={paragraph}
          className="mt-3 text-sm leading-relaxed text-neutral-700"
        >
          {paragraph}
        </p>
      ))}
    </section>
  );
}

function HeaderCell({ children }: { children: ReactNode }) {
  return (
    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em]">
      {children}
    </th>
  );
}

function BodyCell({
  children,
  strong = false,
}: {
  children: ReactNode;
  strong?: boolean;
}) {
  return (
    <td
      className={`px-4 py-3 align-top text-sm leading-relaxed text-neutral-700 ${
        strong ? "font-semibold text-ink" : ""
      }`}
    >
      {children}
    </td>
  );
}
