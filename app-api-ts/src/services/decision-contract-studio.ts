import type { DecisionContract } from "@praedixa/shared-types/domain";
import type {
  DecisionContractStudioAuditEntryResponse,
  DecisionContractStudioBadge,
  DecisionContractStudioChangeSummary,
  DecisionContractStudioChecklistItem,
  DecisionContractStudioDetailRequest,
  DecisionContractStudioDetailResponse,
  DecisionContractStudioForkDraftRequest,
  DecisionContractStudioForkDraftResponse,
  DecisionContractStudioListItemResponse,
  DecisionContractStudioListRequest,
  DecisionContractStudioListResponse,
  DecisionContractStudioPublishReadinessResponse,
  DecisionContractStudioRollbackCandidateItemResponse,
  DecisionContractStudioRollbackCandidateRequest,
  DecisionContractStudioRollbackCandidateResponse,
  DecisionContractStudioValidationSummaryResponse,
  DecisionContractStudioVersionLineageDisplay,
} from "@praedixa/shared-types/api";

import {
  canPublishDecisionContract,
  forkDecisionContractVersion,
} from "./decision-contracts.js";

export type {
  DecisionContractStudioAuditEntryResponse,
  DecisionContractStudioBadge,
  DecisionContractStudioChangeSummary,
  DecisionContractStudioDetailRequest,
  DecisionContractStudioDetailResponse,
  DecisionContractStudioForkDraftRequest,
  DecisionContractStudioForkDraftResponse,
  DecisionContractStudioListItemResponse,
  DecisionContractStudioListRequest,
  DecisionContractStudioListResponse,
  DecisionContractStudioPublishReadinessResponse,
  DecisionContractStudioRollbackCandidateItemResponse,
  DecisionContractStudioRollbackCandidateRequest,
  DecisionContractStudioRollbackCandidateResponse,
  DecisionContractStudioValidationSummaryResponse,
  DecisionContractStudioVersionLineageDisplay,
};

interface DecisionContractStudioCollectionDelta {
  added: number;
  removed: number;
  changed: number;
  unchanged: number;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(value);
}

function summarizeCollectionDelta<T>(
  current: readonly T[],
  previous: readonly T[],
  keyOf: (item: T) => string,
): DecisionContractStudioCollectionDelta {
  const previousByKey = new Map(previous.map((item) => [keyOf(item), item]));
  const currentByKey = new Map(current.map((item) => [keyOf(item), item]));

  let added = 0;
  let changed = 0;
  let unchanged = 0;

  for (const [key, item] of currentByKey) {
    const previousItem = previousByKey.get(key);
    if (!previousItem) {
      added += 1;
      continue;
    }
    if (stableStringify(previousItem) === stableStringify(item)) {
      unchanged += 1;
    } else {
      changed += 1;
    }
  }

  let removed = 0;
  for (const key of previousByKey.keys()) {
    if (!currentByKey.has(key)) {
      removed += 1;
    }
  }

  return {
    added,
    removed,
    changed,
    unchanged,
  };
}

function buildBadge(contract: DecisionContract): DecisionContractStudioBadge {
  if (contract.status === "published") {
    return { label: "Published", tone: "success" };
  }
  if (contract.status === "approved") {
    return { label: "Approved", tone: "info" };
  }
  if (contract.status === "testing") {
    return { label: "Testing", tone: "info" };
  }
  if (contract.status === "archived") {
    return { label: "Archived", tone: "neutral" };
  }
  if (contract.validation?.status === "failed") {
    return { label: "Blocked", tone: "warning" };
  }
  return { label: "Draft", tone: "neutral" };
}

export function buildDecisionContractStudioValidationSummary(
  contract: DecisionContract,
): DecisionContractStudioValidationSummaryResponse {
  const status = contract.validation?.status ?? "pending";
  const issues = contract.validation?.issues ?? [];
  return {
    contractId: contract.contractId,
    contractVersion: contract.contractVersion,
    status,
    checkedAt: contract.validation?.checkedAt ?? null,
    issueCount: issues.length,
    blocking: status === "failed" || issues.length > 0,
    issues,
    badge:
      status === "passed"
        ? { label: "Validated", tone: "success" }
        : status === "failed"
          ? { label: "Validation failed", tone: "warning" }
          : { label: "Pending validation", tone: "neutral" },
  };
}

