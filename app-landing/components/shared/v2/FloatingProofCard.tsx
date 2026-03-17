import { cn } from "../../../lib/utils";

/* ------------------------------------------------------------------ */
/*  Mini overlay proof cards for the hero media frame.                */
/*  Pure CSS sparkline / bar chart -- no chart library required.      */
/* ------------------------------------------------------------------ */

interface FloatingProofCardProps {
  variant: "sparkline" | "bars";
  locale: "fr" | "en";
  className?: string;
}

const COPY = {
  sparkline: { fr: "Marge protegee", en: "Protected margin" },
  bars: { fr: "Cout d'urgence", en: "Emergency cost" },
} as const;

/* ── Faux sparkline: ascending bars ── */

function Sparkline() {
  const heights = [28, 40, 36, 56, 64, 80];
  return (
    <div className="flex items-end gap-[3px]" aria-hidden="true">
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-[5px] rounded-sm bg-signal-500/70"
          style={{ height: `${(h / 80) * 24}px` }}
        />
      ))}
    </div>
  );
}

/* ── Faux bar chart: three descending bars ── */

function BarChart() {
  const heights = [80, 52, 36];
  return (
    <div className="flex items-end gap-[5px]" aria-hidden="true">
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-[8px] rounded-sm bg-proof-500/60"
          style={{ height: `${(h / 80) * 24}px` }}
        />
      ))}
    </div>
  );
}

/* ── Main component ── */

export function FloatingProofCard({
  variant,
  locale,
  className,
}: FloatingProofCardProps) {
  const label = COPY[variant][locale];

  const isSparkline = variant === "sparkline";
  const value = isSparkline ? "+12\u202F%" : "-34\u202F%";
  const valueColor = isSparkline ? "text-signal-500" : "text-proof-500";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-3 rounded-card border border-v2-border-100 bg-surface-0/95 px-4 py-3 shadow-1 backdrop-blur-sm",
        className,
      )}
    >
      {/* Text block */}
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-ink-700">{label}</p>
        <p
          className={cn(
            "font-mono text-lg font-semibold leading-tight",
            valueColor,
          )}
        >
          {value}
        </p>
      </div>

      {/* Faux chart */}
      {isSparkline ? <Sparkline /> : <BarChart />}
    </div>
  );
}
