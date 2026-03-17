"use client";

import {
  Button,
  DataTable,
  SkeletonCard,
  type DataTableColumn,
} from "@praedixa/ui";

import { ErrorFallback } from "@/components/error-fallback";

import {
  buildIngestCredentialColumns,
  buildIntegrationColumns,
  buildRawEventColumns,
  buildSyncRunColumns,
} from "./config-columns";
import { formatDateTime } from "./config-operations";
import type {
  IntegrationConnection,
  IntegrationIngestCredential,
  IntegrationRawEvent,
  IntegrationSyncRun,
} from "./config-types";

export interface AsyncTableState<T> {
  loading: boolean;
  error: string | null;
  refetch: () => void;
  data: T[] | null | undefined;
}

function InlineTableBlock<T>({
  title,
  loading,
  error,
  onRetry,
  columns,
  data,
  getRowKey,
}: {
  title: string;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  columns: DataTableColumn<T>[];
  data: T[];
  getRowKey: (row: T) => string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-ink">{title}</p>
      {loading ? (
        <SkeletonCard />
      ) : error ? (
        <ErrorFallback message={error} onRetry={onRetry} />
      ) : (
        <DataTable columns={columns} data={data} getRowKey={getRowKey} />
      )}
    </div>
  );
}

export function ConnectionsTable({
  connections,
}: {
  connections: IntegrationConnection[];
}) {
  return (
    <InlineTableBlock
      title="Connexions configurees"
      loading={false}
      error={null}
      onRetry={() => undefined}
      columns={buildIntegrationColumns({ formatDateTime })}
      data={connections}
      getRowKey={(row) => row.id}
    />
  );
}

function IssueCredentialButton({
  canManageIntegrations,
  actionLoading,
  effectiveIntegrationId,
  onIssueCredential,
}: {
  canManageIntegrations: boolean;
  actionLoading: string | null;
  effectiveIntegrationId: string | null;
  onIssueCredential: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        onClick={onIssueCredential}
        disabled={
          !canManageIntegrations ||
          !effectiveIntegrationId ||
          actionLoading != null
        }
      >
        Generer une cle d'ingestion
      </Button>
    </div>
  );
}

function CredentialTable({
  canManageIntegrations,
  actionLoading,
  credentials,
  onRevokeCredential,
}: {
  canManageIntegrations: boolean;
  actionLoading: string | null;
  credentials: AsyncTableState<IntegrationIngestCredential>;
  onRevokeCredential: (credentialId: string) => void;
}) {
  const columns = buildIngestCredentialColumns({
    formatDateTime,
    canManageIntegrations,
    actionLoading,
    onRevoke: onRevokeCredential,
  });

  return (
    <InlineTableBlock
      title="Cles d'ingestion"
      loading={credentials.loading}
      error={credentials.error}
      onRetry={credentials.refetch}
      columns={columns}
      data={credentials.data ?? []}
      getRowKey={(row) => row.id}
    />
  );
}

function SyncRunTable({
  syncRuns,
}: {
  syncRuns: AsyncTableState<IntegrationSyncRun>;
}) {
  return (
    <InlineTableBlock
      title="Runs de sync"
      loading={syncRuns.loading}
      error={syncRuns.error}
      onRetry={syncRuns.refetch}
      columns={buildSyncRunColumns({ formatDateTime })}
      data={syncRuns.data ?? []}
      getRowKey={(row) => row.id}
    />
  );
}

function RawEventTable({
  rawEvents,
}: {
  rawEvents: AsyncTableState<IntegrationRawEvent>;
}) {
  return (
    <InlineTableBlock
      title="Evenements recus"
      loading={rawEvents.loading}
      error={rawEvents.error}
      onRetry={rawEvents.refetch}
      columns={buildRawEventColumns({ formatDateTime })}
      data={rawEvents.data ?? []}
      getRowKey={(row) => row.id}
    />
  );
}

export function IntegrationDataPanels({
  canManageIntegrations,
  actionLoading,
  effectiveIntegrationId,
  syncRuns,
  credentials,
  rawEvents,
  onIssueCredential,
  onRevokeCredential,
}: {
  canManageIntegrations: boolean;
  actionLoading: string | null;
  effectiveIntegrationId: string | null;
  syncRuns: AsyncTableState<IntegrationSyncRun>;
  credentials: AsyncTableState<IntegrationIngestCredential>;
  rawEvents: AsyncTableState<IntegrationRawEvent>;
  onIssueCredential: () => void;
  onRevokeCredential: (credentialId: string) => void;
}) {
  return (
    <>
      <IssueCredentialButton
        canManageIntegrations={canManageIntegrations}
        actionLoading={actionLoading}
        effectiveIntegrationId={effectiveIntegrationId}
        onIssueCredential={onIssueCredential}
      />
      <SyncRunTable syncRuns={syncRuns} />
      <CredentialTable
        canManageIntegrations={canManageIntegrations}
        actionLoading={actionLoading}
        credentials={credentials}
        onRevokeCredential={onRevokeCredential}
      />
      <RawEventTable rawEvents={rawEvents} />
    </>
  );
}
