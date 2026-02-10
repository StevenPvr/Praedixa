"use client";

import { useState, useCallback, useMemo } from "react";
import { CheckCircle } from "lucide-react";
import type {
  CoverageAlert,
  ParetoFrontierResponse,
  OperationalDecision,
} from "@praedixa/shared-types";
import { SkeletonChart, Button } from "@praedixa/ui";
import { PageHeader } from "@/components/ui/page-header";
import { DetailCard } from "@/components/ui/detail-card";
import { ParetoChart, type ParetoPoint } from "@/components/ui/pareto-chart";
import { useApiGet, useApiPost } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { AnimatedSection } from "@/components/animated-section";
import { EmptyState } from "@/components/empty-state";
import { ErrorFallback } from "@/components/error-fallback";
import { AlertSelector } from "@/components/actions/alert-selector";
import { OptimizationPanel } from "@/components/actions/optimization-panel";
import { sortAlertsBySeverity, getOptionLabel } from "@/lib/scenario-utils";

interface DecisionBody {
  coverageAlertId: string;
  chosenOptionId: string;
  siteId: string;
  shift: string;
  decisionDate: string;
  horizon: string;
  gapH: number;
}

export default function ActionsPage() {
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  const { toast } = useToast();

  const {
    data: rawAlerts,
    loading: alertsLoading,
    error: alertsError,
    refetch: refetchAlerts,
  } = useApiGet<CoverageAlert[]>("/api/v1/coverage-alerts?status=open");

  const alerts = useMemo(
    () => (rawAlerts ? sortAlertsBySeverity(rawAlerts) : []),
    [rawAlerts],
  );

  // Auto-select first alert when loaded
  const effectiveAlertId =
    selectedAlertId ?? (alerts.length > 0 ? alerts[0].id : null);
  const selectedAlert = alerts.find((a) => a.id === effectiveAlertId) ?? null;

  const {
    data: frontier,
    loading: frontierLoading,
    error: frontierError,
  } = useApiGet<ParetoFrontierResponse>(
    effectiveAlertId ? `/api/v1/scenarios/alert/${effectiveAlertId}` : null,
  );

  const {
    mutate,
    loading: submitting,
    error: submitError,
  } = useApiPost<DecisionBody, OperationalDecision>(
    "/api/v1/operational-decisions",
  );

  const options = frontier?.options ?? [];

  const paretoPoints: ParetoPoint[] = useMemo(
    () =>
      options.map((o) => ({
        id: o.id,
        label: getOptionLabel(o.optionType),
        cost: o.coutTotalEur,
        service: o.serviceAttenduPct,
        isParetoOptimal: o.isParetoOptimal,
        isRecommended: o.isRecommended,
      })),
    [options],
  );

  const handleSelectAlert = useCallback((id: string) => {
    setSelectedAlertId(id);
    setSelectedOptionId(null);
  }, []);

  const handlePointClick = useCallback((point: ParetoPoint) => {
    setSelectedOptionId(point.id);
  }, []);

  const handleValidate = useCallback(async () => {
    const alert = selectedAlert as CoverageAlert;
    const optionId = selectedOptionId as string;

    const body: DecisionBody = {
      coverageAlertId: alert.id,
      chosenOptionId: optionId,
      siteId: alert.siteId,
      shift: alert.shift,
      decisionDate: alert.alertDate,
      horizon: alert.horizon ?? "j7",
      gapH: alert.gapH,
    };

    const result = await mutate(body);
    if (result) {
      toast({
        variant: "success",
        title: "Solution validee",
        description: "La decision a ete enregistree avec succes.",
      });
      // Move to next alert
      const currentIdx = alerts.findIndex((a) => a.id === effectiveAlertId);
      const nextAlert = alerts[currentIdx + 1];
      if (nextAlert) {
        setSelectedAlertId(nextAlert.id);
        setSelectedOptionId(null);
      } else {
        setSelectedAlertId(null);
        setSelectedOptionId(null);
        refetchAlerts();
      }
    }
  }, [
    selectedAlert,
    selectedOptionId,
    mutate,
    toast,
    alerts,
    effectiveAlertId,
    refetchAlerts,
  ]);

  // Error state
  if (alertsError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Actions"
          subtitle="Comparez les solutions et faites votre choix"
        />
        <ErrorFallback
          variant="api"
          message={alertsError}
          onRetry={refetchAlerts}
        />
      </div>
    );
  }

  // No alerts at all after loading
  const noAlerts = !alertsLoading && alerts.length === 0;
  const validateButtonLabel = ["Valider cette solution", "Validation..."][
    Number(submitting)
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Actions"
        subtitle="Comparez les solutions et faites votre choix"
      />

      {/* Alert selector */}
      <AnimatedSection>
        <section aria-label="Selection de l'alerte">
          <h2 className="mb-4 font-serif text-lg font-semibold text-charcoal">
            Alertes actives
          </h2>
          {noAlerts ? (
            <EmptyState
              icon={<CheckCircle className="h-6 w-6 text-green-500" />}
              title="Aucune alerte active"
              description="Tous vos sites sont couverts"
            />
          ) : (
            <AlertSelector
              alerts={alerts}
              selectedId={effectiveAlertId}
              onSelect={handleSelectAlert}
              loading={alertsLoading}
            />
          )}
        </section>
      </AnimatedSection>

      {/* Options + Pareto — only shown when an alert is selected */}
      {effectiveAlertId && !noAlerts && (
        <>
          <AnimatedSection>
            <section aria-label="Options d'optimisation">
              <h2 className="mb-4 font-serif text-lg font-semibold text-charcoal">
                Solutions disponibles
              </h2>
              {frontierError && (
                <ErrorFallback variant="api" message={frontierError} />
              )}
              {!frontierLoading && !frontierError && options.length === 0 && (
                <EmptyState
                  icon={<CheckCircle className="h-6 w-6 text-gray-400" />}
                  title="Aucun scenario disponible"
                  description="Aucun scenario disponible pour cette alerte"
                />
              )}
              <OptimizationPanel
                options={options}
                selectedOptionId={selectedOptionId}
                onSelectOption={setSelectedOptionId}
                loading={frontierLoading}
              />
            </section>
          </AnimatedSection>

          {/* Pareto chart */}
          {options.length > 0 && (
            <AnimatedSection>
              <section aria-label="Graphique Pareto">
                <DetailCard>
                  <h2 className="mb-2 font-serif text-lg font-semibold text-charcoal">
                    Compromis cout / couverture
                  </h2>
                  <p className="mb-4 text-sm text-gray-500">
                    Les points sur la courbe = meilleur compromis possible entre
                    cout et niveau de service
                  </p>
                  {frontierLoading ? (
                    <SkeletonChart />
                  ) : (
                    <ParetoChart
                      points={paretoPoints}
                      onPointClick={handlePointClick}
                    />
                  )}
                </DetailCard>
              </section>
            </AnimatedSection>
          )}

          {/* Validation button */}
          <AnimatedSection>
            <div className="flex items-center gap-4">
              <Button
                onClick={handleValidate}
                disabled={!selectedOptionId || submitting}
                className="bg-amber-500 text-white hover:bg-amber-400 disabled:opacity-50"
              >
                {validateButtonLabel}
              </Button>
              {submitError && (
                <p className="text-sm text-red-600">{submitError}</p>
              )}
            </div>
          </AnimatedSection>
        </>
      )}
    </div>
  );
}
