"use client";

import { useMemo, useState } from "react";
import {
  MOCK_ACTIONS,
  MOCK_ALERTS,
  MOCK_FORECAST_POINTS,
  MOCK_GENERATED_AT,
  MOCK_KPIS,
} from "@/lib/demo/mock-data";
import type { DemoViewId } from "@/lib/demo/types";
import type { Dictionary } from "@/lib/i18n/types";

interface PreviewEmbeddedDemoProps {
  dict: Dictionary;
}

function badgeClass(status: "planned" | "in_progress" | "completed") {
  if (status === "completed")
    return "border-emerald-300/40 bg-emerald-500/15 text-emerald-100";
  if (status === "in_progress")
    return "border-blue-300/40 bg-blue-500/15 text-blue-100";
  return "border-amber-300/40 bg-amber-500/15 text-amber-100";
}

export function PreviewEmbeddedDemo({ dict }: PreviewEmbeddedDemoProps) {
  const [activeTab, setActiveTab] = useState<DemoViewId>("dashboard");

  const tabs = useMemo(
    () => [
      { id: "dashboard" as const, label: dict.demo.nav.dashboard },
      { id: "forecasts" as const, label: dict.demo.nav.forecasts },
      { id: "actions" as const, label: dict.demo.nav.actions },
    ],
    [dict.demo.nav.actions, dict.demo.nav.dashboard, dict.demo.nav.forecasts],
  );

  return (
    <div className="h-full w-full overflow-hidden bg-[radial-gradient(ellipse_at_top,oklch(0.23_0.06_247)_0%,oklch(0.16_0.03_247)_52%,oklch(0.1_0.02_247)_100%)] text-white">
      <div className="flex h-full">
        <aside className="w-28 border-r border-white/10 bg-black/20 p-2">
          <div className="mb-2 rounded border border-white/15 bg-white/[0.04] px-1.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-blue-100/90">
            Demo
          </div>
          <nav className="space-y-1" aria-label="Preview demo navigation">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`block w-full rounded px-2 py-1.5 text-left text-[10px] font-medium transition ${
                    isActive
                      ? "border border-blue-300/45 bg-blue-500/20 text-white"
                      : "border border-transparent bg-white/[0.03] text-blue-100/75 hover:border-white/15 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="flex-1 p-2">
          <header className="mb-2 flex items-center justify-between rounded border border-white/10 bg-white/[0.04] px-2 py-1.5">
            <p className="truncate text-[10px] font-semibold text-blue-100/90">
              {dict.demo.title}
            </p>
            <p className="text-[9px] text-blue-100/65">
              {new Date(MOCK_GENERATED_AT).toLocaleTimeString()}
            </p>
          </header>

          {activeTab === "dashboard" ? (
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-1.5">
                {MOCK_KPIS.slice(0, 4).map((kpi) => (
                  <article
                    key={kpi.id}
                    className="rounded border border-white/10 bg-white/[0.04] p-1.5"
                  >
                    <p className="truncate text-[9px] text-blue-100/65">
                      {kpi.label}
                    </p>
                    <p className="mt-1 truncate text-[11px] font-semibold text-white">
                      {kpi.value}
                    </p>
                  </article>
                ))}
              </div>
              <div className="rounded border border-white/10 bg-white/[0.03] p-1.5">
                <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-blue-100/70">
                  {dict.demo.sections.alerts}
                </p>
                <div className="space-y-1">
                  {MOCK_ALERTS.slice(0, 3).map((alert) => (
                    <div
                      key={alert.id}
                      className="rounded border border-white/10 bg-black/20 px-1.5 py-1"
                    >
                      <p className="truncate text-[10px] text-white">
                        {alert.title}
                      </p>
                      <p className="truncate text-[9px] text-blue-100/65">
                        {alert.site}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "forecasts" ? (
            <div className="rounded border border-white/10 bg-white/[0.03] p-2">
              <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-blue-100/70">
                {dict.demo.sections.forecastWindow}
              </p>
              <div className="grid grid-cols-7 gap-1">
                {MOCK_FORECAST_POINTS.map((point) => (
                  <article
                    key={point.day}
                    className="rounded border border-white/10 bg-black/20 p-1"
                  >
                    <div className="flex h-14 items-end gap-1">
                      <div
                        className="w-1/2 rounded-sm bg-blue-100/35"
                        style={{ height: `${point.requiredCoverage}%` }}
                      />
                      <div
                        className="w-1/2 rounded-sm bg-gradient-to-t from-blue-300/80 to-emerald-300/80"
                        style={{ height: `${point.predictedCoverage}%` }}
                      />
                    </div>
                    <p className="mt-1 text-center text-[9px] text-blue-100/90">
                      {point.day}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {activeTab === "actions" ? (
            <div className="rounded border border-white/10 bg-white/[0.03] p-1.5">
              <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-blue-100/70">
                {dict.demo.sections.decisions}
              </p>
              <div className="space-y-1">
                {MOCK_ACTIONS.slice(0, 4).map((action) => (
                  <article
                    key={action.id}
                    className="flex items-center justify-between gap-2 rounded border border-white/10 bg-black/20 px-1.5 py-1"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[10px] text-white">
                        {action.action}
                      </p>
                      <p className="truncate text-[9px] text-blue-100/65">
                        {action.owner}
                      </p>
                    </div>
                    <span
                      className={`rounded border px-1 py-0.5 text-[8px] font-semibold uppercase ${badgeClass(action.status)}`}
                    >
                      {action.status}
                    </span>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
