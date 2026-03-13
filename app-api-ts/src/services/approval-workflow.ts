import type {
  ApprovalDecision,
  ApprovalMatrixRule,
  ApprovalRecord,
  ApprovalStatus,
} from "@praedixa/shared-types/domain";

const ALLOWED_STATUS_TRANSITIONS: Record<ApprovalStatus, ApprovalStatus[]> = {
  requested: ["granted", "rejected", "expired", "canceled"],
  granted: [],
  rejected: [],
  expired: [],
  canceled: [],
};

export interface ApprovalTransitionInput {
  nextStatus: ApprovalStatus;
  actorId: string;
  actorRole: string;
  occurredAt: string;
  decision?: ApprovalDecision;
  justificationRequired?: boolean;
}

function includesAll(
  haystack: readonly string[] | undefined,
  needles: readonly string[] | undefined,
): boolean {
  if ((needles?.length ?? 0) === 0) {
    return true;
  }

  const haystackSet = new Set(haystack ?? []);
  return needles!.every((value) => haystackSet.has(value));
}

function isDecisionStatus(
  status: ApprovalStatus,
): status is "granted" | "rejected" {
  return status === "granted" || status === "rejected";
}

function getRequesterActorId(record: ApprovalRecord): string {
  return (
    record.separationOfDuties.requesterActorId ?? record.requestedBy.actorId
  );
}

function hasJustification(decision?: ApprovalDecision): boolean {
  return (decision?.comment?.trim().length ?? 0) > 0;
}

function assertApprovalTransition(
  current: ApprovalStatus,
  next: ApprovalStatus,
): void {
  if (canTransitionApproval(current, next)) {
    return;
  }

  throw new Error(`Invalid approval transition from ${current} to ${next}`);
}

function assertSeparationOfDuties(
  record: ApprovalRecord,
  actorId: string,
): void {
  if (
    record.separationOfDuties.required &&
    actorId === getRequesterActorId(record)
  ) {
    throw new Error("Approval workflow forbids self-approval");
  }
}

function assertDecisionPayload(
  nextStatus: ApprovalStatus,
  decision: ApprovalDecision | undefined,
  justificationRequired: boolean,
): void {
  if (!isDecisionStatus(nextStatus)) {
    return;
  }

  if (!decision) {
    throw new Error("Approval terminal decisions require a decision payload");
  }

  if (decision.outcome !== nextStatus && decision.outcome !== "overridden") {
    throw new Error(
      `Approval decision outcome ${decision.outcome} does not match ${nextStatus}`,
    );
  }

  if (justificationRequired && !hasJustification(decision)) {
    throw new Error("Approval decisions require justification comments");
  }
}

function buildApprovalEvent(
  record: ApprovalRecord,
  input: ApprovalTransitionInput,
): ApprovalRecord["history"][number] {
  return {
    fromStatus: record.status,
    toStatus: input.nextStatus,
    actorId: input.actorId,
    actorRole: input.actorRole,
    occurredAt: input.occurredAt,
    reasonCode: input.decision?.reasonCode,
    comment: input.decision?.comment,
  };
}

export function listAllowedApprovalTransitions(
  status: ApprovalStatus,
): readonly ApprovalStatus[] {
  return ALLOWED_STATUS_TRANSITIONS[status];
}

export function canTransitionApproval(
  current: ApprovalStatus,
  next: ApprovalStatus,
): boolean {
  return ALLOWED_STATUS_TRANSITIONS[current].includes(next);
}

export function resolveApprovalRule(
  matrix: readonly ApprovalMatrixRule[],
  policyContext: ApprovalRecord["policyContext"],
): ApprovalMatrixRule {
  const match = [...matrix]
    .filter((rule) => {
      if (
        rule.minEstimatedCostEur != null &&
        (policyContext.estimatedCostEur ?? 0) < rule.minEstimatedCostEur
      ) {
        return false;
      }

      if (
        rule.minRiskScore != null &&
        (policyContext.riskScore ?? 0) < rule.minRiskScore
      ) {
        return false;
      }

      if (!includesAll(policyContext.actionTypes, rule.requiredActionTypes)) {
        return false;
      }

      if (!includesAll(policyContext.destinationTypes, rule.destinationTypes)) {
        return false;
      }

      return true;
    })
    .sort(
      (left, right) =>
        left.stepOrder - right.stepOrder ||
        left.ruleId.localeCompare(right.ruleId),
    )[0];

  if (!match) {
    throw new Error("No approval rule matches the current policy context");
  }

  return match;
}

export function transitionApprovalRecord(
  record: ApprovalRecord,
  input: ApprovalTransitionInput,
): ApprovalRecord {
  assertApprovalTransition(record.status, input.nextStatus);
  assertSeparationOfDuties(record, input.actorId);
  assertDecisionPayload(
    input.nextStatus,
    input.decision,
    input.justificationRequired ?? false,
  );

  const requesterActorId = getRequesterActorId(record);
  const nextHistory = [...record.history, buildApprovalEvent(record, input)];

  return {
    ...record,
    status: input.nextStatus,
    decision: input.decision
      ? {
          ...input.decision,
        }
      : undefined,
    separationOfDuties: {
      ...record.separationOfDuties,
      requesterActorId,
      approverActorId: input.actorId,
      satisfied:
        !record.separationOfDuties.required ||
        requesterActorId !== input.actorId,
    },
    history: nextHistory,
  };
}
