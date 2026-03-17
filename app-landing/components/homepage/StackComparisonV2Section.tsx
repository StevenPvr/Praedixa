import type { Locale } from "../../lib/i18n/config";
import { getValuePropContent } from "../../lib/content/value-prop";
import { SectionShellV2 } from "../shared/SectionShellV2";
import { Kicker } from "../shared/Kicker";

interface StackComparisonV2SectionProps {
  locale: Locale;
}

export function StackComparisonV2Section({
  locale,
}: StackComparisonV2SectionProps) {
  const vp = getValuePropContent(locale);
  const sc = vp.stackComparison;

  return (
    <SectionShellV2 id="comparatif">
      <StackComparisonV2Header
        kicker={sc.kicker}
        heading={sc.heading}
        subheading={sc.subheading}
      />
      <StackComparisonDesktop table={sc} />
      <StackComparisonMobile table={sc} />
      <p className="mt-8 text-center text-sm text-ink-600">{sc.bottomNote}</p>
    </SectionShellV2>
  );
}

type StackComparisonTable = ReturnType<
  typeof getValuePropContent
>["stackComparison"];

function StackComparisonV2Header({
  kicker,
  heading,
  subheading,
}: {
  kicker: string;
  heading: string;
  subheading: string;
}) {
  return (
    <div className="mx-auto max-w-text">
      <Kicker>{kicker}</Kicker>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink-950 md:text-4xl">
        {heading}
      </h2>
      <p className="mt-4 text-base leading-relaxed text-ink-700">
        {subheading}
      </p>
    </div>
  );
}

function StackComparisonDesktop({ table }: { table: StackComparisonTable }) {
  return (
    <div className="mt-12 hidden overflow-x-auto lg:block">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-v2-border-200">
            <StackComparisonHeaderCell accent={false}>
              {table.columnLabels.category}
            </StackComparisonHeaderCell>
            <StackComparisonHeaderCell accent={false}>
              {table.columnLabels.currentCoverage}
            </StackComparisonHeaderCell>
            <StackComparisonHeaderCell accent={false}>
              {table.columnLabels.stopsAt}
            </StackComparisonHeaderCell>
            <StackComparisonHeaderCell accent>
              {table.columnLabels.praedixaAdd}
            </StackComparisonHeaderCell>
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, index) => (
            <StackComparisonDesktopRow
              key={row.category}
              row={row}
              index={index}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StackComparisonHeaderCell({
  accent,
  children,
}: {
  accent: boolean;
  children: React.ReactNode;
}) {
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] ${
        accent ? "text-proof-500" : "text-ink-600"
      }`}
    >
      {children}
    </th>
  );
}

function StackComparisonDesktopRow({
  row,
  index,
}: {
  row: StackComparisonTable["rows"][number];
  index: number;
}) {
  const isPraedixa = row.category === "Praedixa";
  const backgroundClass = isPraedixa
    ? "bg-proof-100"
    : index % 2 === 0
      ? "bg-surface-0"
      : "bg-surface-50";

  return (
    <tr
      key={row.category}
      className={`border-b border-v2-border-100 ${backgroundClass}`}
    >
      <td className="px-4 py-4 font-semibold text-ink-950">{row.category}</td>
      <td className="px-4 py-4 text-ink-700">{row.currentCoverage}</td>
      <td className="px-4 py-4 text-ink-700">{row.stopsAt}</td>
      <td
        className={`px-4 py-4 ${isPraedixa ? "font-medium text-ink-950" : "text-proof-500"}`}
      >
        {row.praedixaAdd}
      </td>
    </tr>
  );
}

function StackComparisonMobile({ table }: { table: StackComparisonTable }) {
  return (
    <div className="mt-10 space-y-4 lg:hidden">
      {table.rows.map((row) => (
        <StackComparisonMobileCard
          key={row.category}
          row={row}
          columnLabels={table.columnLabels}
        />
      ))}
    </div>
  );
}

function StackComparisonMobileCard({
  row,
  columnLabels,
}: {
  row: StackComparisonTable["rows"][number];
  columnLabels: StackComparisonTable["columnLabels"];
}) {
  const isPraedixa = row.category === "Praedixa";

  return (
    <div
      className={`rounded-card border p-5 ${
        isPraedixa
          ? "border-proof-500 bg-proof-100"
          : "border-v2-border-200 bg-surface-0"
      }`}
    >
      <p className="text-sm font-semibold text-ink-950">{row.category}</p>
      <dl className="mt-3 space-y-2 text-sm">
        <StackComparisonMobileField label={columnLabels.currentCoverage}>
          {row.currentCoverage}
        </StackComparisonMobileField>
        <StackComparisonMobileField label={columnLabels.stopsAt}>
          {row.stopsAt}
        </StackComparisonMobileField>
        <StackComparisonMobileField label={columnLabels.praedixaAdd} accent>
          {row.praedixaAdd}
        </StackComparisonMobileField>
      </dl>
    </div>
  );
}

function StackComparisonMobileField({
  label,
  accent = false,
  children,
}: {
  label: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt
        className={`text-xs font-medium uppercase tracking-wide ${
          accent ? "text-proof-500" : "text-ink-600"
        }`}
      >
        {label}
      </dt>
      <dd
        className={`mt-0.5 ${accent ? "font-medium text-ink-950" : "text-ink-700"}`}
      >
        {children}
      </dd>
    </div>
  );
}
