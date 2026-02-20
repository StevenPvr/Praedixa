import type { DemoDashboardPayload, DemoRiskLevel } from "@/lib/demo/types";
import type { Dictionary } from "@/lib/i18n/types";

interface DemoDashboardViewProps {
  copy: Dictionary["demo"];
  payload: DemoDashboardPayload;
}

function riskClassName(risk: DemoRiskLevel) {
  if (risk === "high") return "border-red-300/45 bg-red-500/15 text-red-100";
  if (risk === "medium")
    return "border-amber-300/45 bg-amber-500/15 text-amber-100";
  return "border-emerald-300/45 bg-emerald-500/15 text-emerald-100";
}

function trendColor(trend: "up" | "down" | "steady") {
  if (trend === "up") return "text-emerald-300";
  if (trend === "down") return "text-red-300";
  return "text-blue-200";
}

export function DemoDashboardView({ copy, payload }: DemoDashboardViewProps) {
  return (
    <div className="space-y-6">
      <section aria-labelledby="demo-kpi-title">
        <h2
          id="demo-kpi-title"
          className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-100/70"
        >
          {copy.sections.kpis}
        </h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {payload.kpis.map((kpi) => (
            <article
              key={kpi.id}
              className="rounded-xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_8px_24px_-14px_oklch(0.07_0.02_247_/_0.9)]"
            >
              <p className="text-xs text-blue-100/70">{kpi.label}</p>
              <p className="mt-2 font-serif text-2xl text-white">{kpi.value}</p>
              <p className={`mt-2 text-xs ${trendColor(kpi.trend)}`}>
                {kpi.delta}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="demo-alerts-title">
        <h2
          id="demo-alerts-title"
          className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-100/70"
        >
          {copy.sections.alerts}
        </h2>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          {payload.alerts.map((alert) => (
            <article
              key={alert.id}
              className="rounded-xl border border-white/10 bg-white/[0.04] p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-white">
                  {alert.title}
                </p>
                <span
                  className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase ${riskClassName(alert.risk)}`}
                >
                  {alert.risk}
                </span>
              </div>
              <p className="mt-2 text-xs text-blue-100/65">{alert.site}</p>
              <p className="mt-3 text-xs text-blue-100/80">
                {alert.recommendation}
              </p>
              <p className="mt-2 text-[11px] text-blue-100/55">
                ETA: {alert.eta}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="demo-decisions-title">
        <h2
          id="demo-decisions-title"
          className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-100/70"
        >
          {copy.sections.decisions}
        </h2>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          {payload.decisions.map((decision) => (
            <article
              key={decision.id}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
            >
              <p className="text-sm font-medium text-white">{decision.title}</p>
              <p className="mt-2 text-xs text-blue-100/75">{decision.impact}</p>
              <p className="mt-1 text-xs text-blue-100/60">
                Band: {decision.costBand}
              </p>
              <div className="mt-3 h-2 rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-300 to-emerald-300"
                  style={{ width: `${decision.confidence}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-blue-100/60">
                Confidence {decision.confidence}%
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
