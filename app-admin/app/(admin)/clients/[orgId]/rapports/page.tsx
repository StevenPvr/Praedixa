"use client";

import { useMemo, useState } from "react";
import { useClientContext } from "../client-context";
import { useApiGet, useApiPost } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import {
  Card,
  CardContent,
  DataTable,
  SkeletonCard,
  StatCard,
  type DataTableColumn,
} from "@praedixa/ui";
import { ErrorFallback } from "@/components/error-fallback";
import { Archive, FileCheck2, Share2, ShieldCheck, TrendingUp } from "lucide-react";

interface ProofPack {
  id: string;
  name: string;
  status: string;
  generatedAt?: string;
  downloadUrl?: string;
}

interface QualityData {
  totalRecords?: number;
  validRecords?: number;
  qualityScore?: number;
  completenessRate?: number;
}

interface AlertItem {
  id: string;
  severity: string;
  status: string;
}

interface ShareLinkResponse {
  url: string;
  expiresAt: string;
}

const PROOF_COLUMNS: DataTableColumn<ProofPack>[] = [
  { key: "name", label: "Pack" },
  { key: "status", label: "Statut" },
  {
    key: "generatedAt",
    label: "Genere le",
    render: (row) =>
      row.generatedAt ? (
        <span className="text-xs text-ink-tertiary">
          {new Date(row.generatedAt).toLocaleDateString("fr-FR")}
        </span>
      ) : (
        <span className="text-xs text-ink-tertiary">-</span>
      ),
  },
  {
    key: "downloadUrl",
    label: "Export",
    render: (row) =>
      row.downloadUrl ? (
        <a
          href={row.downloadUrl}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-primary hover:text-primary-700"
        >
          Telecharger
        </a>
      ) : (
        <span className="text-xs text-ink-tertiary">Indisponible</span>
      ),
  },
];

