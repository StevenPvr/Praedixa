import type {
  DecisionAllowedAction,
  DecisionApprovalRequirement,
  DecisionConstraint,
  DecisionContract,
  DecisionContractActor,
  DecisionContractAudit,
  DecisionContractInputRef,
  DecisionContractTemplate,
  DecisionContractTemplateEligibility,
  DecisionEntityType,
  DecisionExplanationTemplate,
  DecisionPack,
  DecisionRoiFormulaComponent,
  DecisionScope,
  DecisionSelectorMode,
  DecisionSoftConstraint,
  DecisionVariable,
  DecisionVariableDomain,
} from "@praedixa/shared-types/domain";
import { DECISION_CONTRACT_TEMPLATE_SCHEMA_VERSION } from "@praedixa/shared-types/domain";
import type {
  DecisionContractTemplateInstantiateRequest,
  DecisionContractTemplateInstantiateResponse,
  DecisionContractTemplateListRequest,
  DecisionContractTemplateListResponse,
  DecisionContractTemplateSummary,
} from "@praedixa/shared-types/api";

import { validateDecisionContract } from "./decision-contracts.js";

export type {
  DecisionContractTemplateInstantiateRequest,
  DecisionContractTemplateInstantiateResponse,
  DecisionContractTemplateListRequest,
  DecisionContractTemplateListResponse,
  DecisionContractTemplateSummary,
};

type DecisionContractTemplateRecord = DecisionContractTemplate;

function uniqueSortedStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

export interface DecisionContractTemplateSelectionRequest {
  pack: DecisionPack;
  templateId: string;
  templateVersion?: number;
  includeDeprecated?: boolean;
}

export interface DecisionContractTemplateMaterializationRequest extends DecisionContractTemplateInstantiateRequest {
  pack?: DecisionPack;
  includeDeprecated?: boolean;
}

function input(
  key: string,
  entity: string,
  attribute: string,
  required = true,
  aggregation?: DecisionContractInputRef["aggregation"],
): DecisionContractInputRef {
  return {
    key,
    entity,
    attribute,
    required,
    ...(aggregation !== undefined ? { aggregation } : {}),
  };
}

function variable(
  key: string,
  label: string,
  domain: DecisionVariableDomain,
): DecisionVariable {
  return { key, label, domain };
}

function hardConstraint(key: string, expression: string): DecisionConstraint {
  return { key, expression };
}

function softConstraint(
  key: string,
  expression: string,
  weight: number,
): DecisionSoftConstraint {
  return { key, expression, weight };
}

function approval(
  ruleId: string,
  approverRole: string,
  minStepOrder: number,
  thresholdKey?: string,
): DecisionApprovalRequirement {
  return {
    ruleId,
    approverRole,
    minStepOrder,
    ...(thresholdKey !== undefined ? { thresholdKey } : {}),
  };
}

function action(
  actionType: string,
  destinationType: string,
  templateId?: string,
): DecisionAllowedAction {
  return {
    actionType,
    destinationType,
    ...(templateId !== undefined ? { templateId } : {}),
  };
}

function component(
  key: string,
  label: string,
  kind: DecisionRoiFormulaComponent["kind"],
  expression: string,
): DecisionRoiFormulaComponent {
  return { key, label, kind, expression };
}

function explanation(
  summaryTemplate: string,
  topDriverKeys: readonly string[],
  bindingConstraintKeys: readonly string[],
): DecisionExplanationTemplate {
  return {
    summaryTemplate,
    topDriverKeys: [...topDriverKeys],
    bindingConstraintKeys: [...bindingConstraintKeys],
  };
}

function scope(
  entityType: DecisionEntityType,
  mode: DecisionSelectorMode,
  horizonId: string,
): DecisionScope {
  return { entityType, selector: { mode }, horizonId };
}

