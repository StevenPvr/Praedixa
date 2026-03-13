import type {
  DecisionContractActor,
  DecisionContract,
  DecisionContractAudit,
  DecisionContractStatus,
  DecisionContractTransition,
  DecisionContractValidationSummary,
} from "@praedixa/shared-types/domain";

const ALLOWED_STATUS_TRANSITIONS: Record<
  DecisionContractStatus,
  readonly DecisionContractStatus[]
> = {
  draft: ["testing", "archived"],
  testing: ["draft", "approved", "archived"],
  approved: ["draft", "published", "archived"],
  published: ["archived"],
  archived: ["draft"],
};

const TRANSITION_STATUS: Record<
  DecisionContractTransition,
  DecisionContractStatus
> = {
  submit_for_testing: "testing",
  approve: "approved",
  publish: "published",
  archive: "archived",
  reopen_draft: "draft",
};

function assertNonEmpty(value: string | null | undefined, field: string): void {
  if ((value?.trim().length ?? 0) === 0) {
    throw new Error(`${field} cannot be empty`);
  }
}

function assertPositiveInteger(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${field} must be >= 1`);
  }
}

function hasBlockingValidation(
  validation: DecisionContractValidationSummary | undefined,
): boolean {
  if (!validation) {
    return false;
  }
  return validation.status === "failed" || validation.issues.length > 0;
}

function assertStatusAuditIntegrity(contract: DecisionContract): void {
  if (contract.status === "approved") {
    assertNonEmpty(contract.audit.approvedAt, "audit.approvedAt");
    assertNonEmpty(contract.audit.approvedBy, "audit.approvedBy");
  }

  if (contract.status === "published") {
    assertNonEmpty(contract.audit.approvedAt, "audit.approvedAt");
    assertNonEmpty(contract.audit.approvedBy, "audit.approvedBy");
    assertNonEmpty(contract.audit.publishedAt, "audit.publishedAt");
    assertNonEmpty(contract.audit.publishedBy, "audit.publishedBy");
  }

  if (contract.status === "archived") {
    assertNonEmpty(contract.audit.archivedAt, "audit.archivedAt");
    assertNonEmpty(contract.audit.archivedBy, "audit.archivedBy");
  }

  if (contract.contractVersion === 1) {
    if (contract.audit.previousVersion != null) {
      throw new Error(
        "DecisionContract version 1 cannot declare previousVersion lineage",
      );
    }
    return;
  }

  if (contract.audit.previousVersion == null) {
    throw new Error(
      "DecisionContract version > 1 requires previousVersion lineage",
    );
  }

  if (contract.audit.previousVersion !== contract.contractVersion - 1) {
    throw new Error(
      "DecisionContract previousVersion lineage must match the prior version",
    );
  }

  if (
    contract.audit.rollbackFromVersion != null &&
    contract.audit.rollbackFromVersion >= contract.contractVersion
  ) {
    throw new Error(
      "DecisionContract rollbackFromVersion must point to an earlier version",
    );
  }
}

function assertActor(actor: DecisionContractActor): void {
  assertNonEmpty(actor.userId, "actor.userId");
  assertNonEmpty(actor.decidedAt, "actor.decidedAt");
  assertNonEmpty(actor.reason, "actor.reason");
}

function createValidationReset(
  validation: DecisionContractValidationSummary | undefined,
): DecisionContractValidationSummary {
  return {
    ...(validation == null ? {} : validation),
    status: "pending",
    checkedAt: null,
    issues: [],
  };
}

function createTransitionAudit(
  contract: DecisionContract,
  nextStatus: DecisionContractStatus,
  actor: DecisionContractActor,
): DecisionContractAudit {
  const nextAudit: DecisionContractAudit = {
    ...contract.audit,
    updatedAt: actor.decidedAt,
    updatedBy: actor.userId,
    changeReason: actor.reason,
    notes: actor.notes ?? contract.audit.notes ?? null,
    previousVersion:
      contract.audit.previousVersion ??
      (contract.contractVersion > 1 ? contract.contractVersion - 1 : null),
  };

  if (nextStatus === "approved") {
    nextAudit.approvedAt = actor.decidedAt;
    nextAudit.approvedBy = actor.userId;
  }

  if (nextStatus === "published") {
    nextAudit.publishedAt = actor.decidedAt;
    nextAudit.publishedBy = actor.userId;
  }

  if (nextStatus === "archived") {
    nextAudit.archivedAt = actor.decidedAt;
    nextAudit.archivedBy = actor.userId;
  }

  if (nextStatus === "draft") {
    nextAudit.archivedAt = null;
    nextAudit.archivedBy = null;
  }

  return nextAudit;
}

export function canTransitionDecisionContract(
  current: DecisionContractStatus,
  next: DecisionContractStatus,
): boolean {
  return ALLOWED_STATUS_TRANSITIONS[current].includes(next);
}

export function validateDecisionContract(contract: DecisionContract): void {
  assertNonEmpty(contract.contractId, "contractId");
  assertNonEmpty(contract.name, "name");
  assertNonEmpty(contract.audit.changeReason, "audit.changeReason");
  assertPositiveInteger(contract.contractVersion, "contractVersion");
  if (contract.inputs.length === 0) {
    throw new Error("DecisionContract requires at least one input");
  }
  if (contract.decisionVariables.length === 0) {
    throw new Error("DecisionContract requires at least one decision variable");
  }
  if (contract.hardConstraints.length === 0) {
    throw new Error("DecisionContract requires at least one hard constraint");
  }
  if (contract.actions.length === 0) {
    throw new Error("DecisionContract requires at least one allowed action");
  }

  assertStatusAuditIntegrity(contract);
}

export const assertDecisionContractIntegrity = validateDecisionContract;

export function canPublishDecisionContract(
  contract: DecisionContract,
): boolean {
  return (
    contract.status === "approved" &&
    !hasBlockingValidation(contract.validation) &&
    (contract.audit.approvedAt?.trim().length ?? 0) > 0 &&
    (contract.audit.approvedBy?.trim().length ?? 0) > 0
  );
}

export function transitionDecisionContract(
  contract: DecisionContract,
  transition: DecisionContractTransition,
  actor: DecisionContractActor,
): DecisionContract {
  validateDecisionContract(contract);
  assertActor(actor);

  const nextStatus = TRANSITION_STATUS[transition];
  if (!canTransitionDecisionContract(contract.status, nextStatus)) {
    throw new Error(
      `DecisionContract cannot transition from ${contract.status} to ${nextStatus}`,
    );
  }

  if (nextStatus === "approved" && hasBlockingValidation(contract.validation)) {
    throw new Error(
      "DecisionContract cannot be approved while validation is failing",
    );
  }

  if (nextStatus === "published") {
    if (!canPublishDecisionContract(contract)) {
      if (contract.status !== "approved") {
        throw new Error("DecisionContract must be approved before publication");
      }
      if (hasBlockingValidation(contract.validation)) {
        throw new Error(
          "DecisionContract cannot be published while validation is failing",
        );
      }
      throw new Error(
        "DecisionContract must include approved audit metadata before publication",
      );
    }
  }

  if (nextStatus === "draft" && contract.status !== "archived") {
    throw new Error("Only archived DecisionContracts can reopen as draft");
  }

  return {
    ...contract,
    status: nextStatus,
    audit: createTransitionAudit(contract, nextStatus, actor),
  };
}

export function forkDecisionContractVersion(
  contract: DecisionContract,
  input: {
    actor: DecisionContractActor;
    name?: string;
    description?: string;
  },
): DecisionContract {
  validateDecisionContract(contract);
  assertActor(input.actor);
  if (contract.status !== "published") {
    throw new Error("Only published DecisionContracts can be version-forked");
  }

  return {
    ...contract,
    contractVersion: contract.contractVersion + 1,
    name: input.name?.trim() || contract.name,
    description: input.description?.trim() || contract.description,
    status: "draft",
    validation: createValidationReset(contract.validation),
    audit: {
      ...contract.audit,
      createdBy: input.actor.userId,
      createdAt: input.actor.decidedAt,
      updatedBy: input.actor.userId,
      updatedAt: input.actor.decidedAt,
      changeReason: input.actor.reason,
      notes: input.actor.notes ?? null,
      previousVersion: contract.contractVersion,
      rollbackFromVersion: contract.contractVersion,
      approvedBy: null,
      approvedAt: null,
      publishedBy: null,
      publishedAt: null,
      archivedBy: null,
      archivedAt: null,
    },
  };
}
