"use client";

import { useParams } from "next/navigation";
import type { ActionDispatchDetailResponse } from "@praedixa/shared-types/api";
import { Card, CardContent, SkeletonCard, StatCard } from "@praedixa/ui";
import { AlertTriangle, Repeat2, Send } from "lucide-react";

import { ErrorFallback } from "@/components/error-fallback";
import { useApiGet } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { useClientContext } from "../../../client-context";
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

function joinCapabilities(
  capabilities: ActionDispatchDetailResponse["destination"]["capabilities"],
): string {
  const enabled = Object.entries(capabilities)
    .filter(([, enabledValue]) => enabledValue === true)
    .map(([key]) => key.replace(/^supports/, ""))
    .map((key) =>
      key
        .replace(/([A-Z])/g, " $1")
        .trim()
        .toLowerCase(),
    );

  return enabled.length > 0 ? enabled.join(", ") : "Aucune";
}

function buildDispatchViewModel(data: ActionDispatchDetailResponse) {
  const degradedReasons: string[] = [];

  if (data.timeline.length === 0) {
    degradedReasons.push(
      "La timeline d'execution n'est pas encore archivee pour ce dispatch.",
    );
  }

  if (data.payloadRefs.length === 0) {
    degradedReasons.push(
      "Les references de payload et d'idempotence sont encore partielles.",
    );
  }

  return {
    hasTimeline: data.timeline.length > 0,
    hasPayloadRefs: data.payloadRefs.length > 0,
    degradedReasons,
  };
}

export default function ActionDispatchDetailPage() {
  const { orgId } = useClientContext();
  const params = useParams<{ actionId: string }>();
  const actionId = params.actionId;
  const { data, loading, error, refetch } =
    useApiGet<ActionDispatchDetailResponse>(
      actionId
        ? ADMIN_ENDPOINTS.orgActionDispatchDetail(orgId, actionId)
        : null,
    );

  if (!actionId) {
    return (
      <div className="space-y-6">
        <ReadOnlyDetailHeader
          backHref={`/clients/${encodeURIComponent(orgId)}/actions`}
          backLabel="Retour aux actions"
          title="Detail d'action"
          description="Suivi read-only du dispatch, des retries et du fallback humain."
        />
        <ErrorFallback message="Aucun dispatch n'a ete selectionne." />
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
        <ReadOnlyDetailHeader
          backHref={`/clients/${encodeURIComponent(orgId)}/actions`}
          backLabel="Retour aux actions"
          title="Detail d'action"
          description="Suivi read-only du dispatch, des retries et du fallback humain."
        />
        <ErrorFallback
          message={error ?? "Impossible de charger le detail d'action"}
          onRetry={refetch}
        />
      </div>
    );
  }

  const viewModel = buildDispatchViewModel(data);

  return (
    <div className="space-y-6">
      <ReadOnlyDetailHeader
        backHref={`/clients/${encodeURIComponent(orgId)}/actions`}
        backLabel="Retour aux actions"
        title="Detail d'action"
        description="Suivi read-only du dispatch, des retries et du fallback humain."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Statut"
          value={data.status}
          icon={<Send className="h-4 w-4" />}
        />
        <StatCard
          label="Mode"
          value={data.dispatchMode}
          icon={<Send className="h-4 w-4" />}
        />
        <StatCard
          label="Attempts restantes"
          value={String(data.retryPolicy.remainingAttempts)}
          icon={<Repeat2 className="h-4 w-4" />}
        />
        <StatCard
          label="Fallback"
          value={data.fallback.status}
          icon={<AlertTriangle className="h-4 w-4" />}
          variant={data.fallback.humanRequired ? "warning" : undefined}
        />
      </div>

      {viewModel.degradedReasons.length > 0 ? (
        <ReadOnlyStateCard
          tone="warning"
          title="Lecture partielle"
          message="Le dispatch est lisible, mais certaines traces read-only sont encore incompletes."
          details={viewModel.degradedReasons}
        />
      ) : null}

      <Card className="rounded-2xl shadow-soft">
        <CardContent className="space-y-3 p-5">
          <h3 className="text-sm font-medium text-ink-secondary">
            Execution et destination
          </h3>
          <div className="grid gap-3 text-sm text-ink-tertiary md:grid-cols-2">
            <p>
              Action: <span className="text-ink">{data.actionId}</span>
            </p>
            <p>
              Contrat:{" "}
              <span className="text-ink">
                {data.contractId} v{data.contractVersion}
              </span>
            </p>
            <p>
              Destination:{" "}
              <span className="text-ink">
                {data.destination.system} ·{" "}
                {data.destination.targetResourceType}
              </span>
            </p>
            <p>
              Capacites:{" "}
              <span className="text-ink">
                {joinCapabilities(data.destination.capabilities)}
              </span>
            </p>
            <p>
              Cree le:{" "}
              <span className="text-ink">{formatDateTime(data.createdAt)}</span>
            </p>
            <p>
              Mis a jour:{" "}
              <span className="text-ink">{formatDateTime(data.updatedAt)}</span>
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface-sunken p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-placeholder">
              Raison terminale
            </p>
            <p className="mt-2 text-sm text-ink">
              {data.terminalReason.message}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-soft">
        <CardContent className="space-y-3 p-5">
          <h3 className="text-sm font-medium text-ink-secondary">Timeline</h3>
          {viewModel.hasTimeline ? (
            <div className="space-y-3">
              {data.timeline.map((entry) => (
                <div
                  key={`${entry.sequence}:${entry.kind}`}
                  className="rounded-xl border border-border bg-surface-sunken p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ink">
                      {entry.label}
                    </p>
                    <span className="text-xs text-ink-tertiary">
                      {formatDateTime(entry.occurredAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-ink-tertiary">
                    Statut: <span className="text-ink">{entry.status}</span>
                  </p>
                  {entry.errorMessage ? (
                    <p className="mt-1 text-sm text-danger-600">
                      {entry.errorMessage}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <ReadOnlyStateCard
              title="Timeline indisponible"
              message="Aucun evenement de dispatch n'a encore ete archive pour cette action."
            />
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-soft">
        <CardContent className="space-y-3 p-5">
          <h3 className="text-sm font-medium text-ink-secondary">
            Payload refs et idempotence
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {viewModel.hasPayloadRefs ? (
              data.payloadRefs.map((payloadRef) => (
                <div
                  key={payloadRef.source}
                  className="rounded-xl border border-border bg-surface-sunken p-3"
                >
                  <p className="text-sm font-semibold text-ink">
                    {payloadRef.source}
                  </p>
                  <p className="mt-1 text-xs text-ink-tertiary">
                    {payloadRef.available
                      ? `${payloadRef.fieldCount} champs · ${payloadRef.fingerprint ?? "fingerprint indisponible"}`
                      : "Payload indisponible"}
                  </p>
                </div>
              ))
            ) : (
              <ReadOnlyStateCard
                title="Payload indisponible"
                message="Les references de payload n'ont pas encore ete materialisees pour ce dispatch."
              />
            )}
            <div className="rounded-xl border border-border bg-surface-sunken p-3">
              <p className="text-sm font-semibold text-ink">Idempotence</p>
              <p className="mt-1 text-xs text-ink-tertiary">
                {data.idempotency.status} ·{" "}
                {data.idempotency.relatedDispatchCount} dispatches relies
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
