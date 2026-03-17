"use client";

import { useParams, useSearchParams } from "next/navigation";
import type { LedgerDetailResponse } from "@praedixa/shared-types/api";
import { Card, CardContent, SkeletonCard, StatCard } from "@praedixa/ui";
import { FileCheck2, Scale, TrendingUp } from "lucide-react";

import { ErrorFallback } from "@/components/error-fallback";
import { useApiGet } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { useCurrentUser } from "@/lib/auth/client";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { useClientContext } from "../../../client-context";
import { LedgerDecisionPanel, LedgerSnapshotsCard } from "./ledger-panels";
import {
  ReadOnlyDetailHeader,
  ReadOnlyStateCard,
} from "../../../read-only-detail";

function formatDateTime(value?: string): string {
  if (!value) {
    return "N/A";
  }

  return new Date(value).toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatCurrency(amount: number | undefined, currency: string): string {
  return amount == null ? "N/A" : `${Math.round(amount)} ${currency}`;
}

function buildLedgerUrl(
  orgId: string,
  ledgerId: string | undefined,
  revision: string | null,
): string | null {
  if (!ledgerId) {
    return null;
  }

  const baseUrl = ADMIN_ENDPOINTS.orgLedgerDetail(orgId, ledgerId);
  if (!revision) {
    return baseUrl;
  }

  const params = new URLSearchParams({ revision });
  return `${baseUrl}?${params.toString()}`;
}

function buildLedgerViewModel(data: LedgerDetailResponse) {
  const degradedReasons: string[] = [];

  if (
    data.requestedRevision != null &&
    data.requestedRevision !== data.selectedRevision
  ) {
    degradedReasons.push(
      `La revision demandee ${data.requestedRevision} n'est pas disponible; la revision ${data.selectedRevision} est affichee.`,
    );
  }
  if (data.roi.realizedValue == null) {
    degradedReasons.push(
      "Le realise financier n'est pas encore consolide pour ce ledger.",
    );
  }

  return {
    hasRoiComponents: data.roiComponents.length > 0,
    hasExportReadiness: data.exportReadiness.length > 0,
    hasRevisionLineage: data.revisionLineage.length > 0,
    degradedReasons,
  };
}

function LedgerDetailHeader({ orgId }: { orgId: string }) {
  return (
    <ReadOnlyDetailHeader
      backHref={`/clients/${encodeURIComponent(orgId)}/rapports`}
      backLabel="Retour aux rapports"
      title="Ledger detail"
      description="Lecture finance-grade du ROI, du lineage et de la validation."
    />
  );
}

function LedgerSummary({ data }: { data: LedgerDetailResponse }) {
  const readyExports = data.exportReadiness.filter(
    (item) => item.status === "ready",
  ).length;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Revision selectionnee"
        value={String(data.selectedRevision)}
        icon={<FileCheck2 className="h-4 w-4" />}
      />
      <StatCard
        label="Derniere revision"
        value={String(data.latestRevision)}
        icon={<TrendingUp className="h-4 w-4" />}
      />
      <StatCard
        label="Statut"
        value={data.status}
        icon={<Scale className="h-4 w-4" />}
      />
      <StatCard
        label="Exports prets"
        value={`${readyExports}/${data.exportReadiness.length}`}
        icon={<FileCheck2 className="h-4 w-4" />}
      />
    </div>
  );
}

