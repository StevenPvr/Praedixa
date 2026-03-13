import type {
  DecisionContract,
  DecisionGraph,
  DecisionPack,
} from "@praedixa/shared-types/domain";
import type {
  DecisionCompatibilityEventAssumptions,
  DecisionCompatibilityInputGap,
  DecisionCompatibilityIssue,
  DecisionCompatibilityMetricGap,
  DecisionCompatibilityRequest,
  DecisionCompatibilityResponse,
  DecisionCompatibilityVersionAssumptions,
} from "@praedixa/shared-types/api";

import { assertDecisionContractIntegrity } from "./decision-contracts.js";
import { assertDecisionGraphIntegrity } from "./decision-graph.js";

export type {
  DecisionCompatibilityEventAssumptions,
  DecisionCompatibilityInputGap,
  DecisionCompatibilityIssue,
  DecisionCompatibilityMetricGap,
  DecisionCompatibilityRequest,
  DecisionCompatibilityResponse,
  DecisionCompatibilityVersionAssumptions,
};

interface GraphLookup {
  entityFields: Map<string, Set<string>>;
  metricKeys: Set<string>;
  sourceSystems: Set<string>;
  horizonIds: Set<string>;
  supportedPacks: Set<DecisionPack>;
}

function buildGraphLookup(graph: DecisionGraph): GraphLookup {
  const entityFields = new Map<string, Set<string>>();
  const metricKeys = new Set<string>();
  const sourceSystems = new Set<string>();
  const horizonIds = new Set<string>();
  const supportedPacks = new Set<DecisionPack>(graph.supportedPacks);

  for (const entity of graph.entities) {
    entityFields.set(
      entity.name,
      new Set([
        ...entity.identifiers,
        ...entity.attributes.map((attribute) => attribute.key),
      ]),
    );
    for (const binding of entity.sourceBindings ?? []) {
      sourceSystems.add(binding.sourceSystem);
    }
  }

  for (const metric of graph.metrics) {
    metricKeys.add(metric.key);
  }

  for (const strategy of graph.entityResolution.strategies) {
    sourceSystems.add(strategy.sourceSystem);
  }

  for (const horizon of graph.horizons) {
    horizonIds.add(horizon.horizonId);
  }

  return {
    entityFields,
    metricKeys,
    sourceSystems,
    horizonIds,
    supportedPacks,
  };
}

function buildIssue(
  issue: DecisionCompatibilityIssue,
): DecisionCompatibilityIssue {
  return issue;
}

function compareIssues(
  left: DecisionCompatibilityIssue,
  right: DecisionCompatibilityIssue,
): number {
  const severityOrder = left.severity.localeCompare(right.severity);
  if (severityOrder !== 0) {
    return severityOrder;
  }
  const codeOrder = left.code.localeCompare(right.code);
  if (codeOrder !== 0) {
    return codeOrder;
  }
  return (left.reference ?? "").localeCompare(right.reference ?? "");
}

function hasKnownMetricReference(
  reference: string,
  lookup: GraphLookup,
  contract: DecisionContract,
): boolean {
  if (lookup.metricKeys.has(reference)) {
    return true;
  }
  if (contract.inputs.some((input) => input.key === reference)) {
    return true;
  }
  return contract.decisionVariables.some(
    (variable) => variable.key === reference,
  );
}

export function collectMissingDecisionContractInputs(
  contract: DecisionContract,
  graph: DecisionGraph,
): DecisionCompatibilityInputGap[] {
  const lookup = buildGraphLookup(graph);
  const gaps: DecisionCompatibilityInputGap[] = [];

  for (const input of contract.inputs) {
    const fields = lookup.entityFields.get(input.entity);
    if (!fields) {
      gaps.push({
        inputKey: input.key,
        entity: input.entity,
        attribute: input.attribute,
        reason: "missing_entity",
      });
      continue;
    }
    if (!fields.has(input.attribute)) {
      gaps.push({
        inputKey: input.key,
        entity: input.entity,
        attribute: input.attribute,
        reason: "missing_attribute",
      });
    }
  }

  return gaps;
}

