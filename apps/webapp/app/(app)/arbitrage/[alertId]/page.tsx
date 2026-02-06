"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import type { ArbitrageResult } from "@praedixa/shared-types";
import { useApiGet, useApiPost } from "@/hooks/use-api";
import { ErrorFallback } from "@/components/error-fallback";
import { ArbitrageContext } from "@/components/arbitrage/arbitrage-context";
import { OptionsComparison } from "@/components/arbitrage/options-comparison";

interface ValidateRequest {
  selectedOptionIndex: number;
  notes?: string;
}

interface ValidateResponse {
  id: string;
}

export default function AlertDetailPage() {
  const params = useParams<{ alertId: string }>();
  const router = useRouter();
  const alertId = params.alertId;
  const [validatingIndex, setValidatingIndex] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [validationSuccess, setValidationSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const {
    data: result,
    loading,
    error,
    refetch,
  } = useApiGet<ArbitrageResult>(
    `/api/v1/arbitrage/${encodeURIComponent(alertId)}/options`,
  );

  const { mutate: validate, error: mutateError } = useApiPost<
    ValidateRequest,
    ValidateResponse
  >(`/api/v1/arbitrage/${encodeURIComponent(alertId)}/validate`);

  const handleValidate = async (optionIndex: number) => {
    setValidatingIndex(optionIndex);
    setSelectedIndex(optionIndex);
    setValidationError(null);
    const decision = await validate({ selectedOptionIndex: optionIndex });
    setValidatingIndex(-1);
    if (decision) {
      setValidationSuccess(true);
      // Brief success feedback before redirect
      setTimeout(() => {
        router.push("/decisions");
      }, 1500);
    } else if (mutateError) {
      setValidationError(
        "Votre choix n'a pas pu etre enregistre. Verifiez votre connexion et reessayez.",
      );
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">
            Detail de l'alerte
          </h1>
        </div>
        <ErrorFallback message={error} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">
          Detail de l'alerte
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Comparez les options et validez votre choix
        </p>
      </div>

      <ArbitrageContext result={result} loading={loading} />

      {/* Success feedback banner */}
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

      {/* Validation error banner */}
      {validationError && !validationSuccess && (
        <div
          className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3"
          role="alert"
        >
          <p className="flex-1 text-sm font-medium text-red-800">
            {validationError}
          </p>
          <button
            onClick={() => {
              setValidationError(null);
              if (selectedIndex >= 0) {
                void handleValidate(selectedIndex);
              }
            }}
            className="shrink-0 rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50"
          >
            Reessayer
          </button>
        </div>
      )}

      <section aria-label="Options d'arbitrage">
        <h2 className="mb-4 text-lg font-semibold text-charcoal">
          Options d'arbitrage
        </h2>
        <OptionsComparison
          options={result?.options ?? []}
          recommendationIndex={result?.recommendationIndex ?? 0}
          loading={loading}
          onValidate={(idx) => void handleValidate(idx)}
          validatingIndex={validatingIndex}
          selectedIndex={selectedIndex}
        />
      </section>
    </div>
  );
}