function LedgerValidationCard({ data }: { data: LedgerDetailResponse }) {
  return (
    <Card className="rounded-2xl shadow-soft">
      <CardContent className="space-y-3 p-5">
        <h3 className="text-sm font-medium text-ink-secondary">
          Validation et perimetre
        </h3>
        <div className="rounded-xl border border-border bg-surface-sunken p-3">
          <p className="text-sm font-semibold text-ink">
            {data.validationBanner.message}
          </p>
          <p className="mt-1 text-xs text-ink-tertiary">
            {data.contractId} v{data.contractVersion} · {data.validationStatus}
          </p>
        </div>
        <div className="grid gap-3 text-sm text-ink-tertiary md:grid-cols-2">
          <p>
            Recommendation:{" "}
            <span className="text-ink">{data.recommendationId}</span>
          </p>
          <p>
            Scenario run:{" "}
            <span className="text-ink">{data.scenarioRunId ?? "Aucun"}</span>
          </p>
          <p>
            Ouvert le:{" "}
            <span className="text-ink">{formatDateTime(data.openedAt)}</span>
          </p>
          <p>
            Ferme le:{" "}
            <span className="text-ink">{formatDateTime(data.closedAt)}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function LedgerRoiCard({
  data,
  hasRoiComponents,
}: {
  data: LedgerDetailResponse;
  hasRoiComponents: boolean;
}) {
  return (
    <Card className="rounded-2xl shadow-soft">
      <CardContent className="space-y-3 p-5">
        <h3 className="text-sm font-medium text-ink-secondary">ROI</h3>
        <div className="grid gap-3 text-sm text-ink-tertiary md:grid-cols-2">
          <p>
            Estime:{" "}
            <span className="text-ink">
              {formatCurrency(data.roi.estimatedValue, data.roi.currency)}
            </span>
          </p>
          <p>
            Realise:{" "}
            <span className="text-ink">
              {formatCurrency(data.roi.realizedValue, data.roi.currency)}
            </span>
          </p>
          <p>
            Methode contrefactuelle:{" "}
            <span className="text-ink">{data.counterfactual.method}</span>
          </p>
          <p>
            Action status:{" "}
            <span className="text-ink">{data.action.status}</span>
          </p>
        </div>
        {hasRoiComponents ? (
          <div className="space-y-2">
            {data.roiComponents.map((component) => (
              <div
                key={component.key}
                className="rounded-xl border border-border bg-surface-sunken p-3"
              >
                <p className="text-sm font-semibold text-ink">
                  {component.label}
                </p>
                <p className="mt-1 text-xs text-ink-tertiary">
                  {component.kind} · {component.validationStatus} ·{" "}
                  {formatCurrency(component.value, data.roi.currency)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <ReadOnlyStateCard
            title="Aucun composant ROI"
            message="Les composantes de ROI detaillees n'ont pas encore ete publiees pour ce ledger."
          />
        )}
      </CardContent>
    </Card>
  );
}

function LedgerExportReadinessList({ data }: { data: LedgerDetailResponse }) {
  return (
    <div className="space-y-2">
      {data.exportReadiness.map((item) => (
        <div
          key={item.format}
          className="rounded-xl border border-border bg-surface-sunken p-3"
        >
          <p className="text-sm font-semibold text-ink">{item.format}</p>
          <p className="mt-1 text-xs text-ink-tertiary">
            {item.status}
            {item.blockers.length > 0 ? ` · ${item.blockers.join(", ")}` : ""}
          </p>
        </div>
      ))}
    </div>
  );
}

function LedgerRevisionLineageList({ data }: { data: LedgerDetailResponse }) {
  return (
    <div className="space-y-2">
      {data.revisionLineage.map((node) => (
        <div
          key={`${node.ledgerId}:${node.revision}`}
          className="rounded-xl border border-border bg-surface-sunken p-3"
        >
          <p className="text-sm font-semibold text-ink">
            Revision {node.revision}
            {node.isSelected ? " · selectionnee" : ""}
          </p>
          <p className="mt-1 text-xs text-ink-tertiary">
            {node.status} · {node.validationStatus} ·{" "}
            {formatDateTime(node.openedAt)}
          </p>
        </div>
      ))}
    </div>
  );
}

function LedgerExportsCard({
  data,
  hasExportReadiness,
  hasRevisionLineage,
}: {
  data: LedgerDetailResponse;
  hasExportReadiness: boolean;
  hasRevisionLineage: boolean;
}) {
  return (
    <Card className="rounded-2xl shadow-soft">
      <CardContent className="space-y-3 p-5">
        <h3 className="text-sm font-medium text-ink-secondary">
          Exports et lineage
        </h3>
        {hasExportReadiness ? (
          <LedgerExportReadinessList data={data} />
        ) : (
          <ReadOnlyStateCard
            title="Aucun export disponible"
            message="Le statut des exports finance-grade n'est pas encore renseigne pour ce ledger."
          />
        )}
        {hasRevisionLineage ? (
          <LedgerRevisionLineageList data={data} />
        ) : (
          <ReadOnlyStateCard
            title="Lineage indisponible"
            message="Aucune revision lineage n'a encore ete archivee pour ce ledger."
          />
        )}
      </CardContent>
    </Card>
  );
}

export default function LedgerDetailPage() {
  const { orgId } = useClientContext();
  const currentUser = useCurrentUser();
  const canManageLedger = hasAnyPermission(currentUser?.permissions, [
    "admin:org:write",
  ]);
  const params = useParams<{ ledgerId: string }>();
  const searchParams = useSearchParams();
  const revision = searchParams.get("revision");
  const { data, loading, error, refetch } = useApiGet<LedgerDetailResponse>(
    buildLedgerUrl(orgId, params.ledgerId, revision),
  );

  if (!params.ledgerId) {
    return (
      <div className="space-y-6">
        <LedgerDetailHeader orgId={orgId} />
        <ErrorFallback message="Aucun ledger n'a ete selectionne." />
      </div>
    );
  }
  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="space-y-6">
        <LedgerDetailHeader orgId={orgId} />
        <ErrorFallback
          message={error ?? "Impossible de charger le detail ledger"}
          onRetry={refetch}
        />
      </div>
    );
  }

  const viewModel = buildLedgerViewModel(data);

  return (
    <div className="space-y-6">
      <LedgerDetailHeader orgId={orgId} />
      <LedgerSummary data={data} />
      {viewModel.degradedReasons.length > 0 ? (
        <ReadOnlyStateCard
          tone="warning"
          title="Lecture partielle"
          message="Le ledger est lisible, mais toutes les revisions ou mesures observees ne sont pas encore consolidees."
          details={viewModel.degradedReasons}
        />
      ) : null}
      <LedgerDecisionPanel
        orgId={orgId}
        data={data}
        canManageLedger={canManageLedger}
        onDecisionSaved={refetch}
      />
      <LedgerValidationCard data={data} />
      <LedgerSnapshotsCard data={data} />
      <div className="grid gap-6 xl:grid-cols-2">
        <LedgerRoiCard
          data={data}
          hasRoiComponents={viewModel.hasRoiComponents}
        />
        <LedgerExportsCard
          data={data}
          hasExportReadiness={viewModel.hasExportReadiness}
          hasRevisionLineage={viewModel.hasRevisionLineage}
        />
      </div>
    </div>
  );
}