export function buildDecisionContractStudioPublishReadiness(
  contract: DecisionContract,
): DecisionContractStudioPublishReadinessResponse {
  const checklist: DecisionContractStudioChecklistItem[] = [
    {
      key: "inputs",
      label: "At least one input",
      complete: contract.inputs.length > 0,
      blocking: true,
    },
    {
      key: "decisionVariables",
      label: "At least one decision variable",
      complete: contract.decisionVariables.length > 0,
      blocking: true,
    },
    {
      key: "hardConstraints",
      label: "At least one hard constraint",
      complete: contract.hardConstraints.length > 0,
      blocking: true,
    },
    {
      key: "actions",
      label: "At least one allowed action",
      complete: contract.actions.length > 0,
      blocking: true,
    },
    {
      key: "validation",
      label: "Validation passed",
      complete: contract.validation?.status === "passed",
      blocking: true,
      detail:
        contract.validation?.status === "failed"
          ? contract.validation.issues.join("; ")
          : undefined,
    },
    {
      key: "approvalAudit",
      label: "Approved audit metadata present",
      complete:
        (contract.audit.approvedAt?.length ?? 0) > 0 &&
        (contract.audit.approvedBy?.length ?? 0) > 0,
      blocking: true,
    },
    {
      key: "status",
      label: "Contract is approved",
      complete:
        contract.status === "approved" || contract.status === "published",
      blocking: true,
    },
  ];

  const blockingCount = checklist.filter(
    (item) => item.blocking && !item.complete,
  ).length;
  const isReady = blockingCount === 0 && canPublishDecisionContract(contract);

  return {
    contractId: contract.contractId,
    contractVersion: contract.contractVersion,
    isReady,
    blockingCount,
    checklist,
    badge: isReady
      ? { label: "Ready to publish", tone: "success" }
      : { label: "Not ready", tone: "warning" },
  };
}

export function buildDecisionContractStudioLineageDisplay(
  contract: DecisionContract,
): DecisionContractStudioVersionLineageDisplay {
  const previousVersion = contract.audit.previousVersion ?? null;
  const rollbackFromVersion = contract.audit.rollbackFromVersion ?? null;
  let label = `v${contract.contractVersion}`;
  if (previousVersion != null) {
    label += ` <- v${previousVersion}`;
  }
  if (rollbackFromVersion != null) {
    label += ` (rollback of v${rollbackFromVersion})`;
  }
  return {
    currentVersion: contract.contractVersion,
    previousVersion,
    rollbackFromVersion,
    label,
  };
}

export function buildDecisionContractStudioChangeSummary(
  contract: DecisionContract,
  compareTo: DecisionContract,
): DecisionContractStudioChangeSummary {
  return {
    hasChanges: stableStringify(contract) !== stableStringify(compareTo),
    graphRefChanged:
      stableStringify(contract.graphRef) !==
      stableStringify(compareTo.graphRef),
    scopeChanged:
      stableStringify(contract.scope) !== stableStringify(compareTo.scope),
    objectiveChanged:
      stableStringify(contract.objective) !==
      stableStringify(compareTo.objective),
    roiFormulaChanged:
      stableStringify(contract.roiFormula) !==
      stableStringify(compareTo.roiFormula),
    explanationTemplateChanged:
      stableStringify(contract.explanationTemplate) !==
      stableStringify(compareTo.explanationTemplate),
    inputs: summarizeCollectionDelta(
      contract.inputs,
      compareTo.inputs,
      (item) => item.key,
    ),
    decisionVariables: summarizeCollectionDelta(
      contract.decisionVariables,
      compareTo.decisionVariables,
      (item) => item.key,
    ),
    hardConstraints: summarizeCollectionDelta(
      contract.hardConstraints,
      compareTo.hardConstraints,
      (item) => item.key,
    ),
    softConstraints: summarizeCollectionDelta(
      contract.softConstraints,
      compareTo.softConstraints,
      (item) => item.key,
    ),
    approvals: summarizeCollectionDelta(
      contract.approvals,
      compareTo.approvals,
      (item) => item.ruleId,
    ),
    actions: summarizeCollectionDelta(
      contract.actions,
      compareTo.actions,
      (item) => item.actionType,
    ),
    policyHooks: summarizeCollectionDelta(
      contract.policyHooks.map((key) => ({ key })),
      compareTo.policyHooks.map((key) => ({ key })),
      (item) => item.key,
    ),
    tags: summarizeCollectionDelta(
      (contract.tags ?? []).map((key) => ({ key })),
      (compareTo.tags ?? []).map((key) => ({ key })),
      (item) => item.key,
    ),
  };
}

