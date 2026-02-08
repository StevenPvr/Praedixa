"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import type { OperationalDecision } from "@praedixa/shared-types";
import { Badge, Button, Input, SkeletonCard } from "@praedixa/ui";
import { useApiGet, useApiPatch } from "@/hooks/use-api";
import { ErrorFallback } from "@/components/error-fallback";

interface OutcomeUpdate {
  coutObserveEur: number;
  serviceObservePct: number;
  comment?: string;
}

export default function DecisionDetailPage() {
  const params = useParams<{ decisionId: string }>();
  const decisionId = params.decisionId;

  const [coutObserve, setCoutObserve] = useState("");
  const [serviceObserve, setServiceObserve] = useState("");
  const [comment, setComment] = useState("");
  const [saved, setSaved] = useState(false);

  const {
    data: decision,
    loading,
    error,
    refetch,
  } = useApiGet<OperationalDecision>(
    `/api/v1/operational-decisions?id=${encodeURIComponent(decisionId)}`,
  );

  const { mutate: updateOutcome, loading: saving } = useApiPatch<
    OutcomeUpdate,
    OperationalDecision
  >(`/api/v1/operational-decisions/${encodeURIComponent(decisionId)}`);

  const handleSaveOutcome = async () => {
    const result = await updateOutcome({
      coutObserveEur: parseFloat(coutObserve) || 0,
      serviceObservePct: parseFloat(serviceObserve) || 0,
      comment: comment || undefined,
    });
    if (result) {
      setSaved(true);
      refetch();
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-charcoal">
          Detail de la decision
        </h1>
        <ErrorFallback message={error} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">
          Detail de la decision
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Informations et saisie du resultat observe
        </p>
      </div>

      {loading ? (
        <SkeletonCard />
      ) : decision ? (
        <>
          <section
            aria-label="Informations decision"
            className="rounded-card border border-gray-200 bg-card p-6"
          >
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <div>
                <p className="text-xs text-gray-500">Site</p>
                <p className="font-medium text-charcoal">{decision.siteId}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Date</p>
                <p className="font-medium text-charcoal">{decision.decisionDate}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Shift</p>
                <p className="font-medium text-charcoal">{decision.shift}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Horizon</p>
                <p className="font-medium text-charcoal">{decision.horizon}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Override</p>
                {decision.isOverride ? (
                  <Badge variant="destructive">Override</Badge>
                ) : (
                  <span className="text-sm text-gray-400">Non</span>
                )}
              </div>
            </div>
            {decision.overrideReason && (
              <div className="mt-4">
                <p className="text-xs text-gray-500">Raison override</p>
                <p className="text-sm text-charcoal">{decision.overrideReason}</p>
              </div>
            )}
          </section>

          {/* Outcome Form */}
          <section aria-label="Resultat observe" className="rounded-card border border-gray-200 bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-charcoal">
              Resultat observe
            </h2>
            {saved && (
              <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
                Resultat enregistre avec succes
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-charcoal">
                  Cout observe (EUR)
                </label>
                <Input
                  type="number"
                  value={coutObserve}
                  onChange={(e) => setCoutObserve(e.target.value)}
                  placeholder={decision.coutObserveEur?.toString() ?? "0"}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal">
                  Service observe (%)
                </label>
                <Input
                  type="number"
                  value={serviceObserve}
                  onChange={(e) => setServiceObserve(e.target.value)}
                  placeholder={decision.serviceObservePct?.toString() ?? "0"}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal">
                  Commentaire
                </label>
                <Input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Optionnel"
                />
              </div>
            </div>
            <div className="mt-4">
              <Button
                onClick={() => void handleSaveOutcome()}
                disabled={saving}
              >
                {saving ? "Enregistrement..." : "Enregistrer le resultat"}
              </Button>
            </div>
          </section>
        </>
      ) : (
        <ErrorFallback variant="empty" message="Decision introuvable" />
      )}
    </div>
  );
}
