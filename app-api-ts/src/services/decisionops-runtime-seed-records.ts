import { randomUUID } from "node:crypto";

import type {
  ActionDispatchRecord,
  ApprovalRecord,
  LedgerEntry,
  ScenarioOptionType,
} from "@praedixa/shared-types/domain";

import { resolveActionTemplate } from "./action-templates.js";
import { computeLedgerRoi } from "./decision-ledger.js";
import { toIsoDateOnly, toIsoDateTime } from "./persistence.js";

const COVERAGE_RUNTIME_CONTRACT = {
  contractId: "coverage-core",
  contractVersion: 2,
} as const;

export interface DecisionOpsRuntimeSeedInput {
  organizationId: string;
  recommendationId: string;
  siteId: string;
  decisionDate: Date | string;
  requestedAt: Date | string;
  horizon: string;
  gapHours: number;
  predictedImpactEur?: number | null;
  chosenOptionId: string;
  chosenOptionLabel: string;
  chosenOptionType: ScenarioOptionType;
  chosenCostEur: number;
  chosenServicePct?: number | null;
  requestedByActorId: string;
  requestedByActorRole?: string | null;
  notes?: string | null;
}

function toFiniteNumber(
  value: number | null | undefined,
  fallback = 0,
): number {
  return Number.isFinite(value) ? Number(value) : fallback;
}

function toIsoDateTimeRequired(value: Date | string): string {
  const normalized = toIsoDateTime(value);
  if (!normalized) {
    throw new Error("Invalid runtime seed datetime.");
  }
  return normalized;
}

function addHours(isoDateTime: string, hours?: number): string | undefined {
  if (!hours) {
    return undefined;
  }

  const base = new Date(isoDateTime);
  return new Date(base.getTime() + hours * 60 * 60 * 1000).toISOString();
}

function buildScope(
  siteId: string,
  horizon: string,
): ApprovalRecord["scope"] & LedgerEntry["scope"] {
  return {
    entityType: "site",
    selector: {
      mode: "ids",
      ids: [siteId],
    },
    horizonId: horizon,
  };
}

type RuntimeTemplateBinding = Readonly<{
  actionType: string;
  destinationType: string;
}>;

const SCHEDULE_ADJUST_BINDING: RuntimeTemplateBinding = {
  actionType: "schedule.adjust",
  destinationType: "wfm.shift",
};

const SCENARIO_OPTION_TEMPLATE_BINDINGS: Readonly<
  Partial<Record<ScenarioOptionType, RuntimeTemplateBinding>>
> = {
  hs: SCHEDULE_ADJUST_BINDING,
  service_adjust: SCHEDULE_ADJUST_BINDING,
  realloc_intra: SCHEDULE_ADJUST_BINDING,
  realloc_inter: SCHEDULE_ADJUST_BINDING,
};

function resolveTemplateBinding(
  optionType: ScenarioOptionType,
): RuntimeTemplateBinding {
  const binding = SCENARIO_OPTION_TEMPLATE_BINDINGS[optionType];
  if (binding) {
    return binding;
  }

  throw new Error(
    `Scenario option type ${optionType} has no action-template binding configured.`,
  );
}

function buildIdempotencyKey(
  recommendationId: string,
  destinationType: string,
): string {
  return `${COVERAGE_RUNTIME_CONTRACT.contractId}:${recommendationId}:${destinationType}`;
}

function buildApprovalDeadlineHours(stepOrder: number): number {
  return stepOrder <= 1 ? 4 : 12;
}

function buildDeltaHeadcount(gapHours: number): number {
  return Math.max(1, Math.ceil(gapHours / 7));
}

function buildApprovalPolicyContext(
  input: DecisionOpsRuntimeSeedInput,
  actionType: string,
  destinationType: string,
) {
  return {
    estimatedCostEur: input.chosenCostEur,
    riskScore: input.gapHours >= 8 ? 0.92 : input.gapHours >= 4 ? 0.76 : 0.52,
    actionTypes: [actionType],
    destinationTypes: [destinationType],
  };
}

function buildApprovalRecord(
  rule: ReturnType<typeof resolveActionTemplate>["requiredApprovals"][number],
  input: DecisionOpsRuntimeSeedInput,
  scope: ApprovalRecord["scope"],
  requestedAt: string,
  actionType: string,
  destinationType: string,
): ApprovalRecord {
  const deadlineHours = buildApprovalDeadlineHours(rule.minStepOrder);
  return {
    kind: "Approval",
    schemaVersion: "1.0.0",
    approvalId: randomUUID(),
    contractId: COVERAGE_RUNTIME_CONTRACT.contractId,
    contractVersion: COVERAGE_RUNTIME_CONTRACT.contractVersion,
    recommendationId: input.recommendationId,
    status: "requested",
    scope,
    requestedAt,
    deadlineAt: addHours(requestedAt, deadlineHours),
    requestedBy: {
      actorType: "user",
      actorId: input.requestedByActorId,
      actorRole: input.requestedByActorRole ?? undefined,
    },
    rule: {
      ruleId: rule.ruleId,
      stepOrder: rule.minStepOrder,
      approverRole: rule.approverRole,
      deadlineHours,
    },
    policyContext: buildApprovalPolicyContext(
      input,
      actionType,
      destinationType,
    ),
    separationOfDuties: {
      required: true,
      satisfied: false,
      requesterActorId: input.requestedByActorId,
    },
    notes: input.notes ?? undefined,
    history: [],
  };
}

