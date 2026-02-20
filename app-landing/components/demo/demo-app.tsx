"use client";

import { useEffect, useState } from "react";
import { DemoActionsView } from "./demo-actions-view";
import { DemoDashboardView } from "./demo-dashboard-view";
import { DemoDatasetsView } from "./demo-datasets-view";
import { DemoForecastsView } from "./demo-forecasts-view";
import { DemoSettingsView } from "./demo-settings-view";
import { DemoSidebar } from "./demo-sidebar";
import { DemoTopbar } from "./demo-topbar";
import {
  getActionsPayload,
  getDashboardPayload,
  getDatasetsPayload,
  getForecastsPayload,
  getSettingsPayload,
} from "@/lib/demo/mock-service";
import type {
  DemoActionsPayload,
  DemoDashboardPayload,
  DemoDatasetsPayload,
  DemoForecastsPayload,
  DemoSettingsPayload,
  DemoViewId,
} from "@/lib/demo/types";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/types";

interface DemoAppProps {
  dict: Dictionary;
  locale: Locale;
}

type DemoScreenPayload =
  | DemoDashboardPayload
  | DemoForecastsPayload
  | DemoActionsPayload
  | DemoDatasetsPayload
  | DemoSettingsPayload;

const DEFAULT_VIEW: DemoViewId = "dashboard";

export function DemoApp({ dict, locale }: DemoAppProps) {
  const [activeView, setActiveView] = useState<DemoViewId>(DEFAULT_VIEW);
  const [payload, setPayload] = useState<DemoScreenPayload | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setIsLoading(true);
      setHasError(false);

      try {
        if (activeView === "dashboard") {
          const response = await getDashboardPayload();
          if (!isMounted) return;
          setPayload(response.data);
          setGeneratedAt(response.generatedAt);
          setIsLoading(false);
          return;
        }

        if (activeView === "forecasts") {
          const response = await getForecastsPayload();
          if (!isMounted) return;
          setPayload(response.data);
          setGeneratedAt(response.generatedAt);
          setIsLoading(false);
          return;
        }

        if (activeView === "actions") {
          const response = await getActionsPayload();
          if (!isMounted) return;
          setPayload(response.data);
          setGeneratedAt(response.generatedAt);
          setIsLoading(false);
          return;
        }

        if (activeView === "datasets") {
          const response = await getDatasetsPayload();
          if (!isMounted) return;
          setPayload(response.data);
          setGeneratedAt(response.generatedAt);
          setIsLoading(false);
          return;
        }

        const response = await getSettingsPayload();
        if (!isMounted) return;
        setPayload(response.data);
        setGeneratedAt(response.generatedAt);
        setIsLoading(false);
      } catch {
        if (!isMounted) return;
        setPayload(null);
        setHasError(true);
        setIsLoading(false);
      }
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, [activeView, retryKey]);

  const content = (() => {
    if (isLoading) {
      return (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-sm text-blue-100/70">
          {dict.demo.loading}
        </div>
      );
    }

    if (hasError) {
      return (
        <div className="rounded-xl border border-red-300/30 bg-red-500/10 p-6 text-sm text-red-100">
          <p>{dict.demo.error}</p>
          <button
            type="button"
            onClick={() => setRetryKey((value) => value + 1)}
            className="mt-3 inline-flex rounded-md border border-red-200/40 bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-500/30"
          >
            {dict.demo.retry}
          </button>
        </div>
      );
    }

    if (!payload) {
      return (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-sm text-blue-100/70">
          {dict.demo.empty}
        </div>
      );
    }

    if (activeView === "dashboard") {
      return (
        <DemoDashboardView
          copy={dict.demo}
          payload={payload as DemoDashboardPayload}
        />
      );
    }

    if (activeView === "forecasts") {
      return (
        <DemoForecastsView
          copy={dict.demo}
          payload={payload as DemoForecastsPayload}
        />
      );
    }

    if (activeView === "actions") {
      return (
        <DemoActionsView
          copy={dict.demo}
          payload={payload as DemoActionsPayload}
        />
      );
    }

    if (activeView === "datasets") {
      return (
        <DemoDatasetsView
          copy={dict.demo}
          payload={payload as DemoDatasetsPayload}
        />
      );
    }

    return (
      <DemoSettingsView
        copy={dict.demo}
        payload={payload as DemoSettingsPayload}
      />
    );
  })();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top,oklch(0.23_0.06_247)_0%,oklch(0.14_0.03_247)_46%,oklch(0.1_0.02_247)_100%)] px-3 py-5 sm:px-5 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-7xl rounded-2xl border border-white/15 bg-black/20 shadow-[0_28px_70px_-30px_oklch(0.06_0.02_247_/_0.92)] backdrop-blur-sm">
        <DemoTopbar
          locale={locale}
          dict={dict.demo}
          generatedAt={generatedAt}
        />
        <p className="mx-4 mt-4 rounded-md border border-blue-200/25 bg-blue-500/10 px-3 py-2 text-xs text-blue-50/95 sm:mx-6 lg:mx-8">
          {dict.demo.mockBanner}
        </p>

        <div className="mt-4 flex flex-col lg:min-h-[560px] lg:flex-row">
          <DemoSidebar
            activeView={activeView}
            onSelect={(view) => setActiveView(view)}
            labels={dict.demo.nav}
          />
          <section
            className="flex-1 px-4 pb-6 pt-4 sm:px-6 lg:px-8"
            aria-label={dict.demo.screenAriaLabel}
          >
            {content}
          </section>
        </div>
      </div>
    </main>
  );
}