function eligibility(
  entityTypes: readonly DecisionEntityType[],
  selectorModes: readonly DecisionSelectorMode[],
  horizonIds: readonly string[],
  requiredSignals: readonly string[],
  requiredActions: readonly string[],
  requiredPolicyHooks: readonly string[],
  requiredCapabilities?: readonly string[],
): DecisionContractTemplateEligibility {
  return {
    entityTypes: [...entityTypes],
    selectorModes: [...selectorModes],
    horizonIds: [...horizonIds],
    requiredSignals: [...requiredSignals],
    requiredActions: [...requiredActions],
    requiredPolicyHooks: [...requiredPolicyHooks],
    ...(requiredCapabilities != null
      ? { requiredCapabilities: [...requiredCapabilities] }
      : {}),
  };
}

function template(
  definition: Omit<DecisionContractTemplateRecord, "kind" | "schemaVersion">,
): DecisionContractTemplateRecord {
  return {
    kind: "DecisionContractTemplate",
    schemaVersion: DECISION_CONTRACT_TEMPLATE_SCHEMA_VERSION,
    ...definition,
  };
}

const TEMPLATE_RECORDS = [
  template({
    templateId: "coverage.site.standard",
    templateVersion: 2,
    pack: "coverage",
    status: "active",
    name: "Coverage site standard",
    description:
      "Site-level coverage remediation with staffing and schedule actions.",
    graphRef: { graphId: "coverage-site", graphVersion: 2 },
    eligibility: eligibility(
      ["site"],
      ["all", "ids"],
      ["J+3", "J+7", "J+14"],
      [
        "coverage_gap_h",
        "absence_rate_pct",
        "forecasted_demand_h",
        "overtime_budget_eur",
      ],
      ["schedule.adjust", "staffing.request.create"],
      [
        "coverage.minimum_service",
        "coverage.labor_law",
        "coverage.site_budget",
      ],
      ["forecast_live", "action_dispatch", "roi_estimation"],
    ),
    sections: {
      scope: scope("site", "all", "J+7"),
      inputs: [
        input("coverage_gap_h", "Site", "coverage_gap_h"),
        input("absence_rate_pct", "Site", "absence_rate_pct"),
        input(
          "forecasted_demand_h",
          "Site",
          "forecasted_demand_h",
          true,
          "latest",
        ),
        input(
          "overtime_budget_eur",
          "Site",
          "overtime_budget_eur",
          true,
          "latest",
        ),
      ],
      objective: {
        metricKey: "service_level_pct",
        direction: "maximize",
        label: "Protect service level",
      },
      decisionVariables: [
        variable("overtime_hours", "Overtime hours", {
          kind: "number",
          min: 0,
          step: 0.5,
        }),
        variable("temp_staff_slots", "Temporary staff slots", {
          kind: "integer",
          min: 0,
        }),
      ],
      hardConstraints: [
        hardConstraint("labor_rest", "rest_hours >= 11"),
        hardConstraint(
          "minimum_skill_mix",
          "qualified_headcount >= minimum_skill_mix",
        ),
      ],
      softConstraints: [
        softConstraint(
          "budget_guardrail",
          "overtime_cost_eur <= overtime_budget_eur",
          0.6,
        ),
      ],
      approvals: [
        approval("ops_manager_review", "ops_manager", 1),
        approval(
          "finance_controller_review",
          "finance_controller",
          2,
          "overtime_budget_eur",
        ),
      ],
      actions: [
        action("schedule.adjust", "wfm.shift", "wfm.shift.schedule_adjust"),
        action(
          "staffing.request.create",
          "staffing.request",
          "staffing.request.standard",
        ),
      ],
      policyHooks: [
        "coverage.minimum_service",
        "coverage.labor_law",
        "coverage.site_budget",
      ],
      roiFormula: {
        currency: "EUR",
        estimatedExpression:
          "service_gain_eur - overtime_cost_eur - temp_staff_cost_eur",
        components: [
          component(
            "service_gain_eur",
            "Service gain",
            "benefit",
            "served_units_delta * margin_per_unit",
          ),
          component(
            "overtime_cost_eur",
            "Overtime cost",
            "cost",
            "overtime_hours * overtime_rate_eur",
          ),
          component(
            "temp_staff_cost_eur",
            "Temp staffing cost",
            "cost",
            "temp_staff_slots * temp_slot_cost_eur",
          ),
        ],
      },
      explanationTemplate: explanation(
        "{{top_driver}} constrained by {{binding_constraint}}",
        ["coverage_gap_h", "absence_rate_pct"],
        ["labor_rest", "minimum_skill_mix"],
      ),
    },
    tags: ["coverage", "site", "standard"],
  }),
  template({
    templateId: "coverage.site.standard",
    templateVersion: 1,
    pack: "coverage",
    status: "deprecated",
    name: "Coverage site standard v1",
    description: "Deprecated first coverage template kept for lineage review.",
    graphRef: { graphId: "coverage-site", graphVersion: 1 },
    eligibility: eligibility(
      ["site"],
      ["all", "ids"],
      ["J+7"],
      ["coverage_gap_h", "overtime_budget_eur"],
      ["schedule.adjust"],
      ["coverage.minimum_service"],
    ),
    sections: {
      scope: scope("site", "all", "J+7"),
      inputs: [
        input("coverage_gap_h", "Site", "coverage_gap_h"),
        input("overtime_budget_eur", "Site", "overtime_budget_eur"),
      ],
      objective: { metricKey: "service_level_pct", direction: "maximize" },
      decisionVariables: [
        variable("overtime_hours", "Overtime hours", {
          kind: "number",
          min: 0,
          step: 1,
        }),
      ],
      hardConstraints: [hardConstraint("labor_rest", "rest_hours >= 11")],
      softConstraints: [],
      approvals: [approval("ops_manager_review", "ops_manager", 1)],
      actions: [
        action("schedule.adjust", "wfm.shift", "wfm.shift.schedule_adjust"),
      ],
      policyHooks: ["coverage.minimum_service"],
      roiFormula: {
        currency: "EUR",
        estimatedExpression: "service_gain_eur - overtime_cost_eur",
        components: [
          component(
            "service_gain_eur",
            "Service gain",
            "benefit",
            "served_units_delta * margin_per_unit",
          ),
          component(
            "overtime_cost_eur",
            "Overtime cost",
            "cost",
            "overtime_hours * overtime_rate_eur",
          ),
        ],
      },
      explanationTemplate: explanation(
        "{{top_driver}}",
        ["coverage_gap_h"],
        ["labor_rest"],
      ),
    },
    tags: ["coverage", "legacy"],
  }),
  template({
    templateId: "flow.team.bottleneck",
    templateVersion: 2,
    pack: "flow",
    status: "active",
    name: "Flow team bottleneck",
    description:
      "Team-level flow template for backlog, throughput and SLA pressure.",
    graphRef: { graphId: "flow-team", graphVersion: 2 },
    eligibility: eligibility(
      ["team", "flow"],
      ["all", "ids", "query"],
      ["J+1", "J+3", "J+7"],
      ["backlog_h", "cycle_time_h", "sla_breach_risk_pct"],
      ["workqueue.rebalance", "training.assign"],
      ["flow.capacity_floor", "flow.wip_limit"],
      ["queue_health", "task_dispatch"],
    ),
    sections: {
      scope: scope("team", "all", "J+3"),
      inputs: [
        input("backlog_h", "Team", "backlog_h"),
        input("cycle_time_h", "Team", "cycle_time_h"),
        input("sla_breach_risk_pct", "Team", "sla_breach_risk_pct"),
      ],
      objective: {
        metricKey: "throughput_u",
        direction: "maximize",
        label: "Improve throughput",
      },
      decisionVariables: [
        variable("cross_train_slots", "Cross-train slots", {
          kind: "integer",
          min: 0,
        }),
        variable("priority_reassignment_pct", "Priority reassignment pct", {
          kind: "number",
          min: 0,
          max: 100,
          step: 5,
        }),
      ],
      hardConstraints: [
        hardConstraint(
          "skill_coverage",
          "qualified_headcount >= minimum_skill_coverage",
        ),
      ],
      softConstraints: [
        softConstraint(
          "reassignment_cap",
          "priority_reassignment_pct <= max_reassignment_pct",
          0.4,
        ),
      ],
      approvals: [approval("flow_manager_review", "flow_manager", 1)],
      actions: [
        action(
          "workqueue.rebalance",
          "workqueue.rule",
          "workqueue.rule.rebalance",
        ),
        action(
          "training.assign",
          "lms.assignment",
          "lms.assignment.cross_train",
        ),
      ],
      policyHooks: ["flow.capacity_floor", "flow.wip_limit"],
      roiFormula: {
        currency: "EUR",
        estimatedExpression: "throughput_gain_eur - retraining_cost_eur",
        components: [
          component(
            "throughput_gain_eur",
            "Throughput gain",
            "benefit",
            "throughput_delta * margin_per_unit",
          ),
          component(
            "retraining_cost_eur",
            "Retraining cost",
            "cost",
            "cross_train_slots * cross_train_cost_eur",
          ),
        ],
      },
      explanationTemplate: explanation(
        "{{top_driver}} constrained by {{binding_constraint}}",
        ["backlog_h", "sla_breach_risk_pct"],
        ["skill_coverage"],
      ),
    },
    tags: ["flow", "team", "bottleneck"],
  }),
  template({
    templateId: "allocation.route.rebalance",
    templateVersion: 1,
    pack: "allocation",
    status: "active",
    name: "Allocation route rebalance",
    description:
      "Route-level allocation template for load balancing and reserve usage.",
    graphRef: { graphId: "allocation-route", graphVersion: 1 },
    eligibility: eligibility(
      ["route"],
      ["all", "ids"],
      ["J+1", "J+2"],
      ["route_load_pct", "priority_stop_count", "reserve_capacity_u"],
      ["route.replan", "reserve.release"],
      ["allocation.capacity_guardrail", "allocation.cost_cap"],
      ["route_optimization", "dispatch_ack"],
    ),
    sections: {
      scope: scope("route", "all", "J+1"),
      inputs: [
        input("route_load_pct", "Route", "route_load_pct"),
        input("priority_stop_count", "Route", "priority_stop_count"),
        input("reserve_capacity_u", "Route", "reserve_capacity_u"),
      ],
      objective: {
        metricKey: "on_time_pct",
        direction: "maximize",
        label: "Protect on-time performance",
      },
      decisionVariables: [
        variable("reserve_capacity_release_u", "Reserve capacity release", {
          kind: "integer",
          min: 0,
        }),
        variable("flex_driver_hours", "Flex driver hours", {
          kind: "number",
          min: 0,
          step: 0.5,
        }),
      ],
      hardConstraints: [
        hardConstraint(
          "fleet_availability",
          "active_vehicle_count <= fleet_capacity",
        ),
      ],
      softConstraints: [
        softConstraint(
          "cost_cap",
          "allocation_cost_eur <= allocation_budget_eur",
          0.5,
        ),
      ],
      approvals: [
        approval("allocation_manager_review", "allocation_manager", 1),
      ],
      actions: [
        action("route.replan", "tms.route", "tms.route.replan"),
        action(
          "reserve.release",
          "inventory.reserve",
          "inventory.reserve.release",
        ),
      ],
      policyHooks: ["allocation.capacity_guardrail", "allocation.cost_cap"],
      roiFormula: {
        currency: "EUR",
        estimatedExpression:
          "delay_avoidance_eur - reserve_release_cost_eur - flex_driver_cost_eur",
        components: [
          component(
            "delay_avoidance_eur",
            "Delay avoidance",
            "benefit",
            "delay_minutes_avoided * delay_cost_per_minute_eur",
          ),
          component(
            "reserve_release_cost_eur",
            "Reserve release cost",
            "cost",
            "reserve_capacity_release_u * reserve_unit_cost_eur",
          ),
        ],
      },
      explanationTemplate: explanation(
        "{{top_driver}} constrained by {{binding_constraint}}",
        ["route_load_pct", "priority_stop_count"],
        ["fleet_availability"],
      ),
    },
    tags: ["allocation", "route", "rebalance"],
  }),
  template({
    templateId: "core.organization.guardrails",
    templateVersion: 1,
    pack: "core",
    status: "active",
    name: "Core organization guardrails",
    description:
      "Organization-level governance template for approval and dispatch safety.",
    graphRef: { graphId: "core-organization", graphVersion: 1 },
    eligibility: eligibility(
      ["organization"],
      ["all"],
      ["M+1", "Q+1"],
      ["approval_latency_h", "policy_exception_count", "unattended_action_pct"],
      ["policy.publish", "approval.workflow.update"],
      ["core.separation_of_duties", "core.audit_window"],
      ["approval_matrix", "audit_append_only"],
    ),
    sections: {
      scope: scope("organization", "all", "M+1"),
      inputs: [
        input("approval_latency_h", "Organization", "approval_latency_h"),
        input(
          "policy_exception_count",
          "Organization",
          "policy_exception_count",
        ),
        input("unattended_action_pct", "Organization", "unattended_action_pct"),
      ],
      objective: {
        metricKey: "governance_risk_score",
        direction: "minimize",
        label: "Reduce governance risk",
      },
      decisionVariables: [
        variable("auto_dispatch_enabled", "Auto dispatch enabled", {
          kind: "boolean",
        }),
        variable("approval_quorum", "Approval quorum", {
          kind: "integer",
          min: 1,
          max: 5,
        }),
      ],
      hardConstraints: [
        hardConstraint(
          "separation_of_duties",
          "requester_role != approver_role",
        ),
        hardConstraint("audit_window", "audit_retention_days >= 365"),
      ],
      softConstraints: [
        softConstraint(
          "latency_target",
          "approval_latency_h <= target_approval_latency_h",
          0.4,
        ),
      ],
      approvals: [
        approval("security_review", "security_admin", 1),
        approval("platform_review", "platform_admin", 2),
      ],
      actions: [
        action(
          "policy.publish",
          "governance.policy",
          "governance.policy.publish",
        ),
        action(
          "approval.workflow.update",
          "approval.workflow",
          "approval.workflow.standard",
        ),
      ],
      policyHooks: ["core.separation_of_duties", "core.audit_window"],
      roiFormula: {
        currency: "EUR",
        estimatedExpression:
          "risk_avoidance_eur - manual_review_cost_eur - tooling_cost_eur",
        components: [
          component(
            "risk_avoidance_eur",
            "Risk avoidance",
            "benefit",
            "incident_probability_delta * incident_cost_eur",
          ),
          component(
            "manual_review_cost_eur",
            "Manual review cost",
            "cost",
            "approval_latency_h * reviewer_hourly_cost_eur",
          ),
        ],
      },
      explanationTemplate: explanation(
        "{{top_driver}} constrained by {{binding_constraint}}",
        ["policy_exception_count", "unattended_action_pct"],
        ["separation_of_duties", "audit_window"],
      ),
    },
    tags: ["core", "governance", "guardrails"],
  }),
] as const satisfies readonly DecisionContractTemplateRecord[];