function toListItem(
  contract: DecisionContract,
): DecisionContractStudioListItemResponse {
  return {
    contractId: contract.contractId,
    contractVersion: contract.contractVersion,
    name: contract.name,
    pack: contract.pack,
    status: contract.status,
    updatedAt: contract.audit.updatedAt,
    badge: buildBadge(contract),
    validation: buildDecisionContractStudioValidationSummary(contract),
    publishReadiness: buildDecisionContractStudioPublishReadiness(contract),
    lineage: buildDecisionContractStudioLineageDisplay(contract),
  };
}

export function buildDecisionContractStudioListResponse(
  contracts: readonly DecisionContract[],
  request: DecisionContractStudioListRequest = {},
): DecisionContractStudioListResponse {
  const search = request.search?.trim().toLowerCase();
  const items = contracts
    .filter(
      (contract) => request.includeArchived || contract.status !== "archived",
    )
    .filter((contract) =>
      request.pack == null ? true : contract.pack === request.pack,
    )
    .filter((contract) =>
      request.statuses == null || request.statuses.length === 0
        ? true
        : request.statuses.includes(contract.status),
    )
    .filter((contract) =>
      search == null
        ? true
        : `${contract.contractId} ${contract.name}`
            .toLowerCase()
            .includes(search),
    )
    .sort((left, right) => right.contractVersion - left.contractVersion)
    .map(toListItem);

  return {
    total: items.length,
    items,
  };
}

export function buildDecisionContractStudioDetailResponse(
  contract: DecisionContract,
  compareTo?: DecisionContract | null,
  history: readonly DecisionContractStudioAuditEntryResponse[] = [],
): DecisionContractStudioDetailResponse {
  return {
    contract,
    badge: buildBadge(contract),
    validation: buildDecisionContractStudioValidationSummary(contract),
    publishReadiness: buildDecisionContractStudioPublishReadiness(contract),
    lineage: buildDecisionContractStudioLineageDisplay(contract),
    changeSummary:
      compareTo == null
        ? undefined
        : buildDecisionContractStudioChangeSummary(contract, compareTo),
    history,
  };
}

export function buildDecisionContractStudioForkDraftResponse(
  contract: DecisionContract,
  request: DecisionContractStudioForkDraftRequest,
  targetContractVersion?: number,
): DecisionContractStudioForkDraftResponse {
  const draftContract = forkDecisionContractVersion(contract, {
    actor: request.actor,
    name: request.name,
    description: request.description,
  });

  return {
    sourceContractId: contract.contractId,
    sourceContractVersion: contract.contractVersion,
    targetContractVersion,
    draftContract,
    badge: buildBadge(draftContract),
    validation: buildDecisionContractStudioValidationSummary(draftContract),
    publishReadiness:
      buildDecisionContractStudioPublishReadiness(draftContract),
    lineage: buildDecisionContractStudioLineageDisplay(draftContract),
  };
}

export function buildDecisionContractStudioRollbackCandidateResponse(
  contract: DecisionContract,
  history: readonly DecisionContract[],
  _request?: DecisionContractStudioRollbackCandidateRequest,
): DecisionContractStudioRollbackCandidateResponse {
  const candidates: DecisionContractStudioRollbackCandidateItemResponse[] =
    history
      .filter(
        (item) =>
          item.contractId === contract.contractId &&
          item.contractVersion < contract.contractVersion,
      )
      .sort((left, right) => right.contractVersion - left.contractVersion)
      .map((item) => ({
        contractId: item.contractId,
        contractVersion: item.contractVersion,
        status: item.status,
        updatedAt: item.audit.updatedAt,
        changeReason: item.audit.changeReason,
        badge: buildBadge(item),
        validation: buildDecisionContractStudioValidationSummary(item),
        lineage: buildDecisionContractStudioLineageDisplay(item),
      }));

  return {
    contractId: contract.contractId,
    contractVersion: contract.contractVersion,
    candidates,
  };
}
