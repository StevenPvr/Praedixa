"use client";

import { useMemo, useState } from "react";
import type { ProofPack } from "@praedixa/shared-types";
import { DataTable, Button, SkeletonTable } from "@praedixa/ui";
import type { DataTableColumn } from "@praedixa/ui";
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
    return [...records].sort((a, b) => b.month.localeCompare(a.month))[0];
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
      <section aria-label="Bilans mensuels">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-charcoal">
            Bilans mensuels
          </h2>
          <Button
            onClick={() => {
              void handleDownloadProofPdf();
            }}
            disabled={!latestProof || downloadingPdf}
          >
            {downloadingPdf ? "Telechargement..." : "Telecharger en PDF"}
          </Button>
        </div>
        <p className="mb-3 text-xs text-gray-500">
          Chaque ligne consolide les gains, l&apos;adoption et le traitement des
          alertes pour un mois et un site.
        </p>
        {downloadError && (
          <p className="mb-3 text-sm text-red-600">{downloadError}</p>
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
