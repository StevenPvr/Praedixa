"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import type { ProofPack } from "@praedixa/shared-types";
import { DataTable, SkeletonTable } from "@praedixa/ui";
import type { DataTableColumn } from "@praedixa/ui";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { Button } from "@/components/ui/button";
import { StatusBanner } from "@/components/status-banner";
import { ErrorFallback } from "@/components/error-fallback";
import { AnimatedSection } from "@/components/animated-section";
import { getValidAccessToken } from "@/lib/auth/client";

const proofColumns: DataTableColumn<ProofPack>[] = [
  { key: "siteId", label: "Site" },
  { key: "month", label: "Mois" },
  {
    key: "gainNetEur",
    label: "Economies",
    align: "right",
    render: (row) => `${row.gainNetEur.toLocaleString("fr-FR")} EUR`,
  },
  {
    key: "adoptionPct",
    label: "Recommandations suivies",
    align: "right",
    render: (row) =>
      row.adoptionPct != null ? `${row.adoptionPct.toFixed(1)}%` : "-",
  },
  { key: "alertesEmises", label: "Alertes detectees", align: "right" },
  { key: "alertesTraitees", label: "Alertes resolues", align: "right" },
];

interface ProofTabProps {
  proofs: ProofPack[] | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export function ProofTab({ proofs, loading, error, onRetry }: ProofTabProps) {
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const latestProof = useMemo(() => {
    const records = proofs ?? [];
    if (records.length === 0) return null;
    return [...records].toSorted((a, b) => b.month.localeCompare(a.month))[0];
  }, [proofs]);

  const stats = useMemo(() => {
    const rows = proofs ?? [];
    const totalGain = rows.reduce((sum, row) => sum + row.gainNetEur, 0);
    const avgAdoption =
      rows.length > 0
        ? rows
            .map((row) => row.adoptionPct ?? 0)
            .reduce((sum, value) => sum + value, 0) / rows.length
        : 0;
    const treatmentRate =
      rows.length > 0
        ? rows.reduce((sum, row) => sum + row.alertesTraitees, 0) /
          Math.max(
            rows.reduce((sum, row) => sum + row.alertesEmises, 0),
            1,
          )
        : 0;

    return { totalGain, avgAdoption, treatmentRate };
  }, [proofs]);

  async function handleDownloadProofPdf(): Promise<void> {
    if (!latestProof) return;

    setDownloadingPdf(true);
    setDownloadError(null);

    try {
      const token = await getValidAccessToken();
      const headers: Record<string, string> = {
        "X-Request-ID": crypto.randomUUID(),
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!baseUrl) {
        throw new Error("NEXT_PUBLIC_API_URL non configuree");
      }
      const query = new URLSearchParams({
        site_id: latestProof.siteId,
        month: latestProof.month.slice(0, 10),
      });

      const response = await fetch(
        `${baseUrl}/api/v1/proof/pdf?${query.toString()}`,
        {
          method: "GET",
          headers,
        },
      );

      if (!response.ok) {
        throw new Error(`Echec du telechargement (${response.status})`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `proof-pack-${latestProof.siteId}-${latestProof.month.slice(0, 7)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Impossible de telecharger le PDF";
      setDownloadError(message);
    } finally {
      setDownloadingPdf(false);
    }
  }

  return (
    <AnimatedSection>
      <section aria-label="Bilans mensuels" className="space-y-4">
        {loading ? (
          <StatusBanner variant="info" title="Preparation des bilans mensuels">
            Consolidation des preuves de performance et des indicateurs
            d'adoption.
          </StatusBanner>
        ) : stats.totalGain > 0 ? (
          <StatusBanner variant="success" title="Bilans mensuels valorisables">
            Le gain net cumule est positif sur les periodes disponibles.
          </StatusBanner>
        ) : (
          <StatusBanner variant="warning" title="Bilans a renforcer">
            Les preuves de valeur sont encore insuffisantes ou neutres sur la
            periode.
          </StatusBanner>
        )}

        <Card variant="elevated">
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard
              label="Gain net cumule"
              value={
                loading
                  ? "..."
                  : `${Math.round(stats.totalGain).toLocaleString("fr-FR")} EUR`
              }
              status={stats.totalGain > 0 ? "good" : "warning"}
            />
            <MetricCard
              label="Adoption moyenne"
              value={loading ? "..." : `${stats.avgAdoption.toFixed(1)}%`}
              status={stats.avgAdoption >= 70 ? "good" : "warning"}
            />
            <MetricCard
              label="Taux de traitement"
              value={
                loading ? "..." : `${(stats.treatmentRate * 100).toFixed(1)}%`
              }
              status={stats.treatmentRate >= 0.75 ? "good" : "warning"}
            />
          </div>
        </Card>

        <div className="flex items-center justify-between gap-3">
          <h2 className="font-serif text-lg font-semibold text-ink">
            Bilans mensuels detailes
          </h2>
          <Button
            onClick={() => {
              void handleDownloadProofPdf();
            }}
            disabled={!latestProof || downloadingPdf}
            variant="outline"
          >
            <Download className="mr-2 h-4 w-4" />
            {downloadingPdf ? "Telechargement..." : "Telecharger en PDF"}
          </Button>
        </div>

        {downloadError && (
          <p className="text-sm text-danger-text">{downloadError}</p>
        )}

        {error ? (
          <ErrorFallback message={error} onRetry={onRetry} />
        ) : loading ? (
          <SkeletonTable rows={5} columns={6} />
        ) : (
          <DataTable<ProofPack>
            columns={proofColumns}
            data={proofs ?? []}
            getRowKey={(row) => row.id}
            emptyMessage="Aucun bilan mensuel disponible. Le premier bilan sera genere a la fin du mois en cours."
          />
        )}
      </section>
    </AnimatedSection>
  );
}
