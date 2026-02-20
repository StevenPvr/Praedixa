import type { DemoForecastsPayload, DemoRiskLevel } from "@/lib/demo/types";
import type { Dictionary } from "@/lib/i18n/types";

interface DemoForecastsViewProps {
  copy: Dictionary["demo"];
  payload: DemoForecastsPayload;
}

function riskTextColor(risk: DemoRiskLevel) {
  if (risk === "high") return "text-red-200";
  if (risk === "medium") return "text-amber-200";
  return "text-emerald-200";
}

function barColor(risk: DemoRiskLevel) {
  if (risk === "high") return "from-red-300/80 to-red-500/80";
  if (risk === "medium") return "from-amber-300/80 to-amber-500/80";
  return "from-emerald-300/80 to-emerald-500/80";
}

export function DemoForecastsView({ copy, payload }: DemoForecastsViewProps) {
  return (
    <section
      aria-labelledby="demo-forecast-window-title"
      className="rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h2
          id="demo-forecast-window-title"
          className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-100/70"
        >
          {copy.sections.forecastWindow}
        </h2>
        <p className="text-xs text-blue-100/65">
          Confidence window: {payload.confidenceWindow}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-2 sm:gap-3">
        {payload.points.map((point) => {
          const requiredHeight = Math.max(12, point.requiredCoverage);
          const predictedHeight = Math.max(12, point.predictedCoverage);

          return (
            <article
              key={point.day}
              className="rounded-lg border border-white/10 bg-black/20 p-2"
            >
              <div className="flex h-40 items-end gap-1.5">
                <div
                  className="w-1/2 rounded-sm bg-blue-100/30"
                  style={{ height: `${requiredHeight}%` }}
                />
                <div
                  className={`w-1/2 rounded-sm bg-gradient-to-t ${barColor(point.risk)}`}
                  style={{ height: `${predictedHeight}%` }}
                />
              </div>
              <p className="mt-2 text-center text-[11px] font-semibold text-white">
                {point.day}
              </p>
              <p
                className={`mt-1 text-center text-[10px] ${riskTextColor(point.risk)}`}
              >
                {point.risk}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
