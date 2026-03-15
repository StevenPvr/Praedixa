import type { Locale } from "../../lib/i18n/config";
import { getValuePropContent } from "../../lib/content/value-prop";
import { Kicker } from "../shared/Kicker";
import { SectionShell } from "../shared/SectionShell";
import {
  DatabaseStackIcon,
  DecisionGraphIcon,
} from "../shared/icons/MarketingIcons";
import {
  MotionReveal,
  MotionStagger,
  MotionStaggerItem,
} from "../shared/motion/MotionReveal";

interface StackComparisonSectionProps {
  locale: Locale;
}

export function StackComparisonSection({
  locale,
}: StackComparisonSectionProps) {
  const copy = getValuePropContent(locale).stackComparison;

  return (
    <SectionShell
      id="comparison"
      className="bg-[linear-gradient(180deg,var(--warm-bg-panel)_0%,rgba(255,255,255,0.94)_100%)]"
    >
      <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.18fr_0.82fr] md:gap-12">
        <StackComparisonIntro
          kicker={copy.kicker}
          heading={copy.heading}
          subheading={copy.subheading}
        />
        <PraedixaDifferenceCard locale={locale} note={copy.bottomNote} />
      </div>

      <ComparisonTable
        columnLabels={copy.columnLabels}
        rows={copy.rows}
      />
    </SectionShell>
  );
}

function StackComparisonIntro({
  kicker,
  heading,
  subheading,
}: {
  kicker: string;
  heading: string;
  subheading: string;
}) {
  return (
    <MotionReveal>
      <Kicker>{kicker}</Kicker>
      <h2 className="mt-3 max-w-4xl text-4xl font-bold leading-none tracking-tighter text-ink md:text-6xl">
        {heading}
      </h2>
      <p className="mt-5 max-w-[70ch] text-base leading-relaxed text-neutral-600">
        {subheading}
      </p>
    </MotionReveal>
  );
}

function PraedixaDifferenceCard({
  locale,
  note,
}: {
  locale: Locale;
  note: string;
}) {
  const label =
    locale === "fr" ? "Ce que Praedixa change" : "What Praedixa changes";

  return (
    <MotionReveal direction="right" delay={0.14}>
      <aside className="rounded-[1.8rem] border border-amber-200/80 bg-amber-50/80 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_24px_48px_-36px_rgba(15,23,42,0.24)]">
        <div className="flex items-start gap-3">
          <DecisionGraphIcon
            size={20}
            className="mt-0.5 shrink-0 text-brass-700"
          />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brass-700">
              {label}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-neutral-700">
              {note}
            </p>
          </div>
        </div>
      </aside>
    </MotionReveal>
  );
}

function ComparisonTable({
  columnLabels,
  rows,
}: {
  columnLabels: {
    category: string;
    currentCoverage: string;
    stopsAt: string;
    praedixaAdd: string;
  };
  rows: ReturnType<typeof getValuePropContent>["stackComparison"]["rows"];
}) {
  return (
    <div className="mt-12 overflow-hidden rounded-[2rem] border border-neutral-200/80 bg-white/92 shadow-[0_30px_70px_-54px_rgba(15,23,42,0.3)]">
      <div className="hidden border-b border-neutral-200/80 bg-neutral-950 px-6 py-4 md:grid md:grid-cols-[0.78fr_1.08fr_1.08fr_1.08fr] md:gap-5">
        <ColumnLabel>{columnLabels.category}</ColumnLabel>
        <ColumnLabel>{columnLabels.currentCoverage}</ColumnLabel>
        <ColumnLabel>{columnLabels.stopsAt}</ColumnLabel>
        <ColumnLabel>{columnLabels.praedixaAdd}</ColumnLabel>
      </div>

      <MotionStagger className="divide-y divide-neutral-200/80">
        {rows.map((row) => (
          <StackComparisonRowArticle
            key={row.category}
            row={row}
            columnLabels={columnLabels}
          />
        ))}
      </MotionStagger>
    </div>
  );
}

function StackComparisonRowArticle({
  row,
  columnLabels,
}: {
  row: ReturnType<typeof getValuePropContent>["stackComparison"]["rows"][number];
  columnLabels: {
    category: string;
    currentCoverage: string;
    stopsAt: string;
    praedixaAdd: string;
  };
}) {
  const isPraedixaRow = row.category === "Praedixa";
  const Icon = isPraedixaRow ? DecisionGraphIcon : DatabaseStackIcon;

  return (
    <MotionStaggerItem>
      <article className={getRowShellClasses(isPraedixaRow)}>
        <div>
          <div className="flex items-start gap-3">
            <span className={getRowIconClasses(isPraedixaRow)}>
              <Icon size={18} />
            </span>
            <div>
              <MobileLabel>{columnLabels.category}</MobileLabel>
              <h3 className="text-lg font-semibold tracking-tight text-ink">
                {row.category}
              </h3>
            </div>
          </div>
        </div>

        <ComparisonCell
          mobileLabel={columnLabels.currentCoverage}
          body={row.currentCoverage}
        />
        <ComparisonCell mobileLabel={columnLabels.stopsAt} body={row.stopsAt} />
        <ComparisonCell
          mobileLabel={columnLabels.praedixaAdd}
          body={row.praedixaAdd}
          accent={isPraedixaRow}
        />
      </article>
    </MotionStaggerItem>
  );
}

function getRowShellClasses(accent: boolean) {
  const baseClasses =
    "grid grid-cols-1 gap-5 px-5 py-6 md:grid-cols-[0.78fr_1.08fr_1.08fr_1.08fr] md:gap-5 md:px-6";

  return accent
    ? `${baseClasses} bg-[linear-gradient(180deg,rgba(244,231,198,0.52)_0%,rgba(255,255,255,0.96)_100%)]`
    : `${baseClasses} bg-white/90`;
}

function getRowIconClasses(accent: boolean) {
  const baseClasses =
    "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border";

  return accent
    ? `${baseClasses} border-amber-300/80 bg-amber-100/70 text-brass-700`
    : `${baseClasses} border-neutral-200 bg-neutral-50 text-neutral-700`;
}

function ColumnLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgba(255,255,255,0.72)]">
      {children}
    </p>
  );
}

function MobileLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500 md:hidden">
      {children}
    </p>
  );
}

function ComparisonCell({
  mobileLabel,
  body,
  accent = false,
}: {
  mobileLabel: string;
  body: string;
  accent?: boolean;
}) {
  return (
    <div>
      <MobileLabel>{mobileLabel}</MobileLabel>
      <p
        className={`text-sm leading-relaxed ${
          accent ? "text-neutral-900" : "text-neutral-700"
        }`}
      >
        {body}
      </p>
    </div>
  );
}
