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

type InlineTableBlockProps<T> = {
  title: string;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  columns: DataTableColumn<T>[];
  data: T[];
  getRowKey: (row: T) => string;
};

type ConnectionsTableProps = {
  connections: IntegrationConnection[];
};

type IssueCredentialButtonProps = {
  canManageIntegrations: boolean;
  actionLoading: string | null;
  effectiveIntegrationId: string | null;
  onIssueCredential: () => void;
};

type CredentialTableProps = {
  canManageIntegrations: boolean;
  actionLoading: string | null;
  credentials: AsyncTableState<IntegrationIngestCredential>;
  onRevokeCredential: (credentialId: string) => void;
};

type SyncRunTableProps = {
  syncRuns: AsyncTableState<IntegrationSyncRun>;
};

type RawEventTableProps = {
  rawEvents: AsyncTableState<IntegrationRawEvent>;
};

type IntegrationDataPanelsProps = {
  canManageIntegrations: boolean;
  actionLoading: string | null;
  effectiveIntegrationId: string | null;
  syncRuns: AsyncTableState<IntegrationSyncRun>;
  credentials: AsyncTableState<IntegrationIngestCredential>;
  rawEvents: AsyncTableState<IntegrationRawEvent>;
  onIssueCredential: () => void;
  onRevokeCredential: (credentialId: string) => void;
};

function InlineTableBlock<T>(props: Readonly<InlineTableBlockProps<T>>) {
  const { title, loading, error, onRetry, columns, data, getRowKey } = props;
  let content = (
    <DataTable columns={columns} data={data} getRowKey={getRowKey} />
  );
  if (loading) {
    content = <SkeletonCard />;
  } else if (error) {
    content = <ErrorFallback message={error} onRetry={onRetry} />;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-ink">{title}</p>
      {content}
    </div>
  );
}

export function ConnectionsTable(props: Readonly<ConnectionsTableProps>) {
  const { connections } = props;
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

function IssueCredentialButton(props: Readonly<IssueCredentialButtonProps>) {
  const {
    canManageIntegrations,
    actionLoading,
    effectiveIntegrationId,
    onIssueCredential,
  } = props;
  const hasEffectiveIntegration = effectiveIntegrationId != null;
  const isActionIdle = actionLoading == null;
  const canIssueCredential =
    canManageIntegrations && hasEffectiveIntegration && isActionIdle;

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        onClick={onIssueCredential}
        disabled={!canIssueCredential}
      >
        Generer une cle d'ingestion
      </Button>
    </div>
  );
}

function CredentialTable(props: Readonly<CredentialTableProps>) {
  const {
    canManageIntegrations,
    actionLoading,
    credentials,
    onRevokeCredential,
  } = props;
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

function SyncRunTable(props: Readonly<SyncRunTableProps>) {
  const { syncRuns } = props;
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

function RawEventTable(props: Readonly<RawEventTableProps>) {
  const { rawEvents } = props;
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

export function IntegrationDataPanels(
  props: Readonly<IntegrationDataPanelsProps>,
) {
  const {
    canManageIntegrations,
    actionLoading,
    effectiveIntegrationId,
    syncRuns,
    credentials,
    rawEvents,
    onIssueCredential,
    onRevokeCredential,
  } = props;
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
