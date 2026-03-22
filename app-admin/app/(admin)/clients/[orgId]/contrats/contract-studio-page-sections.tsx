"use client";

import type { ReactNode } from "react";
import type {
  DecisionContractStudioListResponse,
  DecisionContractTemplateListResponse,
} from "@praedixa/shared-types/api";
import { Card, CardContent, SkeletonCard, StatCard } from "@praedixa/ui";
import { FileCheck2, GitBranch, ShieldCheck } from "lucide-react";

import { ErrorFallback } from "@/components/error-fallback";
import { ReadOnlyDetailHeader, ReadOnlyStateCard } from "../read-only-detail";
import { ContractStudioPanels } from "./contract-studio-panels";
import type {
  ContractStudioSelection,
  ContractStudioStatusCounts,
} from "./contract-studio-shared";

const CONTRACT_STUDIO_DESCRIPTION =
  "Gouvernance runtime des DecisionContracts, de leur lifecycle et de leur audit.";

export function ContractStudioLoadingState() {
  return (
    <div className="space-y-4">
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}

export function ContractStudioErrorState({
  orgId,
  error,
  onRetry,
}: Readonly<{
  orgId: string;
  error: string;
  onRetry: () => void;
}>) {
  return (
    <div className="space-y-6">
      <ContractStudioHeader orgId={orgId} />
      <ErrorFallback message={error} onRetry={onRetry} />
    </div>
  );
}

export function ContractStudioPageBody({
  orgId,
  list,
  statusCounts,
  templatesError,
  mainContent,
}: Readonly<{
  orgId: string;
  list: DecisionContractStudioListResponse;
  statusCounts: ContractStudioStatusCounts;
  templatesError: string | null;
  mainContent: ReactNode;
}>) {
  return (
    <div className="space-y-6">
      <ContractStudioHeader orgId={orgId} />
      <ContractStudioStatsGrid total={list.total} statusCounts={statusCounts} />
      {templatesError ? (
        <ContractStudioTemplateWarning error={templatesError} />
      ) : null}
      {mainContent}
    </div>
  );
}

export function ContractStudioMainContent({
  hasContracts,
  orgId,
  templates,
  canMutate,
  onSelectionChange,
  splitLayout,
}: Readonly<{
  hasContracts: boolean;
  orgId: string;
  templates: DecisionContractTemplateListResponse | null;
  canMutate: boolean;
  onSelectionChange: (selection: ContractStudioSelection) => void;
  splitLayout: ReactNode;
}>) {
  if (hasContracts) {
    return <div className="space-y-6">{splitLayout}</div>;
  }
  return (
    <ContractStudioPanels
      orgId={orgId}
      detail={null}
      rollbackCandidates={null}
      templates={templates}
      canMutate={canMutate}
      onSelectionChange={onSelectionChange}
    />
  );
}

export function ContractStudioSplitLayout({
  versionList,
  detailColumn,
}: Readonly<{
  versionList: ReactNode;
  detailColumn: ReactNode;
}>) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
      {versionList}
      <div className="space-y-6">{detailColumn}</div>
    </div>
  );
}

export function ContractStudioVersionListCard({
  list,
  selection,
  onSelectItem,
}: Readonly<{
  list: DecisionContractStudioListResponse;
  selection: ContractStudioSelection | null;
  onSelectItem: (selection: ContractStudioSelection) => void;
}>) {
  return (
    <Card className="rounded-2xl shadow-soft">
      <CardContent className="space-y-3 p-5">
        <h3 className="text-sm font-medium text-ink-secondary">
          Versions disponibles
        </h3>
        {list.items.map((item) => (
          <ContractStudioVersionButton
            key={`${item.contractId}-${item.contractVersion}`}
            item={item}
            isActive={
              selection?.contractId === item.contractId &&
              selection.contractVersion === item.contractVersion
            }
            onSelectItem={onSelectItem}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function ContractStudioHeader({ orgId }: Readonly<{ orgId: string }>) {
  return (
    <ReadOnlyDetailHeader
      backHref={`/clients/${encodeURIComponent(orgId)}/config`}
      backLabel="Retour a la configuration"
      title="Contract Studio"
      description={CONTRACT_STUDIO_DESCRIPTION}
    />
  );
}

function ContractStudioStatsGrid({
  total,
  statusCounts,
}: Readonly<{
  total: number;
  statusCounts: ContractStudioStatusCounts;
}>) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Versions visibles"
        value={String(total)}
        icon={<FileCheck2 className="h-4 w-4" />}
      />
      <StatCard
        label="Drafts"
        value={String(statusCounts.draft)}
        icon={<GitBranch className="h-4 w-4" />}
      />
      <StatCard
        label="Testing"
        value={String(statusCounts.testing)}
        icon={<ShieldCheck className="h-4 w-4" />}
      />
      <StatCard
        label="Published"
        value={String(statusCounts.published)}
        icon={<FileCheck2 className="h-4 w-4" />}
      />
    </div>
  );
}

function ContractStudioTemplateWarning({ error }: Readonly<{ error: string }>) {
  return (
    <ReadOnlyStateCard
      tone="warning"
      title="Catalogue partiel"
      message="Le runtime contrat reste disponible, mais le catalogue de templates n'a pas pu etre charge."
      details={[error]}
    />
  );
}

function ContractStudioVersionButton({
  item,
  isActive,
  onSelectItem,
}: Readonly<{
  item: DecisionContractStudioListResponse["items"][number];
  isActive: boolean;
  onSelectItem: (selection: ContractStudioSelection) => void;
}>) {
  const stateClassName = isActive
    ? "border-[var(--brand)] bg-[color:var(--brand)]/5"
    : "border-border bg-surface-sunken hover:border-border-strong";
  const className = `w-full rounded-xl border p-3 text-left transition ${stateClassName}`;
  return (
    <button
      type="button"
      onClick={() =>
        onSelectItem({
          contractId: item.contractId,
          contractVersion: item.contractVersion,
        })
      }
      className={className}
    >
      <p className="text-sm font-semibold text-ink">{item.name}</p>
      <p className="text-xs text-ink-tertiary">
        {item.contractId} v{item.contractVersion} · {item.status}
      </p>
      <p className="mt-1 text-xs text-ink-tertiary">
        {item.publishReadiness.badge.label}
      </p>
    </button>
  );
}