function buildDestinationCapabilities(
  template: ReturnType<typeof resolveActionTemplate>,
) {
  return {
    supportsDryRun: template.dryRun.supported,
    supportsSandbox: template.dryRun.requiresSandbox ?? false,
    supportsAcknowledgement: true,
    supportsCancellation: true,
    supportsRetry: true,
    supportsIdempotencyKeys: true,
    supportsHumanFallback: template.fallback.supported,
    requiresHumanFallbackOnFailure: template.fallback.humanRequired ?? false,
  };
}

function buildPayloadPreview(input: DecisionOpsRuntimeSeedInput) {
  return {
    site_code: input.siteId,
    effective_date: toIsoDateOnly(input.decisionDate),
    delta_headcount: buildDeltaHeadcount(input.gapHours),
    reason_code: "coverage_gap",
    scenario_option_id: input.chosenOptionId,
  };
}

function buildEstimatedRoi(input: DecisionOpsRuntimeSeedInput) {
  const estimatedAvoidedCost = Math.max(
    0,
    toFiniteNumber(input.predictedImpactEur, 0),
  );
  return computeLedgerRoi(
    [
      {
        key: "bau_cost_avoidance_eur",
        label: "BAU cost avoidance",
        kind: "benefit",
        value: estimatedAvoidedCost,
        validationStatus: "estimated",
      },
      {
        key: "dispatch_cost_eur",
        label: "Dispatch cost",
        kind: "cost",
        value: input.chosenCostEur,
        validationStatus: "estimated",
      },
    ],
    "estimated",
    "EUR",
  );
}

function buildLedgerBaseline(
  input: DecisionOpsRuntimeSeedInput,
  openedAt: string,
) {
  return {
    recordedAt: openedAt,
    values: {
      gap_h: input.gapHours,
      predicted_impact_eur: toFiniteNumber(input.predictedImpactEur, 0),
    },
  };
}

function buildLedgerRecommended(
  input: DecisionOpsRuntimeSeedInput,
  openedAt: string,
) {
  return {
    recordedAt: openedAt,
    actionSummary: input.chosenOptionLabel,
    values: {
      chosen_cost_eur: input.chosenCostEur,
      expected_service_pct: toFiniteNumber(input.chosenServicePct, 0),
    },
  };
}

export function buildApprovalRecords(
  input: DecisionOpsRuntimeSeedInput,
): ApprovalRecord[] {
  const requestedAt = toIsoDateTimeRequired(input.requestedAt);
  const { actionType, destinationType } = resolveTemplateBinding(
    input.chosenOptionType,
  );
  const template = resolveActionTemplate({
    actionType,
    destinationType,
  });
  const scope = buildScope(input.siteId, input.horizon);

  return template.requiredApprovals
    .slice()
    .sort((left, right) => left.minStepOrder - right.minStepOrder)
    .map((rule) =>
      buildApprovalRecord(
        rule,
        input,
        scope,
        requestedAt,
        actionType,
        destinationType,
      ),
    );
}

export function buildActionDispatchRecord(
  input: DecisionOpsRuntimeSeedInput,
  primaryApprovalId: string | undefined,
): ActionDispatchRecord {
  const createdAt = toIsoDateTimeRequired(input.requestedAt);
  const { actionType, destinationType } = resolveTemplateBinding(
    input.chosenOptionType,
  );
  const template = resolveActionTemplate({
    actionType,
    destinationType,
  });

  return {
    kind: "ActionDispatch",
    schemaVersion: "1.0.0",
    actionId: randomUUID(),
    contractId: COVERAGE_RUNTIME_CONTRACT.contractId,
    contractVersion: COVERAGE_RUNTIME_CONTRACT.contractVersion,
    recommendationId: input.recommendationId,
    approvalId: primaryApprovalId,
    status: "pending",
    dispatchMode: "live",
    template: {
      templateId: template.templateId,
      templateVersion: template.templateVersion,
      actionType: template.actionType,
      destinationType: template.destinationType,
    },
    destination: {
      system: template.destinationSystem,
      targetResourceType: template.destinationType,
      targetResourceId: input.siteId,
      sandbox: false,
      capabilities: buildDestinationCapabilities(template),
    },
    permissionsContext: {
      allowedByContract: true,
      permissionKeys: ["shift.write"],
    },
    retryPolicy: template.retryPolicy,
    idempotencyKey: buildIdempotencyKey(
      input.recommendationId,
      template.destinationType,
    ),
    payloadPreview: buildPayloadPreview(input),
    attempts: [],
    createdAt,
    updatedAt: createdAt,
  };
}

export function buildLedgerEntry(
  input: DecisionOpsRuntimeSeedInput,
  action: ActionDispatchRecord,
): LedgerEntry {
  const openedAt = toIsoDateTimeRequired(input.requestedAt);

  return {
    kind: "LedgerEntry",
    schemaVersion: "1.0.0",
    ledgerId: randomUUID(),
    contractId: COVERAGE_RUNTIME_CONTRACT.contractId,
    contractVersion: COVERAGE_RUNTIME_CONTRACT.contractVersion,
    recommendationId: input.recommendationId,
    status: "open",
    revision: 1,
    scope: buildScope(input.siteId, input.horizon),
    baseline: buildLedgerBaseline(input, openedAt),
    recommended: buildLedgerRecommended(input, openedAt),
    approvals: [],
    action: {
      actionId: action.actionId,
      status: action.status,
      destination: action.destination.targetResourceType,
    },
    counterfactual: {
      method: "forecast_baseline_v2",
      description:
        "Forecast baseline using the persisted coverage alert impact and selected option cost.",
      inputs: ["predicted_impact_eur", "chosen_cost_eur"],
    },
    roi: buildEstimatedRoi(input),
    explanation: {
      topDrivers: ["gap_h", "predicted_impact_eur"],
      bindingConstraints: ["approval_required", "dispatch_pending"],
      notes: input.notes ?? undefined,
    },
    openedAt,
  };
}
