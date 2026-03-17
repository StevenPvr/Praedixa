import { cn } from "../../../lib/utils";
import { ChipV2 } from "./ChipV2";

/* ------------------------------------------------------------------ */
/*  Static decision-console snapshot for the hero section.            */
/*  Shows a mini-dashboard: active signal, three compared options,    */
/*  and the retained decision with a proof-score highlight.           */
/* ------------------------------------------------------------------ */

interface DecisionConsoleCardProps {
  locale: "fr" | "en";
  className?: string;
}

/* ── Locale dictionaries ── */

const COPY = {
  fr: {
    signalBadge: "Signal actif",
    optionsTitle: "Options comparees",
    options: [
      { name: "Renfort local", cost: "1 240 \u20AC", risk: "Faible" },
      { name: "Reallocation", cost: "860 \u20AC", risk: "Moyen" },
      { name: "Report de service", cost: "0 \u20AC", risk: "Eleve" },
    ],
    retainedLabel: "Decision retenue",
    scoreLabel: "Score",
  },
  en: {
    signalBadge: "Active signal",
    optionsTitle: "Compared options",
    options: [
      { name: "Local reinforcement", cost: "\u20AC1,240", risk: "Low" },
      { name: "Reallocation", cost: "\u20AC860", risk: "Medium" },
      { name: "Service postponement", cost: "\u20AC0", risk: "High" },
    ],
    retainedLabel: "Retained decision",
    scoreLabel: "Score",
  },
} as const;

type RiskLevel = "Faible" | "Low" | "Moyen" | "Medium" | "Eleve" | "High";

function riskColor(level: RiskLevel): string {
  switch (level) {
    case "Faible":
    case "Low":
      return "bg-proof-100 text-proof-500";
    case "Moyen":
    case "Medium":
      return "bg-risk-100 text-risk-500";
    case "Eleve":
    case "High":
      return "bg-red-50 text-danger-500";
  }
}

/* ── Option row ── */

interface OptionRowProps {
  name: string;
  cost: string;
  risk: RiskLevel;
  selected?: boolean;
}

function OptionRow({ name, cost, risk, selected = false }: OptionRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
        selected
          ? "border-l-[3px] border-proof-500 bg-proof-100/40 pl-[9px]"
          : "border-l-[3px] border-transparent",
      )}
    >
      <span
        className={cn(
          "flex-1 truncate text-sm",
          selected ? "font-semibold text-ink-950" : "text-ink-700",
        )}
      >
        {name}
      </span>

      <span className="w-16 text-right font-mono text-xs text-ink-700">
        {cost}
      </span>

      <span
        className={cn(
          "inline-flex items-center rounded-chip px-2 py-0.5 text-2xs font-medium",
          riskColor(risk),
        )}
      >
        {risk}
      </span>
    </div>
  );
}

function ConsoleOptionsList({
  options,
}: {
  options: readonly { name: string; cost: string; risk: RiskLevel }[];
}) {
  return (
    <div className="space-y-1">
      {options.map((option, index) => (
        <OptionRow
          key={option.name}
          name={option.name}
          cost={option.cost}
          risk={option.risk}
          selected={index === 0}
        />
      ))}
    </div>
  );
}

function RetainedDecisionSummary({
  option,
  scoreLabel,
  retainedLabel,
}: {
  option: { name: string };
  scoreLabel: string;
  retainedLabel: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-2xs font-medium uppercase tracking-wider text-ink-600">
          {retainedLabel}
        </p>
        <p className="mt-0.5 text-sm font-semibold text-ink-950">
          {option.name}
        </p>
      </div>
      <div className="text-right">
        <p className="text-2xs font-medium uppercase tracking-wider text-ink-600">
          {scoreLabel}
        </p>
        <p className="mt-0.5 font-mono text-lg font-semibold text-proof-500">
          92/100
        </p>
      </div>
    </div>
  );
}

/* ── Main component ── */

export function DecisionConsoleCard({
  locale,
  className,
}: DecisionConsoleCardProps) {
  const t = COPY[locale];
  const options = t.options as readonly {
    name: string;
    cost: string;
    risk: RiskLevel;
  }[];
  const selectedOption = options[0] ?? {
    name: "—",
    cost: "—",
    risk: "Low" as RiskLevel,
  };

  return (
    <div
      className={cn(
        "w-full rounded-panel border border-v2-border-100 bg-surface-0 p-5 shadow-2",
        className,
      )}
    >
      <div className="mb-4">
        <ChipV2 variant="signal" label={t.signalBadge} />
      </div>

      <p className="mb-2 text-2xs font-semibold uppercase tracking-wider text-ink-600">
        {t.optionsTitle}
      </p>

      <ConsoleOptionsList options={options} />

      <div className="my-4 h-px bg-v2-border-100" />

      <RetainedDecisionSummary
        option={selectedOption}
        retainedLabel={t.retainedLabel}
        scoreLabel={t.scoreLabel}
      />
    </div>
  );
}