export function collectMissingDecisionContractMetrics(
  contract: DecisionContract,
  graph: DecisionGraph,
): DecisionCompatibilityMetricGap[] {
  const lookup = buildGraphLookup(graph);
  const gaps: DecisionCompatibilityMetricGap[] = [];

  if (!lookup.metricKeys.has(contract.objective.metricKey)) {
    gaps.push({
      metricKey: contract.objective.metricKey,
      source: "objective",
    });
  }

  for (const approval of contract.approvals) {
    if (
      approval.thresholdKey &&
      !hasKnownMetricReference(approval.thresholdKey, lookup, contract)
    ) {
      gaps.push({
        metricKey: approval.thresholdKey,
        source: "approval_threshold",
      });
    }
  }

  for (const topDriverKey of contract.explanationTemplate.topDriverKeys) {
    if (!hasKnownMetricReference(topDriverKey, lookup, contract)) {
      gaps.push({
        metricKey: topDriverKey,
        source: "explanation_driver",
      });
    }
  }

  return gaps.filter(
    (gap, index, allGaps) =>
      allGaps.findIndex(
        (candidate) =>
          candidate.metricKey === gap.metricKey &&
          candidate.source === gap.source,
      ) === index,
  );
}

export function collectUnsupportedDecisionContractPacks(
  contract: DecisionContract,
  graph: DecisionGraph,
): DecisionPack[] {
  const supportedPacks = new Set(graph.supportedPacks);
  return supportedPacks.has(contract.pack) ? [] : [contract.pack];
}

export function hasDecisionContractHorizonMismatch(
  contract: DecisionContract,
  graph: DecisionGraph,
): boolean {
  return !graph.horizons.some(
    (horizon) => horizon.horizonId === contract.scope.horizonId,
  );
}

export function collectDecisionApprovalWarnings(
  contract: DecisionContract,
  graph: DecisionGraph,
): DecisionCompatibilityIssue[] {
  const lookup = buildGraphLookup(graph);
  const warnings: DecisionCompatibilityIssue[] = [];
  const stepOrders = contract.approvals.map(
    (approval) => approval.minStepOrder,
  );
  const sortedStepOrders = [...stepOrders].sort((left, right) => left - right);

  const hasSequentialSteps = sortedStepOrders.every(
    (stepOrder, index) => stepOrder === index + 1,
  );
  if (!hasSequentialSteps) {
    warnings.push(
      buildIssue({
        severity: "warning",
        code: "approval_step_order_warning",
        message:
          "Approval step orders should be sequential and start at 1 for deterministic routing.",
        contractField: "approvals",
      }),
    );
  }

  for (const approval of contract.approvals) {
    if (approval.approverRole.trim().length === 0) {
      warnings.push(
        buildIssue({
          severity: "warning",
          code: "approval_role_warning",
          message: `Approval rule ${approval.ruleId} is missing an approver role.`,
          contractField: "approvals.approverRole",
          reference: approval.ruleId,
        }),
      );
    }

    if (
      approval.thresholdKey &&
      !hasKnownMetricReference(approval.thresholdKey, lookup, contract)
    ) {
      warnings.push(
        buildIssue({
          severity: "warning",
          code: "approval_threshold_warning",
          message: `Approval rule ${approval.ruleId} references an unknown threshold key ${approval.thresholdKey}.`,
          contractField: "approvals.thresholdKey",
          graphField: "metrics",
          reference: approval.thresholdKey,
        }),
      );
    }
  }

  return warnings.sort(compareIssues);
}

