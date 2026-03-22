"use client";

import { useEffect, useState } from "react";

import type {
  DecisionContractStudioDetailResponse,
  DecisionContractStudioListResponse,
  DecisionContractStudioRollbackCandidateResponse,
  DecisionContractTemplateListResponse,
} from "@praedixa/shared-types/api";

import { useApiGet } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { useCurrentUser } from "@/lib/auth/client";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { useClientContext } from "../client-context";
import { ContractStudioDetailColumn } from "./contract-studio-detail-column";
import {
  ContractStudioErrorState,
  ContractStudioLoadingState,
  ContractStudioMainContent,
  ContractStudioPageBody,
  ContractStudioSplitLayout,
  ContractStudioVersionListCard,
} from "./contract-studio-page-sections";
import {
  buildContractStatusCounts,
  buildSelectionFromList,
  type ContractStudioSelection,
} from "./contract-studio-shared";

const EMPTY_CONTRACT_LIST: DecisionContractStudioListResponse = {
  items: [],
  total: 0,
};

type ContractStudioSelectionStateInput = {
  list: DecisionContractStudioListResponse | null;
  selection: ContractStudioSelection | null;
  setSelection: (selection: ContractStudioSelection | null) => void;
  refetchAll: () => void;
};

type ContractStudioPageState = ReturnType<typeof useContractStudioPageState>;

type ContractStudioLoadedSplitContentProps = {
  orgId: string;
  canMutate: boolean;
  list: DecisionContractStudioListResponse;
  state: ContractStudioPageState;
};

type ContractStudioLoadedPageProps = {
  orgId: string;
  canMutate: boolean;
  state: ContractStudioPageState;
};

function buildDetailUrl(
  orgId: string,
  selection: ContractStudioSelection | null,
): string | null {
  if (!selection) {
    return null;
  }
  const base = ADMIN_ENDPOINTS.orgDecisionContractDetail(
    orgId,
    selection.contractId,
    selection.contractVersion,
  );
  return selection.contractVersion > 1
    ? `${base}?compare_to_version=${selection.contractVersion - 1}`
    : base;
}

function useContractStudioQueries(
  orgId: string,
  selection: ContractStudioSelection | null,
) {
  return {
    list: useApiGet<DecisionContractStudioListResponse>(
      ADMIN_ENDPOINTS.orgDecisionContracts(orgId),
    ),
    templates: useApiGet<DecisionContractTemplateListResponse>(
      ADMIN_ENDPOINTS.decisionContractTemplates,
    ),
    detail: useApiGet<DecisionContractStudioDetailResponse>(
      buildDetailUrl(orgId, selection),
    ),
    rollback: useApiGet<DecisionContractStudioRollbackCandidateResponse>(
      selection
        ? ADMIN_ENDPOINTS.orgDecisionContractRollbackCandidates(
            orgId,
            selection.contractId,
            selection.contractVersion,
          )
        : null,
    ),
  };
}

function useContractStudioSelectionState({
  list,
  selection,
  setSelection,
  refetchAll,
}: Readonly<ContractStudioSelectionStateInput>) {
  useEffect(() => {
    if (selection) {
      return;
    }
    const next = buildSelectionFromList(list);
    if (next) {
      setSelection(next);
    }
  }, [list, selection, setSelection]);

  function handleSelectionChange(next: ContractStudioSelection) {
    setSelection(next);
    refetchAll();
  }

  return {
    statusCounts: buildContractStatusCounts(list),
    handleSelectionChange,
  };
}

function useContractStudioPageState(orgId: string) {
  const [selection, setSelection] = useState<ContractStudioSelection | null>(
    null,
  );
  const queries = useContractStudioQueries(orgId, selection);
  const refetchAll = () => {
    queries.list.refetch();
    queries.detail.refetch();
    queries.rollback.refetch();
  };
  const selectionState = useContractStudioSelectionState({
    list: queries.list.data ?? null,
    selection,
    setSelection,
    refetchAll,
  });
  return {
    queries,
    selection,
    setSelection,
    statusCounts: selectionState.statusCounts,
    handleSelectionChange: selectionState.handleSelectionChange,
  };
}

function ContractStudioLoadedSplitContent(
  props: Readonly<ContractStudioLoadedSplitContentProps>,
) {
  const { orgId, canMutate, list, state } = props;
  return (
    <ContractStudioSplitLayout
      versionList={
        <ContractStudioVersionListCard
          list={list}
          selection={state.selection}
          onSelectItem={state.setSelection}
        />
      }
      detailColumn={
        <ContractStudioDetailColumn
          orgId={orgId}
          detailLoading={state.queries.detail.loading}
          rollbackLoading={state.queries.rollback.loading}
          detailError={state.queries.detail.error}
          rollbackError={state.queries.rollback.error}
          detail={state.queries.detail.data ?? null}
          rollbackCandidates={state.queries.rollback.data ?? null}
          templates={state.queries.templates.data ?? null}
          canMutate={canMutate}
          onSelectionChange={state.handleSelectionChange}
          onRetryDetail={state.queries.detail.refetch}
        />
      }
    />
  );
}

function ContractStudioLoadedPage(
  props: Readonly<ContractStudioLoadedPageProps>,
) {
  const { orgId, canMutate, state } = props;
  const list = state.queries.list.data ?? EMPTY_CONTRACT_LIST;
  return (
    <ContractStudioPageBody
      orgId={orgId}
      list={list}
      statusCounts={state.statusCounts}
      templatesError={state.queries.templates.error}
      mainContent={
        <ContractStudioMainContent
          hasContracts={list.items.length > 0}
          orgId={orgId}
          templates={state.queries.templates.data ?? null}
          canMutate={canMutate}
          onSelectionChange={state.handleSelectionChange}
          splitLayout={
            <ContractStudioLoadedSplitContent
              orgId={orgId}
              canMutate={canMutate}
              list={list}
              state={state}
            />
          }
        />
      }
    />
  );
}

export default function ContractStudioPage() {
  const { orgId } = useClientContext();
  const currentUser = useCurrentUser();
  const canMutate = hasAnyPermission(currentUser?.permissions, [
    "admin:org:write",
  ]);
  const state = useContractStudioPageState(orgId);
  if (state.queries.list.loading || state.queries.templates.loading) {
    return <ContractStudioLoadingState />;
  }
  if (state.queries.list.error) {
    return (
      <ContractStudioErrorState
        orgId={orgId}
        error={state.queries.list.error}
        onRetry={state.queries.list.refetch}
      />
    );
  }
  return (
    <ContractStudioLoadedPage
      orgId={orgId}
      canMutate={canMutate}
      state={state}
    />
  );
}
