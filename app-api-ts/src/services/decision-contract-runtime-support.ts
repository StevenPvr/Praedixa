import { randomUUID } from "node:crypto";

import type {
  DecisionContract,
  DecisionContractActor,
} from "@praedixa/shared-types/domain";
import type {
  DecisionContractStudioCreateRequest,
  DecisionContractStudioAuditEntryResponse,
  DecisionContractTemplateInstantiateRequest,
} from "@praedixa/shared-types/api";

export class DecisionContractRuntimeError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly statusCode = 400,
  ) {
    super(message);
    this.name = "DecisionContractRuntimeError";
  }
}

export function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function normalizeOptionalText(
  value: string | null | undefined,
): string | null {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

export function assertDraftStatus(contract: DecisionContract): void {
  if (contract.status !== "draft") {
    throw new DecisionContractRuntimeError(
      "DECISION_CONTRACT_DRAFT_REQUIRED",
      "Only draft DecisionContracts can be saved.",
      409,
    );
  }
}

export function assertSameLineage(
  incoming: DecisionContract,
  existing: DecisionContract,
): void {
  if (incoming.contractId !== existing.contractId) {
    throw new DecisionContractRuntimeError(
      "DECISION_CONTRACT_ID_IMMUTABLE",
      "DecisionContract contractId cannot change once persisted.",
      409,
    );
  }
  if (incoming.contractVersion !== existing.contractVersion) {
    throw new DecisionContractRuntimeError(
      "DECISION_CONTRACT_VERSION_IMMUTABLE",
      "DecisionContract contractVersion cannot change once persisted.",
      409,
    );
  }
}

export function assertTransitionSod(
  contract: DecisionContract,
  transition: string,
  actor: DecisionContractActor,
): void {
  if (transition === "approve" && actor.userId === contract.audit.updatedBy) {
    throw new DecisionContractRuntimeError(
      "DECISION_CONTRACT_SOD_REQUIRED",
      "The last editor cannot approve the same DecisionContract version.",
      409,
    );
  }

  if (transition !== "publish") {
    return;
  }

  if (actor.userId === contract.audit.updatedBy) {
    throw new DecisionContractRuntimeError(
      "DECISION_CONTRACT_SOD_REQUIRED",
      "The last editor cannot publish the same DecisionContract version.",
      409,
    );
  }

  if (contract.audit.approvedBy && actor.userId === contract.audit.approvedBy) {
    throw new DecisionContractRuntimeError(
      "DECISION_CONTRACT_SOD_REQUIRED",
      "The approver and publisher must be distinct actors.",
      409,
    );
  }
}

function applyActorToDraft(
  contract: DecisionContract,
  actor: DecisionContractActor,
  workspaceId?: string | null,
): DecisionContract {
  const next = cloneValue(contract);
  next.workspaceId = normalizeOptionalText(workspaceId) ?? next.workspaceId;
  next.status = "draft";
  next.audit = {
    ...next.audit,
    updatedBy: actor.userId,
    updatedAt: actor.decidedAt,
    changeReason: actor.reason,
    notes: actor.notes ?? next.audit.notes ?? null,
  };
  return next;
}

export function prepareNewDraftContract(
  contract: DecisionContract,
  organizationId: string,
  workspaceId: string | null,
  actor: DecisionContractActor,
): DecisionContract {
  const next = applyActorToDraft(contract, actor, workspaceId);
  next.organizationId = organizationId;
  next.workspaceId = workspaceId ?? undefined;
  next.audit = {
    ...next.audit,
    createdBy: actor.userId,
    createdAt: actor.decidedAt,
    updatedBy: actor.userId,
    updatedAt: actor.decidedAt,
    changeReason: actor.reason,
    notes: actor.notes ?? null,
  };
  return next;
}

export function buildRollbackDraft(
  current: DecisionContract,
  target: DecisionContract,
  latestVersion: number,
  actor: DecisionContractActor,
  name?: string,
  description?: string,
): DecisionContract {
  if (target.status === "draft") {
    throw new DecisionContractRuntimeError(
      "DECISION_CONTRACT_ROLLBACK_TARGET_INVALID",
      "Rollback target must be a non-draft version.",
      409,
    );
  }

  const next = cloneValue(target);
  next.contractVersion = latestVersion + 1;
  next.status = "draft";
  next.name = name?.trim() || target.name;
  next.description = description?.trim() || target.description || "";
  next.validation = {
    ...(next.validation == null ? {} : next.validation),
    status: "pending",
    checkedAt: null,
    issues: [],
  };
  next.audit = {
    ...next.audit,
    previousVersion: current.contractVersion,
    rollbackFromVersion: current.contractVersion,
    createdBy: actor.userId,
    createdAt: actor.decidedAt,
    updatedBy: actor.userId,
    updatedAt: actor.decidedAt,
    changeReason: actor.reason,
    notes: actor.notes ?? null,
    approvedBy: null,
    approvedAt: null,
    publishedBy: null,
    publishedAt: null,
    archivedBy: null,
    archivedAt: null,
  };
  return next;
}

export function buildAuditEntry(
  contract: DecisionContract,
  action: string,
  reason: string,
  actorUserId: string,
  metadata: Record<string, unknown> = {},
): DecisionContractStudioAuditEntryResponse {
  return {
    auditId: randomUUID(),
    action,
    actorUserId,
    targetContractVersion: contract.contractVersion,
    reason,
    createdAt: contract.audit.updatedAt,
    metadata: {
      contractId: contract.contractId,
      contractVersion: contract.contractVersion,
      status: contract.status,
      ...metadata,
    },
  };
}

export function normalizeScopeOverrides(
  scopeOverrides?: DecisionContractStudioCreateRequest["scopeOverrides"],
): DecisionContractTemplateInstantiateRequest["scopeOverrides"] {
  if (!scopeOverrides) {
    return undefined;
  }

  const selector =
    scopeOverrides.selector?.mode == null
      ? undefined
      : scopeOverrides.selector.mode === "ids"
        ? {
            mode: "ids" as const,
            ids: scopeOverrides.selector.ids
              ? [...scopeOverrides.selector.ids]
              : [],
          }
        : scopeOverrides.selector.mode === "query"
          ? {
              mode: "query" as const,
              query: scopeOverrides.selector.query,
            }
          : { mode: "all" as const };

  return {
    entityType: scopeOverrides.entityType,
    selector,
    horizonId: scopeOverrides.horizonId,
    dimensions: scopeOverrides.dimensions,
  };
}