function cloneValue<T>(value: T): T {
  return structuredClone(value);
}

function cloneMutableArray<T>(items: readonly T[]): T[] {
  return items.map((item) => cloneValue(item));
}

function assertActor(actor: DecisionContractActor): void {
  if (!actor.userId.trim()) {
    throw new Error("actor.userId cannot be empty");
  }
  if (!actor.decidedAt.trim()) {
    throw new Error("actor.decidedAt cannot be empty");
  }
  if (!actor.reason.trim()) {
    throw new Error("actor.reason cannot be empty");
  }
}

function buildSummary(
  template: DecisionContractTemplateRecord,
): DecisionContractTemplateSummary {
  return {
    templateId: template.templateId,
    templateVersion: template.templateVersion,
    pack: template.pack,
    name: template.name,
    ...(template.description !== undefined
      ? { description: template.description }
      : {}),
    status: template.status,
    graphId: template.graphRef.graphId,
    graphVersion: template.graphRef.graphVersion,
    horizonIds: [...template.eligibility.horizonIds],
    actionTypes: uniqueSortedStrings(
      template.sections.actions.map((item) => item.actionType),
    ),
    destinationTypes: uniqueSortedStrings(
      template.sections.actions.map((item) => item.destinationType),
    ),
    approvalRoles: uniqueSortedStrings(
      template.sections.approvals.map((item) => item.approverRole),
    ),
    ...(template.tags != null ? { tags: [...template.tags].sort() } : {}),
  };
}

