"use client";

import type { ActionDispatchDetailResponse } from "@praedixa/shared-types/api";
import { Card, CardContent, StatCard } from "@praedixa/ui";
import { AlertTriangle, Repeat2, Send } from "lucide-react";

import { ReadOnlyStateCard } from "../../../read-only-detail";
import {
  DispatchDecisionPanel,
  DispatchFallbackPanel,
} from "./dispatch-controls";
import {
  buildDispatchExecutionMetadata,
  formatDateTime,
} from "./action-dispatch-detail-model";

type DispatchStatusCardsProps = Readonly<{
  data: ActionDispatchDetailResponse;
}>;

type DispatchExecutionMetadataProps = Readonly<{
  data: ActionDispatchDetailResponse;
  contractAllowsWriteback: boolean;
}>;

type DispatchTerminalReasonProps = Readonly<{
  message: string;
}>;

type DispatchTimelineCardProps = Readonly<{
  data: ActionDispatchDetailResponse;
  hasTimeline: boolean;
}>;

type DispatchPayloadRefsCardProps = Readonly<{
  data: ActionDispatchDetailResponse;
  hasPayloadRefs: boolean;
}>;

type DispatchDegradedStateProps = Readonly<{
  reasons: readonly string[];
}>;

type DispatchRuntimePanelsProps = Readonly<{
  orgId: string;
  data: ActionDispatchDetailResponse;
  canManageDispatch: boolean;
  contractAllowsWriteback: boolean;
  missingWritebackPermissions: readonly string[];
  onRefresh: () => void;
}>;

export function DispatchStatusCards({ data }: DispatchStatusCardsProps) {
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
}: DispatchExecutionMetadataProps) {
  const items = buildDispatchExecutionMetadata(data, contractAllowsWriteback);

  return (
    <div className="grid gap-3 text-sm text-ink-tertiary md:grid-cols-2">
      {items.map((item) => (
        <p key={item.label}>
          <span>{item.label}: </span>
          <span className="text-ink">{item.value}</span>
        </p>
      ))}
    </div>
  );
}

function DispatchTerminalReason({ message }: DispatchTerminalReasonProps) {
  return (
    <div className="rounded-xl border border-border bg-surface-sunken p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-placeholder">
        Raison terminale
      </p>
      <p className="mt-2 text-sm text-ink">{message}</p>
    </div>
  );
}

export function DispatchExecutionCard({
  data,
  contractAllowsWriteback,
}: DispatchExecutionMetadataProps) {
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

export function DispatchTimelineCard({
  data,
  hasTimeline,
}: DispatchTimelineCardProps) {
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
                  <span>Statut: </span>
                  <span className="text-ink">{entry.status}</span>
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

export function DispatchPayloadRefsCard({
  data,
  hasPayloadRefs,
}: DispatchPayloadRefsCardProps) {
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

export function DispatchDegradedState({ reasons }: DispatchDegradedStateProps) {
  return reasons.length > 0 ? (
    <ReadOnlyStateCard
      tone="warning"
      title="Lecture partielle"
      message="Le dispatch est lisible, mais certaines traces read-only sont encore incompletes."
      details={reasons}
    />
  ) : null;
}

export function DispatchRuntimePanels({
  orgId,
  data,
  canManageDispatch,
  contractAllowsWriteback,
  missingWritebackPermissions,
  onRefresh,
}: DispatchRuntimePanelsProps) {
  return (
    <div className="space-y-4">
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
    </div>
  );
}
