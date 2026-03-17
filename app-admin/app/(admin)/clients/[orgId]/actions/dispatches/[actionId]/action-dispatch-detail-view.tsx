"use client";

import type { ActionDispatchDetailResponse } from "@praedixa/shared-types/api";
import { Card, CardContent, StatCard } from "@praedixa/ui";
import { AlertTriangle, Repeat2, Send } from "lucide-react";

import {
  DispatchDecisionPanel,
  DispatchFallbackPanel,
} from "./dispatch-controls";
import { ReadOnlyStateCard } from "../../../read-only-detail";

function formatDateTime(value?: string): string {
  if (!value) {
    return "N/A";
  }
  return new Date(value).toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function normalizePermissionKey(value: string): string {
  return value.trim().toLowerCase();
}

function collectMissingPermissions(
  granted: readonly string[] | undefined,
  required: readonly string[],
): string[] {
  const grantedSet = new Set(
    (granted ?? []).map((value) => normalizePermissionKey(value)),
  );
  return required.filter(
    (value) => !grantedSet.has(normalizePermissionKey(value)),
  );
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

function DispatchStatusCards({ data }: { data: ActionDispatchDetailResponse }) {
  return (
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
  );
}

function DispatchExecutionMetadata({
  data,
  contractAllowsWriteback,
}: {
  data: ActionDispatchDetailResponse;
  contractAllowsWriteback: boolean;
}) {
  const items = [
    ["Action", data.actionId],
    ["Contrat", `${data.contractId} v${data.contractVersion}`],
    [
      "Destination",
      `${data.destination.system} · ${data.destination.targetResourceType}`,
    ],
    ["Write-back", contractAllowsWriteback ? "autorise" : "bloque"],
    ["Capacites", joinCapabilities(data.destination.capabilities)],
    [
      "Permissions requises",
      data.permissions.permissionKeys.length > 0
        ? data.permissions.permissionKeys.join(", ")
        : "Aucune",
    ],
    ["Cree le", formatDateTime(data.createdAt)],
    ["Mis a jour", formatDateTime(data.updatedAt)],
  ] as const;
  return (
    <div className="grid gap-3 text-sm text-ink-tertiary md:grid-cols-2">
      {items.map(([label, value]) => (
        <p key={label}>
          {label}: <span className="text-ink">{value}</span>
        </p>
      ))}
    </div>
  );
}

function DispatchTerminalReason({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-sunken p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-placeholder">
        Raison terminale
      </p>
      <p className="mt-2 text-sm text-ink">{message}</p>
    </div>
  );
}

function DispatchExecutionCard({
  data,
  contractAllowsWriteback,
}: {
  data: ActionDispatchDetailResponse;
  contractAllowsWriteback: boolean;
}) {
  return (
    <Card className="rounded-2xl shadow-soft">
      <CardContent className="space-y-3 p-5">
        <h3 className="text-sm font-medium text-ink-secondary">
          Execution et destination
        </h3>
        <DispatchExecutionMetadata
          data={data}
          contractAllowsWriteback={contractAllowsWriteback}
        />
        <DispatchTerminalReason message={data.terminalReason.message} />
      </CardContent>
    </Card>
  );
}

function DispatchTimelineCard({
  data,
  hasTimeline,
}: {
  data: ActionDispatchDetailResponse;
  hasTimeline: boolean;
}) {
  return (
    <Card className="rounded-2xl shadow-soft">
      <CardContent className="space-y-3 p-5">
        <h3 className="text-sm font-medium text-ink-secondary">Timeline</h3>
        {hasTimeline ? (
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
  );
}

function DispatchPayloadRefsCard({
  data,
  hasPayloadRefs,
}: {
  data: ActionDispatchDetailResponse;
  hasPayloadRefs: boolean;
}) {
  return (
    <Card className="rounded-2xl shadow-soft">
      <CardContent className="space-y-3 p-5">
        <h3 className="text-sm font-medium text-ink-secondary">
          Payload refs et idempotence
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          {hasPayloadRefs ? (
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
  );
}

function DispatchDegradedState({ reasons }: { reasons: readonly string[] }) {
  return reasons.length > 0 ? (
    <ReadOnlyStateCard
      tone="warning"
      title="Lecture partielle"
      message="Le dispatch est lisible, mais certaines traces read-only sont encore incompletes."
      details={reasons}
    />
  ) : null;
}

function DispatchRuntimePanels({
  orgId,
  data,
  canManageDispatch,
  contractAllowsWriteback,
  missingWritebackPermissions,
  onRefresh,
}: {
  orgId: string;
  data: ActionDispatchDetailResponse;
  canManageDispatch: boolean;
  contractAllowsWriteback: boolean;
  missingWritebackPermissions: readonly string[];
  onRefresh: () => void;
}) {
  return (
    <>
      <DispatchDecisionPanel
        orgId={orgId}
        data={data}
        canManageDispatch={canManageDispatch}
        contractAllowsWriteback={contractAllowsWriteback}
        missingWritebackPermissions={missingWritebackPermissions}
        onDecisionSaved={onRefresh}
      />
      <DispatchFallbackPanel
        orgId={orgId}
        data={data}
        canManageDispatch={canManageDispatch}
        contractAllowsWriteback={contractAllowsWriteback}
        missingWritebackPermissions={missingWritebackPermissions}
        onFallbackSaved={onRefresh}
      />
    </>
  );
}

export function ActionDispatchDetailContent({
  orgId,
  data,
  currentPermissions,
  canManageDispatch,
  onRefresh,
}: {
  orgId: string;
  data: ActionDispatchDetailResponse;
  currentPermissions: readonly string[] | undefined;
  canManageDispatch: boolean;
  onRefresh: () => void;
}) {
  const viewModel = buildDispatchViewModel(data);
  const missingWritebackPermissions = collectMissingPermissions(
    currentPermissions,
    data.permissions.permissionKeys,
  );
  const contractAllowsWriteback = data.permissions.allowedByContract;

  return (
    <>
      <DispatchStatusCards data={data} />
      <DispatchDegradedState reasons={viewModel.degradedReasons} />
      <DispatchRuntimePanels
        orgId={orgId}
        data={data}
        canManageDispatch={canManageDispatch}
        contractAllowsWriteback={contractAllowsWriteback}
        missingWritebackPermissions={missingWritebackPermissions}
        onRefresh={onRefresh}
      />
      <DispatchExecutionCard
        data={data}
        contractAllowsWriteback={contractAllowsWriteback}
      />
      <DispatchTimelineCard data={data} hasTimeline={viewModel.hasTimeline} />
      <DispatchPayloadRefsCard
        data={data}
        hasPayloadRefs={viewModel.hasPayloadRefs}
      />
    </>
  );
}