function compareSummaries(
  left: DecisionContractTemplateSummary,
  right: DecisionContractTemplateSummary,
): number {
  return (
    left.pack.localeCompare(right.pack) ||
    left.name.localeCompare(right.name) ||
    left.templateId.localeCompare(right.templateId) ||
    right.templateVersion - left.templateVersion
  );
}

function matchesSearch(
  summary: DecisionContractTemplateSummary,
  request: DecisionContractTemplateListRequest,
): boolean {
  const search = request.search?.trim().toLowerCase();
  if (!search) {
    return true;
  }

  const haystack = [
    summary.templateId,
    summary.name,
    summary.description,
    summary.pack,
    ...(summary.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(search);
}

function matchesTags(
  summary: DecisionContractTemplateSummary,
  request: DecisionContractTemplateListRequest,
): boolean {
  if ((request.tags?.length ?? 0) === 0) {
    return true;
  }
  const tags = new Set(summary.tags ?? []);
  return request.tags!.every((tag) => tags.has(tag));
}

function buildDraftAudit(actor: DecisionContractActor): DecisionContractAudit {
  return {
    createdBy: actor.userId,
    createdAt: actor.decidedAt,
    updatedBy: actor.userId,
    updatedAt: actor.decidedAt,
    changeReason: actor.reason,
    notes: actor.notes ?? null,
    previousVersion: null,
    rollbackFromVersion: null,
    approvedBy: null,
    approvedAt: null,
    publishedBy: null,
    publishedAt: null,
    archivedBy: null,
    archivedAt: null,
  };
}

function mergeScope(
  base: DecisionScope,
  overrides?: Partial<DecisionScope>,
): DecisionScope {
  if (overrides == null) {
    return cloneValue(base);
  }

  return {
    entityType: overrides.entityType ?? base.entityType,
    selector:
      overrides.selector == null
        ? cloneValue(base.selector)
        : {
            ...overrides.selector,
            ...(overrides.selector.ids != null
              ? { ids: [...overrides.selector.ids] }
              : {}),
          },
    horizonId: overrides.horizonId ?? base.horizonId,
    ...(base.dimensions == null && overrides.dimensions == null
      ? {}
      : {
          dimensions: {
            ...(base.dimensions ?? {}),
            ...(overrides.dimensions ?? {}),
          },
        }),
  };
}

function findTemplatesById(
  templateId: string,
): readonly DecisionContractTemplateRecord[] {
  return TEMPLATE_RECORDS.filter(
    (template) => template.templateId === templateId,
  );
}

function findTemplate(input: {
  templateId: string;
  templateVersion?: number;
  pack?: DecisionPack;
  includeDeprecated?: boolean;
}): DecisionContractTemplateRecord {
  const byId = findTemplatesById(input.templateId);
  if (byId.length === 0) {
    throw new Error(`Unknown DecisionContract template ${input.templateId}.`);
  }

  const byPack =
    input.pack == null
      ? byId
      : byId.filter((template) => template.pack === input.pack);
  if (byPack.length === 0) {
    throw new Error(
      `DecisionContract template ${input.templateId} is not available for pack ${input.pack}.`,
    );
  }

  const byVersion =
    input.templateVersion == null
      ? byPack
      : byPack.filter(
          (template) => template.templateVersion === input.templateVersion,
        );
  if (byVersion.length === 0) {
    throw new Error(
      `Unknown DecisionContract template ${input.templateId}@${input.templateVersion}.`,
    );
  }

  const visible = input.includeDeprecated
    ? byVersion
    : byVersion.filter((template) => template.status === "active");
  if (visible.length === 0) {
    throw new Error(
      `DecisionContract template ${input.templateId} has no active version for the requested selection.`,
    );
  }

  return [...visible].sort(
    (left, right) => right.templateVersion - left.templateVersion,
  )[0]!;
}

export function listDecisionContractTemplates(
  request: DecisionContractTemplateListRequest = {},
): DecisionContractTemplateListResponse {
  const items = TEMPLATE_RECORDS.map(buildSummary)
    .filter(
      (summary) => request.includeDeprecated || summary.status === "active",
    )
    .filter((summary) => request.pack == null || summary.pack === request.pack)
    .filter((summary) => matchesTags(summary, request))
    .filter((summary) => matchesSearch(summary, request))
    .sort(compareSummaries);

  return { total: items.length, items };
}

export function selectDecisionContractTemplate(
  request: DecisionContractTemplateSelectionRequest,
): DecisionContractTemplateRecord {
  return cloneValue(
    findTemplate({
      templateId: request.templateId,
      ...(request.templateVersion !== undefined
        ? { templateVersion: request.templateVersion }
        : {}),
      ...(request.pack !== undefined ? { pack: request.pack } : {}),
      ...(request.includeDeprecated !== undefined
        ? { includeDeprecated: request.includeDeprecated }
        : {}),
    }),
  );
}

export function materializeDecisionContractTemplate(
  request: DecisionContractTemplateMaterializationRequest,
): DecisionContract {
  assertActor(request.actor);
  const template = findTemplate({
    templateId: request.templateId,
    ...(request.templateVersion !== undefined
      ? { templateVersion: request.templateVersion }
      : {}),
    ...(request.pack !== undefined ? { pack: request.pack } : {}),
    ...(request.includeDeprecated !== undefined
      ? { includeDeprecated: request.includeDeprecated }
      : {}),
  });

  const contract: DecisionContract = {
    kind: "DecisionContract",
    schemaVersion: "1.0.0",
    contractId: request.contractId,
    contractVersion: 1,
    name: request.name,
    ...((request.description ?? template.description) !== undefined
      ? { description: request.description ?? template.description }
      : {}),
    pack: template.pack,
    status: "draft",
    templateRef: {
      templateId: template.templateId,
      templateVersion: template.templateVersion,
    },
    graphRef: cloneValue(template.graphRef),
    scope: mergeScope(template.sections.scope, request.scopeOverrides),
    inputs: cloneMutableArray(template.sections.inputs),
    objective: cloneValue(template.sections.objective),
    decisionVariables: cloneMutableArray(template.sections.decisionVariables),
    hardConstraints: cloneMutableArray(template.sections.hardConstraints),
    softConstraints: cloneMutableArray(template.sections.softConstraints),
    approvals: cloneMutableArray(template.sections.approvals),
    actions: cloneMutableArray(template.sections.actions),
    policyHooks: [...template.sections.policyHooks],
    roiFormula: cloneValue(template.sections.roiFormula),
    explanationTemplate: cloneValue(template.sections.explanationTemplate),
    validation: { status: "pending", checkedAt: null, issues: [] },
    ...(request.tags == null
      ? template.tags == null
        ? {}
        : { tags: [...template.tags] }
      : { tags: [...request.tags] }),
    audit: buildDraftAudit(request.actor),
  };

  validateDecisionContract(contract);
  return contract;
}

export function instantiateDecisionContractTemplate(
  request: DecisionContractTemplateMaterializationRequest,
): DecisionContractTemplateInstantiateResponse {
  const contract = materializeDecisionContractTemplate(request);
  const template = findTemplate({
    templateId: request.templateId,
    ...(request.templateVersion !== undefined
      ? { templateVersion: request.templateVersion }
      : {}),
    ...(request.pack !== undefined ? { pack: request.pack } : {}),
    ...(request.includeDeprecated !== undefined
      ? { includeDeprecated: request.includeDeprecated }
      : {}),
  });

  return { template: buildSummary(template), contract };
}