export default function RapportsPage() {
  const { orgId, selectedSiteId } = useClientContext();

  const alertsUrl = selectedSiteId
    ? `${ADMIN_ENDPOINTS.orgAlerts(orgId)}?site_id=${selectedSiteId}`
    : ADMIN_ENDPOINTS.orgAlerts(orgId);

  const {
    data: proofPacks,
    loading: proofLoading,
    error: proofError,
    refetch: proofRefetch,
  } = useApiGet<ProofPack[]>(ADMIN_ENDPOINTS.orgProofPacks(orgId));

  const {
    data: quality,
    loading: qualityLoading,
    error: qualityError,
    refetch: qualityRefetch,
  } = useApiGet<QualityData>(ADMIN_ENDPOINTS.orgCanonicalQuality(orgId));

  const {
    data: alerts,
    loading: alertsLoading,
    error: alertsError,
    refetch: alertsRefetch,
  } = useApiGet<AlertItem[]>(alertsUrl);

  const proofList = proofPacks ?? [];
  const generatedProofCount = useMemo(
    () => proofList.filter((item) => item.status === "generated").length,
    [proofList],
  );
  const activeAlerts = useMemo(
    () => (alerts ?? []).filter((item) => item.status !== "resolved").length,
    [alerts],
  );
  const criticalAlerts = useMemo(
    () => (alerts ?? []).filter((item) => item.severity === "CRITICAL").length,
    [alerts],
  );

  const [selectedProofId, setSelectedProofId] = useState<string>("");
  const effectiveProofId = selectedProofId || proofList[0]?.id || "";

  const {
    mutate: createShareLink,
    loading: shareLoading,
    error: shareError,
    data: shareData,
  } = useApiPost<Record<string, never>, ShareLinkResponse>(
    effectiveProofId
      ? ADMIN_ENDPOINTS.orgProofPackShareLink(orgId, effectiveProofId)
      : `${ADMIN_ENDPOINTS.orgProofPacks(orgId)}/missing/share-link`,
  );

  if (proofError && qualityError && alertsError) {
    return (
      <ErrorFallback
        message="Impossible de charger les rapports de cette organisation"
        onRetry={() => {
          proofRefetch();
          qualityRefetch();
          alertsRefetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-lg font-semibold text-ink">Rapports</h2>
        <p className="text-sm text-ink-tertiary">
          Synthese executive: preuve, qualite et exposition au risque pour ce client.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Proof packs"
          value={String(proofList.length)}
          icon={<Archive className="h-4 w-4" />}
        />
        <StatCard
          label="Proof packs generes"
          value={String(generatedProofCount)}
          icon={<FileCheck2 className="h-4 w-4" />}
        />
        <StatCard
          label="Score qualite"
          value={
            quality?.qualityScore != null
              ? `${Math.round(quality.qualityScore * 100)}%`
              : "-"
          }
          icon={<ShieldCheck className="h-4 w-4" />}
        />
        <StatCard
          label="Alertes ouvertes"
          value={String(activeAlerts)}
          icon={<TrendingUp className="h-4 w-4" />}
          trend={criticalAlerts > 0 ? `${criticalAlerts} critiques` : undefined}
        />
      </div>

      {qualityLoading || alertsLoading || proofLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : null}

      <Card className="rounded-2xl shadow-soft">
        <CardContent className="space-y-3 p-5">
          <h3 className="text-sm font-medium text-ink-secondary">Qualite des donnees</h3>
          {qualityError ? (
            <p className="text-sm text-ink-tertiary">{qualityError}</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <p className="text-sm text-ink-tertiary">
                Total: <span className="text-ink">{quality?.totalRecords ?? "-"}</span>
              </p>
              <p className="text-sm text-ink-tertiary">
                Valides: <span className="text-ink">{quality?.validRecords ?? "-"}</span>
              </p>
              <p className="text-sm text-ink-tertiary">
                Completion:{" "}
                <span className="text-ink">
                  {quality?.completenessRate != null
                    ? `${Math.round(quality.completenessRate * 100)}%`
                    : "-"}
                </span>
              </p>
              <p className="text-sm text-ink-tertiary">
                Alertes critiques: <span className="text-ink">{criticalAlerts}</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {proofError ? (
        <ErrorFallback message={proofError} onRetry={proofRefetch} />
      ) : (
        <Card className="rounded-2xl shadow-soft">
          <CardContent className="space-y-4 p-4">
            <DataTable
              columns={PROOF_COLUMNS}
              data={proofList}
              getRowKey={(row) => row.id}
            />

            <div className="rounded-lg border border-border bg-surface-sunken p-3">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-ink">Partager avec le client</h4>
                <Share2 className="h-4 w-4 text-ink-secondary" />
              </div>

              <div className="flex flex-wrap items-end gap-2">
                <label className="min-w-[240px] flex-1 space-y-1">
                  <span className="text-xs font-medium text-ink-secondary">Proof pack</span>
                  <select
                    value={effectiveProofId}
                    onChange={(event) => setSelectedProofId(event.target.value)}
                    className="h-9 w-full rounded-md border border-border bg-card px-2 text-sm text-ink"
                  >
                    {proofList.map((proof) => (
                      <option key={proof.id} value={proof.id}>
                        {proof.name}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  disabled={!effectiveProofId || shareLoading}
                  onClick={() => {
                    void createShareLink({});
                  }}
                  className="h-9 rounded-md bg-primary px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {shareLoading ? "Generation..." : "Generer lien securise"}
                </button>
              </div>

              {shareError && <p className="mt-2 text-xs text-danger">{shareError}</p>}

              {shareData && (
                <div className="mt-3 rounded-md border border-border bg-card p-2">
                  <p className="text-xs text-ink-secondary">
                    Expire le {new Date(shareData.expiresAt).toLocaleString("fr-FR")}
                  </p>
                  <div className="mt-1 flex gap-2">
                    <input
                      readOnly
                      value={shareData.url}
                      className="h-8 flex-1 rounded-md border border-border bg-surface px-2 text-xs text-ink"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        await navigator.clipboard.writeText(shareData.url);
                      }}
                      className="h-8 rounded-md border border-border px-2 text-xs font-medium text-ink"
                    >
                      Copier
                    </button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
