"use client";

import Link from "next/link";
import { CheckCircle2, Circle, Rocket, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { DetailCard } from "@/components/ui/detail-card";
import { StatusBanner } from "@/components/status-banner";
import { useApiGet } from "@/hooks/use-api";
import { ErrorFallback } from "@/components/error-fallback";
import { PageTransition } from "@/components/page-transition";
import { useSiteScope } from "@/lib/site-scope";
import { LIVE_DATA_POLL_INTERVAL_MS } from "@/lib/chat-config";

interface OnboardingStep {
  id: string;
  label: string;
  description: string;
  completed: boolean;
}

interface OnboardingStatus {
  completedSteps: number;
  totalSteps: number;
  completionPct: number;
  steps: OnboardingStep[];
}

function linkForStep(stepId: string): string {
  switch (stepId) {
    case "data_connected":
      return "/donnees";
    case "forecast_ready":
      return "/previsions";
    case "monitoring_ready":
      return "/previsions/modeles";
    case "decision_ready":
      return "/actions";
    case "reporting_ready":
      return "/rapports";
    default:
      return "/dashboard";
  }
}

export default function OnboardingPage() {
  const { appendSiteParam } = useSiteScope();
  const { data, loading, error, refetch } = useApiGet<OnboardingStatus>(
    appendSiteParam("/api/v1/live/onboarding/status"),
    { pollInterval: LIVE_DATA_POLL_INTERVAL_MS },
  );

  const remainingSteps = (data?.totalSteps ?? 0) - (data?.completedSteps ?? 0);

  return (
    <PageTransition>
      <div className="min-h-full space-y-12">
        <PageHeader
          eyebrow="Pilotage"
          title="Onboarding client"
          subtitle="Suivez la mise en route des pre-requis pour un pilotage fiable et actionnable."
        />

        {loading ? (
          <StatusBanner variant="info" title="Evaluation de readiness en cours">
            Verification automatique des etapes de mise en route.
          </StatusBanner>
        ) : remainingSteps > 0 ? (
          <StatusBanner variant="warning" title="Onboarding incomplet">
            {remainingSteps} etape(s) restent a finaliser pour atteindre 100% de
            readiness.
          </StatusBanner>
        ) : (
          <StatusBanner variant="success" title="Onboarding termine">
            Tous les pre-requis sont valides. Votre espace est operationnel.
          </StatusBanner>
        )}

        {error ? (
          <ErrorFallback message={error} onRetry={refetch} />
        ) : (
          <DetailCard>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-overline text-ink-tertiary">Progression</p>
                <h2 className="text-heading text-ink font-sans font-bold">
                  {(data?.completionPct ?? 0).toFixed(0)}% complete
                </h2>
              </div>
              <div className="rounded-xl border border-border bg-surface-sunken px-4 py-2 text-right">
                <p className="text-caption text-ink-secondary">
                  Etapes completees
                </p>
                <p className="text-title-sm text-ink">
                  {data?.completedSteps ?? 0} / {data?.totalSteps ?? 0}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {(data?.steps ?? []).map((step) => (
                <div
                  key={step.id}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    {step.completed ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" />
                    ) : (
                      <Circle className="mt-0.5 h-5 w-5 text-ink-tertiary" />
                    )}
                    <div>
                      <p className="text-title-sm text-ink">{step.label}</p>
                      <p className="text-body-sm text-ink-secondary">
                        {step.description}
                      </p>
                    </div>
                  </div>
                  <Button
                    asChild
                    variant={step.completed ? "outline" : "default"}
                  >
                    <Link href={linkForStep(step.id)}>
                      Ouvrir
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </DetailCard>
        )}

        <DetailCard>
          <div className="flex items-center gap-3 text-body-sm text-ink-secondary">
            <Rocket className="h-5 w-5 text-primary" />
            Checklist calculee automatiquement a partir des donnees Gold et des
            signaux operationnels disponibles.
          </div>
        </DetailCard>
      </div>
    </PageTransition>
  );
}