export function collectDecisionActionWarnings(
  contract: DecisionContract,
): DecisionCompatibilityIssue[] {
  const warnings: DecisionCompatibilityIssue[] = [];
  const seenTargets = new Set<string>();

  for (const action of contract.actions) {
    const targetKey = `${action.actionType}::${action.destinationType}`;
    if (!action.templateId) {
      warnings.push(
        buildIssue({
          severity: "warning",
          code: "action_template_warning",
          message: `Action ${targetKey} is missing a templateId.`,
          contractField: "actions.templateId",
          reference: targetKey,
        }),
      );
    }

    if (
      action.actionType.trim().length === 0 ||
      action.destinationType.trim().length === 0
    ) {
      warnings.push(
        buildIssue({
          severity: "warning",
          code: "action_shape_warning",
          message: "Actions must declare both actionType and destinationType.",
          contractField: "actions",
          reference: targetKey,
        }),
      );
    }

    if (seenTargets.has(targetKey)) {
      warnings.push(
        buildIssue({
          severity: "warning",
          code: "action_shape_warning",
          message: `Action target ${targetKey} is duplicated in the contract.`,
          contractField: "actions",
          reference: targetKey,
        }),
      );
      continue;
    }

    seenTargets.add(targetKey);
  }

  return warnings.sort(compareIssues);
}

function buildVersionIssues(
  contract: DecisionContract,
  graph: DecisionGraph,
  assumptions: DecisionCompatibilityVersionAssumptions | undefined,
): DecisionCompatibilityIssue[] {
  const issues: DecisionCompatibilityIssue[] = [];

  if (contract.graphRef.graphId !== graph.graphId) {
    issues.push(
      buildIssue({
        severity: "blocking",
        code: "graph_id_mismatch",
        message: `Contract graphRef ${contract.graphRef.graphId} does not match graph ${graph.graphId}.`,
        contractField: "graphRef.graphId",
        graphField: "graphId",
        reference: contract.graphRef.graphId,
      }),
    );
  }

  if (contract.graphRef.graphVersion !== graph.graphVersion) {
    const backwardCompatible =
      assumptions?.allowBackwardCompatibleGraphVersion === true &&
      graph.compatibility.breakingChange === false &&
      graph.compatibility.backwardCompatibleWith.includes(
        contract.graphRef.graphVersion,
      );

    issues.push(
      buildIssue({
        severity: backwardCompatible ? "warning" : "blocking",
        code: backwardCompatible
          ? "graph_version_backward_compatible"
          : "graph_version_mismatch",
        message: backwardCompatible
          ? `Contract graphRef version ${contract.graphRef.graphVersion} is older than graph version ${graph.graphVersion}, but the graph declares backward compatibility.`
          : `Contract graphRef version ${contract.graphRef.graphVersion} does not match graph version ${graph.graphVersion}.`,
        contractField: "graphRef.graphVersion",
        graphField: "graphVersion",
        reference: String(contract.graphRef.graphVersion),
      }),
    );
  }

  if (
    assumptions?.expectedGraphVersion != null &&
    assumptions.expectedGraphVersion !== graph.graphVersion
  ) {
    issues.push(
      buildIssue({
        severity: "blocking",
        code: "graph_version_assumption_mismatch",
        message: `Expected graph version ${assumptions.expectedGraphVersion}, received ${graph.graphVersion}.`,
        graphField: "graphVersion",
        reference: String(assumptions.expectedGraphVersion),
      }),
    );
  }

  if (
    assumptions?.expectedCanonicalModelVersion != null &&
    assumptions.expectedCanonicalModelVersion !== graph.canonicalModelVersion
  ) {
    issues.push(
      buildIssue({
        severity: "blocking",
        code: "canonical_model_version_assumption_mismatch",
        message: `Expected canonical model version ${assumptions.expectedCanonicalModelVersion}, received ${graph.canonicalModelVersion}.`,
        graphField: "canonicalModelVersion",
        reference: assumptions.expectedCanonicalModelVersion,
      }),
    );
  }

  return issues;
}

function buildEventIssues(
  graph: DecisionGraph,
  assumptions: DecisionCompatibilityEventAssumptions | undefined,
): DecisionCompatibilityIssue[] {
  if ((assumptions?.requiredSourceSystems?.length ?? 0) === 0) {
    return [];
  }

  const lookup = buildGraphLookup(graph);
  return assumptions!
    .requiredSourceSystems!.filter(
      (sourceSystem) => !lookup.sourceSystems.has(sourceSystem),
    )
    .map((sourceSystem) =>
      buildIssue({
        severity: "blocking",
        code: "missing_event_source",
        message: `Graph is missing required event source system ${sourceSystem}.`,
        graphField: "entityResolution.strategies",
        reference: sourceSystem,
      }),
    );
}

