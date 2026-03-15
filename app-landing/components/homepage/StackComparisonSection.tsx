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
        <MotionReveal>
          <Kicker>{copy.kicker}</Kicker>
          <h2 className="mt-3 max-w-4xl text-4xl font-bold leading-none tracking-tighter text-ink md:text-6xl">
            {copy.heading}
          </h2>
          <p className="mt-5 max-w-[70ch] text-base leading-relaxed text-neutral-600">
            {copy.subheading}
          </p>
        </MotionReveal>

        <MotionReveal direction="right" delay={0.14}>
          <aside className="rounded-[1.8rem] border border-amber-200/80 bg-amber-50/80 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_24px_48px_-36px_rgba(15,23,42,0.24)]">
            <div className="flex items-start gap-3">
              <DecisionGraphIcon
                size={20}
                className="mt-0.5 shrink-0 text-brass-700"
              />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brass-700">
                  {locale === "fr"
                    ? "Ce que Praedixa change"
                    : "What Praedixa changes"}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-neutral-700">
                  {copy.bottomNote}
                </p>
              </div>
            </div>
          </aside>
        </MotionReveal>
      </div>

      <div className="mt-12 overflow-hidden rounded-[2rem] border border-neutral-200/80 bg-white/92 shadow-[0_30px_70px_-54px_rgba(15,23,42,0.3)]">
        <div className="hidden border-b border-neutral-200/80 bg-neutral-950 px-6 py-4 md:grid md:grid-cols-[0.78fr_1.08fr_1.08fr_1.08fr] md:gap-5">
          <ColumnLabel>{copy.columnLabels.category}</ColumnLabel>
          <ColumnLabel>{copy.columnLabels.currentCoverage}</ColumnLabel>
          <ColumnLabel>{copy.columnLabels.stopsAt}</ColumnLabel>
          <ColumnLabel>{copy.columnLabels.praedixaAdd}</ColumnLabel>
        </div>

        <MotionStagger className="divide-y divide-neutral-200/80">
          {copy.rows.map((row) => {
            const isPraedixaRow = row.category === "Praedixa";
            const Icon = isPraedixaRow ? DecisionGraphIcon : DatabaseStackIcon;

            return (
              <MotionStaggerItem key={row.category}>
                <article
                  className={`grid grid-cols-1 gap-5 px-5 py-6 md:grid-cols-[0.78fr_1.08fr_1.08fr_1.08fr] md:gap-5 md:px-6 ${
                    isPraedixaRow
                      ? "bg-[linear-gradient(180deg,rgba(244,231,198,0.52)_0%,rgba(255,255,255,0.96)_100%)]"
                      : "bg-white/90"
                  }`}
                >
                  <div>
                    <div className="flex items-start gap-3">
                      <span
                        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${
                          isPraedixaRow
                            ? "border-amber-300/80 bg-amber-100/70 text-brass-700"
                            : "border-neutral-200 bg-neutral-50 text-neutral-700"
                        }`}
                      >
                        <Icon size={18} />
                      </span>
                      <div>
                        <MobileLabel>{copy.columnLabels.category}</MobileLabel>
                        <h3 className="text-lg font-semibold tracking-tight text-ink">
                          {row.category}
                        </h3>
                      </div>
                    </div>
                  </div>

                  <ComparisonCell
                    mobileLabel={copy.columnLabels.currentCoverage}
                    body={row.currentCoverage}
                  />
                  <ComparisonCell
                    mobileLabel={copy.columnLabels.stopsAt}
                    body={row.stopsAt}
                  />
                  <ComparisonCell
                    mobileLabel={copy.columnLabels.praedixaAdd}
                    body={row.praedixaAdd}
                    accent={isPraedixaRow}
                  />
                </article>
              </MotionStaggerItem>
            );
          })}
        </MotionStagger>
      </div>
    </SectionShell>
  );
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
