"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import type { ParetoFrontierResponse } from "@praedixa/shared-types";
import {
  ParetoChart,
  Badge,
  Button,
  SkeletonCard,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@praedixa/ui";
import type { ParetoPoint } from "@praedixa/ui";
import { useApiGet, useApiPost } from "@/hooks/use-api";
import { ErrorFallback } from "@/components/error-fallback";

interface CreateDecisionRequest {
  coverageAlertId: string;
  chosenOptionId: string;
  isOverride: boolean;
}

interface CreateDecisionResponse {
  id: string;
}

export default function ArbitrageDetailPage() {
  const params = useParams<{ alertId: string }>();
  const router = useRouter();
  const alertId = params.alertId;
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [validationSuccess, setValidationSuccess] = useState(false);

  const {
    data: frontier,
    loading,
    error,
    refetch,
  } = useApiGet<ParetoFrontierResponse>(
    `/api/v1/scenarios/alert/${encodeURIComponent(alertId)}`,
  );

  const { mutate: createDecision, loading: submitting } = useApiPost<
    CreateDecisionRequest,
    CreateDecisionResponse
  >("/api/v1/operational-decisions");

  const options = frontier?.options ?? [];
  const recommended = frontier?.recommended;

  const paretoPoints: ParetoPoint[] = options.map((opt) => ({
    id: opt.id,
    label: opt.label,
    cost: opt.coutTotalEur,
    service: opt.serviceAttenduPct,
    isParetoOptimal: opt.isParetoOptimal,
    isRecommended: opt.isRecommended,
  }));

  const handleValidate = async () => {
    if (!selectedOptionId) return;
    const isOverride = recommended
      ? selectedOptionId !== recommended.id
      : false;
    const result = await createDecision({
      coverageAlertId: alertId,
      chosenOptionId: selectedOptionId,
      isOverride,
    });
    if (result) {
      setValidationSuccess(true);
      setTimeout(() => router.push("/decisions"), 1500);
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-charcoal">Arbitrage</h1>
        <ErrorFallback message={error} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">Arbitrage</h1>
        <p className="mt-1 text-sm text-gray-500">
          Comparez les scenarios et validez votre choix
        </p>
      </div>

      {/* Success Banner */}
      {validationSuccess && (
        <div
          className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2
            className="h-5 w-5 shrink-0 text-green-600"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-green-800">
            Decision enregistree avec succes. Redirection en cours...
          </p>
        </div>
      )}

      {/* Alert Summary */}
      {loading ? (
        <SkeletonCard />
      ) : frontier ? (
        <section
          aria-label="Resume alerte"
          className="rounded-card border border-gray-200 bg-card p-4"
        >
          <p className="text-sm text-gray-500">
            Alerte <strong className="text-charcoal">{alertId}</strong>
          </p>
        </section>
      ) : null}

      {/* Scenario Option Cards */}
      <section aria-label="Options de scenario">
        <h2 className="mb-4 text-lg font-semibold text-charcoal">
          Options disponibles
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {options.map((opt) => (
              <Card
                key={opt.id}
                className={`cursor-pointer transition-shadow hover:shadow-md ${
                  selectedOptionId === opt.id ? "ring-2 ring-amber-500" : ""
                } ${opt.isRecommended ? "border-amber-300 bg-amber-50/30" : ""}`}
                onClick={() => setSelectedOptionId(opt.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{opt.label}</CardTitle>
                    <div className="flex gap-1">
                      {opt.isParetoOptimal && (
                        <Badge variant="secondary">Pareto</Badge>
                      )}
                      {opt.isRecommended && <Badge>Recommande</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Type</p>
                      <p className="font-medium text-charcoal">
                        {opt.optionType}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Cout</p>
                      <p className="font-medium text-charcoal">
                        {opt.coutTotalEur.toLocaleString("fr-FR")} EUR
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Service</p>
                      <p className="font-medium text-charcoal">
                        {opt.serviceAttenduPct.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Heures</p>
                      <p className="font-medium text-charcoal">
                        {opt.heuresCouvertes}h
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Pareto Chart */}
      {paretoPoints.length > 0 && (
        <section aria-label="Graphique Pareto">
          <h2 className="mb-4 text-lg font-semibold text-charcoal">
            Frontiere de Pareto
          </h2>
          <div className="rounded-card border border-gray-200 bg-card p-4">
            <ParetoChart
              points={paretoPoints}
              onPointClick={(p) => setSelectedOptionId(p.id)}
            />
          </div>
        </section>
      )}

      {/* Validate Button */}
      <div className="flex gap-3">
        <Button
          onClick={() => void handleValidate()}
          disabled={!selectedOptionId || submitting || validationSuccess}
        >
          {submitting ? "Enregistrement..." : "Valider la decision"}
        </Button>
      </div>
    </div>
  );
}
