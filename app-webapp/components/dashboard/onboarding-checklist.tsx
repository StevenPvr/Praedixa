"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { Button } from "@praedixa/ui";
import { DetailCard } from "@/components/ui/detail-card";
import { useI18n } from "@/lib/i18n/provider";
import { trackProductEvent } from "@/lib/product-events";

const ONBOARDING_KEY = "praedixa_onboarding_v1";

interface ChecklistState {
  done: string[];
}

interface Step {
  id: string;
  label: string;
  href: string;
}

function loadState(): ChecklistState {
  if (typeof window === "undefined") return { done: [] };
  const storage = window.localStorage as Partial<Storage> | undefined;
  if (!storage || typeof storage.getItem !== "function") {
    return { done: [] };
  }
  const raw = storage.getItem(ONBOARDING_KEY);
  if (!raw) return { done: [] };
  try {
    const parsed = JSON.parse(raw) as ChecklistState;
    return {
      done: Array.isArray(parsed.done) ? parsed.done : [],
    };
  } catch {
    return { done: [] };
  }
}

function persistState(state: ChecklistState) {
  if (typeof window === "undefined") return;
  const storage = window.localStorage as Partial<Storage> | undefined;
  if (!storage || typeof storage.setItem !== "function") return;
  storage.setItem(ONBOARDING_KEY, JSON.stringify(state));
}

export function OnboardingChecklist() {
  const { t } = useI18n();
  const [state, setState] = useState<ChecklistState>(() => loadState());

  const steps = useMemo<Step[]>(
    () => [
      {
        id: "data",
        label: t("dashboard.onboardingSteps.data"),
        href: "/donnees",
      },
      {
        id: "forecast",
        label: t("dashboard.onboardingSteps.forecast"),
        href: "/previsions",
      },
      {
        id: "decision",
        label: t("dashboard.onboardingSteps.decision"),
        href: "/actions",
      },
      {
        id: "support",
        label: t("dashboard.onboardingSteps.support"),
        href: "/messages",
      },
      {
        id: "report",
        label: t("dashboard.onboardingSteps.report"),
        href: "/rapports",
      },
    ],
    [t],
  );

  const completed = state.done.length;
  const allDone = completed >= steps.length;

  function markDone(stepId: string) {
    setState((current) => {
      if (current.done.includes(stepId)) return current;
      const next = { done: [...current.done, stepId] };
      persistState(next);
      void trackProductEvent("onboarding_step_completed", { stepId });
      return next;
    });
  }

  function resetChecklist() {
    const next = { done: [] };
    setState(next);
    persistState(next);
  }

  return (
    <DetailCard>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-base font-semibold text-charcoal">
            {t("dashboard.onboardingTitle")}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {t("dashboard.onboardingSubtitle")}
          </p>
        </div>
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
          {completed}/{steps.length}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {steps.map((step) => {
          const isDone = state.done.includes(step.id);
          return (
            <div
              key={step.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Circle className="h-4 w-4 text-gray-400" />
                )}
                <Link
                  href={step.href}
                  className="text-sm text-charcoal hover:text-amber-600"
                >
                  {step.label}
                </Link>
              </div>
              {!isDone && (
                <Button
                  onClick={() => markDone(step.id)}
                  className="h-8 bg-white px-3 text-xs text-charcoal hover:bg-gray-100"
                >
                  {t("dashboard.onboardingMarkDone")}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {allDone ? (
        <p className="mt-4 text-sm font-medium text-green-700">
          {t("dashboard.onboardingDone")}
        </p>
      ) : null}

      <button
        onClick={resetChecklist}
        className="mt-4 text-xs font-medium text-gray-500 hover:text-gray-700"
      >
        {t("dashboard.onboardingReset")}
      </button>
    </DetailCard>
  );
}