export function evaluateDecisionCompatibility(
  request: DecisionCompatibilityRequest,
): DecisionCompatibilityResponse {
  const { contract, graph, versionAssumptions, eventAssumptions } = request;

  assertDecisionContractIntegrity(contract);
  assertDecisionGraphIntegrity(graph);

  const missingInputs = collectMissingDecisionContractInputs(contract, graph);
  const missingMetrics = collectMissingDecisionContractMetrics(contract, graph);
  const unsupportedPacks = collectUnsupportedDecisionContractPacks(
    contract,
    graph,
  );
  const horizonMismatch = hasDecisionContractHorizonMismatch(contract, graph);
  const approvalWarnings = collectDecisionApprovalWarnings(contract, graph);
  const actionWarnings = collectDecisionActionWarnings(contract);

  const blockingIssues: DecisionCompatibilityIssue[] = [
    ...buildVersionIssues(contract, graph, versionAssumptions),
    ...buildEventIssues(graph, eventAssumptions),
    ...unsupportedPacks.map((pack) =>
      buildIssue({
        severity: "blocking",
        code: "unsupported_pack",
        message: `Graph does not support decision pack ${pack}.`,
        contractField: "pack",
        graphField: "supportedPacks",
        reference: pack,
      }),
    ),
    ...missingInputs.map((gap) =>
      buildIssue({
        severity: "blocking",
        code:
          gap.reason === "missing_entity"
            ? "missing_input_entity"
            : "missing_input_attribute",
        message:
          gap.reason === "missing_entity"
            ? `Input ${gap.inputKey} references missing entity ${gap.entity}.`
            : `Input ${gap.inputKey} references missing attribute ${gap.entity}.${gap.attribute}.`,
        contractField: "inputs",
        graphField: "entities",
        reference: gap.inputKey,
      }),
    ),
    ...missingMetrics.map((gap) =>
      buildIssue({
        severity: "blocking",
        code: "missing_metric",
        message: `Referenced metric ${gap.metricKey} is missing from the graph for ${gap.source}.`,
        contractField:
          gap.source === "objective"
            ? "objective.metricKey"
            : gap.source === "approval_threshold"
              ? "approvals.thresholdKey"
              : "explanationTemplate.topDriverKeys",
        graphField: "metrics",
        reference: gap.metricKey,
      }),
    ),
  ];

  if (horizonMismatch) {
    blockingIssues.push(
      buildIssue({
        severity: "blocking",
        code: "missing_horizon",
        message: `Graph does not expose horizon ${contract.scope.horizonId}.`,
        contractField: "scope.horizonId",
        graphField: "horizons",
        reference: contract.scope.horizonId,
      }),
    );
  }

  const issues = [
    ...blockingIssues,
    ...approvalWarnings,
    ...actionWarnings,
  ].sort(compareIssues);
  const blockingIssueCount = issues.filter(
    (issue) => issue.severity === "blocking",
  ).length;
  const warningCount = issues.length - blockingIssueCount;

  return {
    contractId: contract.contractId,
    contractVersion: contract.contractVersion,
    graphId: graph.graphId,
    graphVersion: graph.graphVersion,
    compatible: blockingIssueCount === 0,
    blockingIssueCount,
    warningCount,
    contractGraphRefMatches:
      contract.graphRef.graphId === graph.graphId &&
      contract.graphRef.graphVersion === graph.graphVersion,
    versionAssumptionsSatisfied: !issues.some(
      (issue) =>
        issue.code === "graph_version_mismatch" ||
        issue.code === "graph_version_assumption_mismatch" ||
        issue.code === "canonical_model_version_assumption_mismatch" ||
        issue.code === "graph_id_mismatch",
    ),
    eventAssumptionsSatisfied: !issues.some(
      (issue) => issue.code === "missing_event_source",
    ),
    unsupportedPacks,
    missingInputs,
    missingMetrics,
    horizonMismatch,
    approvalWarnings,
    actionWarnings,
    issues,
  };
}
