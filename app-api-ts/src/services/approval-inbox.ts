import type {
  ApprovalRecord,
  ApprovalStatus,
} from "@praedixa/shared-types/domain";
import type {
  ApprovalInboxActorSummary,
  ApprovalInboxBadge,
  ApprovalInboxCostBadge,
  ApprovalInboxDecisionSummary,
  ApprovalInboxFilter,
  ApprovalInboxGroup,
  ApprovalInboxGroupBy,
  ApprovalInboxItem,
  ApprovalInboxPolicySummary,
  ApprovalInboxPriority,
  ApprovalInboxPriorityCounts,
  ApprovalInboxRequest,
  ApprovalInboxResolvedFilter,
  ApprovalInboxResolvedRequest,
  ApprovalInboxResponse,
  ApprovalInboxRiskBadge,
  ApprovalInboxRoleSummary,
  ApprovalInboxScopeSummary,
  ApprovalInboxSort,
  ApprovalInboxSortDirection,
  ApprovalInboxSortField,
  ApprovalInboxStatusCounts,
  ApprovalInboxSummary,
} from "@praedixa/shared-types/api";

export type {
  ApprovalInboxActorSummary,
  ApprovalInboxBadge,
  ApprovalInboxCostBadge,
  ApprovalInboxDecisionSummary,
  ApprovalInboxFilter,
  ApprovalInboxGroup,
  ApprovalInboxGroupBy,
  ApprovalInboxItem,
  ApprovalInboxPolicySummary,
  ApprovalInboxPriority,
  ApprovalInboxPriorityCounts,
  ApprovalInboxRequest,
  ApprovalInboxResolvedFilter,
  ApprovalInboxResolvedRequest,
  ApprovalInboxResponse,
  ApprovalInboxRiskBadge,
  ApprovalInboxRoleSummary,
  ApprovalInboxScopeSummary,
  ApprovalInboxSort,
  ApprovalInboxSortDirection,
  ApprovalInboxSortField,
  ApprovalInboxStatusCounts,
  ApprovalInboxSummary,
} from "@praedixa/shared-types/api";

const DEFAULT_SORT: ApprovalInboxSort = {
  field: "priority",
  direction: "desc",
};

const DEFAULT_GROUP_BY: ApprovalInboxGroupBy = "status";

const RESOLVED_STATUSES = new Set<ApprovalStatus>([
  "granted",
  "rejected",
  "expired",
  "canceled",
]);

const PRIORITY_RANK: Record<ApprovalInboxPriority, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

const STATUS_BADGES: Record<ApprovalStatus, ApprovalInboxBadge> = {
  requested: { label: "Requested", tone: "info" },
  granted: { label: "Granted", tone: "success" },
  rejected: { label: "Rejected", tone: "warning" },
  expired: { label: "Expired", tone: "danger" },
  canceled: { label: "Canceled", tone: "neutral" },
};

const PRIORITY_BADGES: Record<ApprovalInboxPriority, ApprovalInboxBadge> = {
  low: { label: "Low", tone: "neutral" },
  medium: { label: "Medium", tone: "info" },
  high: { label: "High", tone: "warning" },
  critical: { label: "Critical", tone: "danger" },
};

function parseTimestamp(value: string, fieldName: string): number {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`${fieldName} must be a valid ISO datetime`);
  }
  return parsed;
}

function normalizeStringList(
  values: readonly string[] | undefined,
  fieldName: string,
): readonly string[] {
  const normalized = (values ?? []).map((value) => value.trim());
  if (normalized.some((value) => value.length === 0)) {
    throw new Error(`${fieldName} cannot contain blank values`);
  }

  const unique = [...new Set(normalized)];
  if (unique.length !== normalized.length) {
    throw new Error(`${fieldName} cannot contain duplicate values`);
  }

  return unique.sort((left, right) => left.localeCompare(right));
}

function normalizeEnumList<T extends string>(
  values: readonly T[] | undefined,
  fieldName: string,
): readonly T[] {
  const normalized = values ?? [];
  const unique = [...new Set(normalized)];
  if (unique.length !== normalized.length) {
    throw new Error(`${fieldName} cannot contain duplicate values`);
  }
  return unique;
}

function normalizeSearch(search: string | undefined): string | null {
  if (search == null) {
    return null;
  }

  const normalized = search.trim().toLowerCase();
  if (normalized.length === 0) {
    throw new Error("filter.search cannot be blank");
  }

  return normalized;
}

function normalizeFilter(
  filter: ApprovalInboxFilter | undefined,
): ApprovalInboxResolvedFilter {
  return {
    approverRoles: normalizeStringList(
      filter?.approverRoles,
      "filter.approverRoles",
    ),
    statuses: normalizeEnumList(filter?.statuses, "filter.statuses"),
    priorities: normalizeEnumList(filter?.priorities, "filter.priorities"),
    contractIds: normalizeStringList(filter?.contractIds, "filter.contractIds"),
    contractVersion: filter?.contractVersion ?? null,
    search: normalizeSearch(filter?.search),
    requiresJustification: filter?.requiresJustification ?? null,
    unreadOnly: filter?.unreadOnly ?? false,
    urgentOnly: filter?.urgentOnly ?? false,
    overdueOnly: filter?.overdueOnly ?? false,
  };
}

function assertFilterConsistency(filter: ApprovalInboxResolvedFilter): void {
  const requestedSelected =
    filter.statuses.length === 0 || filter.statuses.includes("requested");

  if (filter.overdueOnly && !requestedSelected) {
    throw new Error("filter.overdueOnly requires requested approvals");
  }

  if (filter.unreadOnly && !requestedSelected) {
    throw new Error("filter.unreadOnly requires requested approvals");
  }
}

function normalizeSort(sort: ApprovalInboxSort | undefined): ApprovalInboxSort {
  return sort == null ? { ...DEFAULT_SORT } : { ...sort };
}

export function normalizeApprovalInboxRequest(
  request: ApprovalInboxRequest = {},
): ApprovalInboxResolvedRequest {
  const now = request.now ?? new Date().toISOString();
  parseTimestamp(now, "request.now");

  const normalized = {
    filter: normalizeFilter(request.filter),
    sort: normalizeSort(request.sort),
    groupBy: request.groupBy ?? DEFAULT_GROUP_BY,
    includeResolved: request.includeResolved ?? false,
    now,
  } satisfies ApprovalInboxResolvedRequest;

  assertFilterConsistency(normalized.filter);
  return normalized;
}

function buildActorLabel(actorType: string, actorRole: string | null): string {
  return actorRole == null ? actorType : `${actorType}:${actorRole}`;
}

function buildActorSummary(
  actor: ApprovalRecord["requestedBy"],
): ApprovalInboxActorSummary {
  const actorRole = actor.actorRole ?? null;
  return {
    actorType: actor.actorType,
    actorId: actor.actorId,
    actorRole,
    label: buildActorLabel(actor.actorType, actorRole),
  };
}

function buildScopeSummary(record: ApprovalRecord): ApprovalInboxScopeSummary {
  const selector = record.scope.selector;
  const targetCount =
    selector.mode === "ids" ? (selector.ids?.length ?? 0) : null;
  const selectorLabel =
    selector.mode === "all"
      ? "all targets"
      : selector.mode === "ids"
        ? `${targetCount ?? 0} target(s)`
        : (selector.query ?? "query");

  return {
    entityType: record.scope.entityType,
    selectorMode: selector.mode,
    horizonId: record.scope.horizonId,
    targetCount,
    label: `${record.scope.entityType} · ${selectorLabel} · ${record.scope.horizonId}`,
  };
}

function buildPolicySummary(
  record: ApprovalRecord,
): ApprovalInboxPolicySummary {
  return {
    estimatedCostEur: record.policyContext.estimatedCostEur ?? null,
    riskScore: record.policyContext.riskScore ?? null,
    actionTypes: [...record.policyContext.actionTypes].sort((left, right) =>
      left.localeCompare(right),
    ),
    destinationTypes: [...(record.policyContext.destinationTypes ?? [])].sort(
      (left, right) => left.localeCompare(right),
    ),
  };
}

function buildDecisionSummary(
  record: ApprovalRecord,
): ApprovalInboxDecisionSummary | undefined {
  if (record.decision == null) {
    return undefined;
  }

  return {
    outcome: record.decision.outcome,
    actorUserId: record.decision.actorUserId,
    actorRole: record.decision.actorRole,
    reasonCode: record.decision.reasonCode,
    ...(record.decision.comment !== undefined
      ? { comment: record.decision.comment }
      : {}),
    decidedAt: record.decision.decidedAt,
    actor: {
      actorType: "user",
      actorId: record.decision.actorUserId,
      actorRole: record.decision.actorRole,
      label: buildActorLabel("user", record.decision.actorRole),
    },
  };
}

function toAgeHours(requestedAt: string, now: string): number {
  const ageMs =
    parseTimestamp(now, "request.now") -
    parseTimestamp(requestedAt, "requestedAt");
  return Math.max(0, Math.floor(ageMs / 3_600_000));
}

function isOverdue(record: ApprovalRecord, now: string): boolean {
  return (
    record.status === "requested" &&
    record.deadlineAt != null &&
    parseTimestamp(record.deadlineAt, "deadlineAt") <
      parseTimestamp(now, "request.now")
  );
}

function isDeadlineSoon(
  record: ApprovalRecord,
  now: string,
  hours: number,
): boolean {
  if (record.status !== "requested" || record.deadlineAt == null) {
    return false;
  }

  const remainingMs =
    parseTimestamp(record.deadlineAt, "deadlineAt") -
    parseTimestamp(now, "request.now");
  return remainingMs >= 0 && remainingMs <= hours * 3_600_000;
}

export function requiresApprovalJustification(record: ApprovalRecord): boolean {
  return (
    record.separationOfDuties.required ||
    (record.policyContext.riskScore ?? 0) >= 0.7 ||
    (record.policyContext.estimatedCostEur ?? 0) >= 1_000
  );
}

function buildRiskBadge(record: ApprovalRecord): ApprovalInboxRiskBadge {
  const score = record.policyContext.riskScore ?? null;
  if (score == null) {
    return { label: "Risk N/A", tone: "neutral", score: null };
  }
  if (score >= 0.9) {
    return { label: "Critical risk", tone: "danger", score };
  }
  if (score >= 0.75) {
    return { label: "High risk", tone: "warning", score };
  }
  if (score >= 0.4) {
    return { label: "Medium risk", tone: "info", score };
  }
  return { label: "Low risk", tone: "success", score };
}

function buildCostBadge(record: ApprovalRecord): ApprovalInboxCostBadge {
  const amountEur = record.policyContext.estimatedCostEur ?? null;
  if (amountEur == null) {
    return { label: "Cost N/A", tone: "neutral", amountEur: null };
  }
  if (amountEur >= 5_000) {
    return { label: "Cost > 5kEUR", tone: "danger", amountEur };
  }
  if (amountEur >= 2_000) {
    return { label: "Cost > 2kEUR", tone: "warning", amountEur };
  }
  if (amountEur >= 500) {
    return { label: "Cost > 500EUR", tone: "info", amountEur };
  }
  return { label: "Low cost", tone: "success", amountEur };
}

export function calculateApprovalInboxPriority(
  record: ApprovalRecord,
  now: string,
): ApprovalInboxPriority {
  if (isOverdue(record, now)) {
    return "critical";
  }

  if (
    (record.policyContext.riskScore ?? 0) >= 0.9 ||
    (record.policyContext.estimatedCostEur ?? 0) >= 5_000 ||
    isDeadlineSoon(record, now, 2)
  ) {
    return "critical";
  }

  if (
    (record.policyContext.riskScore ?? 0) >= 0.75 ||
    (record.policyContext.estimatedCostEur ?? 0) >= 2_000 ||
    isDeadlineSoon(record, now, 8) ||
    record.separationOfDuties.required
  ) {
    return "high";
  }

  if (
    requiresApprovalJustification(record) ||
    (record.policyContext.riskScore ?? 0) >= 0.4 ||
    (record.policyContext.estimatedCostEur ?? 0) >= 500
  ) {
    return "medium";
  }

  return "low";
}

function buildTags(
  record: ApprovalRecord,
  item: Pick<
    ApprovalInboxItem,
    "isOverdue" | "isUrgent" | "isUnread" | "requiresJustification"
  >,
): readonly string[] {
  const tags = new Set<string>();

  if (item.isOverdue) {
    tags.add("overdue");
  }
  if (item.isUrgent) {
    tags.add("urgent");
  }
  if (item.isUnread) {
    tags.add("unread");
  }
  if (item.requiresJustification) {
    tags.add("justification_required");
  }
  if (record.separationOfDuties.required) {
    tags.add("sod_required");
  }

  for (const actionType of record.policyContext.actionTypes) {
    tags.add(`action:${actionType}`);
  }
  for (const destinationType of record.policyContext.destinationTypes ?? []) {
    tags.add(`destination:${destinationType}`);
  }

  return [...tags].sort((left, right) => left.localeCompare(right));
}

export function buildApprovalInboxItem(
  record: ApprovalRecord,
  now: string,
): ApprovalInboxItem {
  const priority = calculateApprovalInboxPriority(record, now);
  const overdue = isOverdue(record, now);
  const urgent = overdue || PRIORITY_RANK[priority] >= PRIORITY_RANK.high;
  const unread = record.status === "requested" && record.history.length === 0;
  const requiresJustification = requiresApprovalJustification(record);
  const decision = buildDecisionSummary(record);

  const item: ApprovalInboxItem = {
    approvalId: record.approvalId,
    contractId: record.contractId,
    contractVersion: record.contractVersion,
    recommendationId: record.recommendationId,
    ...(record.scenarioRunId !== undefined
      ? { scenarioRunId: record.scenarioRunId }
      : {}),
    status: record.status,
    priority,
    approverRole: record.rule.approverRole,
    stepOrder: record.rule.stepOrder,
    requestedAt: record.requestedAt,
    ...(record.deadlineAt !== undefined
      ? { deadlineAt: record.deadlineAt }
      : {}),
    ageHours: toAgeHours(record.requestedAt, now),
    isOverdue: overdue,
    isUrgent: urgent,
    isUnread: unread,
    requiresJustification,
    requestedBy: buildActorSummary(record.requestedBy),
    scope: buildScopeSummary(record),
    policy: buildPolicySummary(record),
    ...(decision !== undefined ? { decision } : {}),
    statusBadge: STATUS_BADGES[record.status],
    priorityBadge: PRIORITY_BADGES[priority],
    riskBadge: buildRiskBadge(record),
    costBadge: buildCostBadge(record),
    tags: [],
  };

  return {
    ...item,
    tags: buildTags(record, item),
  };
}

function matchesResolvedPreference(
  item: ApprovalInboxItem,
  request: ApprovalInboxResolvedRequest,
): boolean {
  if (request.includeResolved) {
    return true;
  }
  if (request.filter.statuses.includes(item.status)) {
    return true;
  }
  return !RESOLVED_STATUSES.has(item.status);
}

function matchesSearch(
  item: ApprovalInboxItem,
  search: string | null,
): boolean {
  if (search == null) {
    return true;
  }

  const haystack = [
    item.contractId,
    item.approverRole,
    item.requestedBy.actorRole,
    item.requestedBy.label,
    item.scope.label,
    ...item.policy.actionTypes,
    ...item.policy.destinationTypes,
    ...item.tags,
  ]
    .filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    )
    .join(" ")
    .toLowerCase();

  return haystack.includes(search);
}

function matchesFilter(
  item: ApprovalInboxItem,
  request: ApprovalInboxResolvedRequest,
): boolean {
  const filter = request.filter;

  if (!matchesResolvedPreference(item, request)) {
    return false;
  }
  if (
    filter.approverRoles.length > 0 &&
    !filter.approverRoles.includes(item.approverRole)
  ) {
    return false;
  }
  if (filter.statuses.length > 0 && !filter.statuses.includes(item.status)) {
    return false;
  }
  if (
    filter.priorities.length > 0 &&
    !filter.priorities.includes(item.priority)
  ) {
    return false;
  }
  if (
    filter.contractIds.length > 0 &&
    !filter.contractIds.includes(item.contractId)
  ) {
    return false;
  }
  if (
    filter.contractVersion != null &&
    filter.contractVersion !== item.contractVersion
  ) {
    return false;
  }
  if (
    filter.requiresJustification != null &&
    filter.requiresJustification !== item.requiresJustification
  ) {
    return false;
  }
  if (filter.unreadOnly && !item.isUnread) {
    return false;
  }
  if (filter.urgentOnly && !item.isUrgent) {
    return false;
  }
  if (filter.overdueOnly && !item.isOverdue) {
    return false;
  }
  return matchesSearch(item, filter.search);
}

function compareNullableIso(
  left: string | undefined,
  right: string | undefined,
): number {
  const leftValue =
    left == null ? Number.POSITIVE_INFINITY : parseTimestamp(left, "timestamp");
  const rightValue =
    right == null
      ? Number.POSITIVE_INFINITY
      : parseTimestamp(right, "timestamp");
  return leftValue - rightValue;
}

function compareNumbers(left: number | null, right: number | null): number {
  const leftValue = left ?? Number.NEGATIVE_INFINITY;
  const rightValue = right ?? Number.NEGATIVE_INFINITY;
  return leftValue - rightValue;
}

function applyDirection(
  value: number,
  direction: ApprovalInboxSortDirection,
): number {
  return direction === "asc" ? value : -value;
}

function compareByField(
  left: ApprovalInboxItem,
  right: ApprovalInboxItem,
  field: ApprovalInboxSortField,
  direction: ApprovalInboxSortDirection,
): number {
  const diff =
    field === "priority"
      ? PRIORITY_RANK[left.priority] - PRIORITY_RANK[right.priority]
      : field === "requestedAt"
        ? compareNullableIso(left.requestedAt, right.requestedAt)
        : field === "deadlineAt"
          ? compareNullableIso(left.deadlineAt, right.deadlineAt)
          : field === "riskScore"
            ? compareNumbers(left.riskBadge.score, right.riskBadge.score)
            : field === "estimatedCostEur"
              ? compareNumbers(
                  left.costBadge.amountEur,
                  right.costBadge.amountEur,
                )
              : left.ageHours - right.ageHours;

  return applyDirection(diff, direction);
}

function compareItems(
  left: ApprovalInboxItem,
  right: ApprovalInboxItem,
  sort: ApprovalInboxSort,
): number {
  const primary = compareByField(left, right, sort.field, sort.direction);
  if (primary !== 0) {
    return primary;
  }

  const urgentOrder = Number(right.isUrgent) - Number(left.isUrgent);
  if (urgentOrder !== 0) {
    return urgentOrder;
  }

  const deadlineOrder = compareNullableIso(left.deadlineAt, right.deadlineAt);
  if (deadlineOrder !== 0) {
    return deadlineOrder;
  }

  const requestedAtOrder = left.requestedAt.localeCompare(right.requestedAt);
  if (requestedAtOrder !== 0) {
    return requestedAtOrder;
  }

  return left.approvalId.localeCompare(right.approvalId);
}

function buildStatusCounts(
  items: readonly ApprovalInboxItem[],
): ApprovalInboxStatusCounts {
  return {
    requested: items.filter((item) => item.status === "requested").length,
    granted: items.filter((item) => item.status === "granted").length,
    rejected: items.filter((item) => item.status === "rejected").length,
    expired: items.filter((item) => item.status === "expired").length,
    canceled: items.filter((item) => item.status === "canceled").length,
  };
}

function buildPriorityCounts(
  items: readonly ApprovalInboxItem[],
): ApprovalInboxPriorityCounts {
  return {
    low: items.filter((item) => item.priority === "low").length,
    medium: items.filter((item) => item.priority === "medium").length,
    high: items.filter((item) => item.priority === "high").length,
    critical: items.filter((item) => item.priority === "critical").length,
  };
}

function buildRoleSummaries(
  items: readonly ApprovalInboxItem[],
): readonly ApprovalInboxRoleSummary[] {
  const roles = new Map<string, ApprovalInboxRoleSummary>();

  for (const item of items) {
    const current = roles.get(item.approverRole) ?? {
      approverRole: item.approverRole,
      total: 0,
      unread: 0,
      urgent: 0,
    };

    roles.set(item.approverRole, {
      approverRole: item.approverRole,
      total: current.total + 1,
      unread: current.unread + Number(item.isUnread),
      urgent: current.urgent + Number(item.isUrgent),
    });
  }

  return [...roles.values()].sort((left, right) =>
    left.approverRole.localeCompare(right.approverRole),
  );
}

export function summarizeApprovalInbox(
  items: readonly ApprovalInboxItem[],
): ApprovalInboxSummary {
  return {
    total: items.length,
    unread: items.filter((item) => item.isUnread).length,
    urgent: items.filter((item) => item.isUrgent).length,
    overdue: items.filter((item) => item.isOverdue).length,
    requiresJustification: items.filter((item) => item.requiresJustification)
      .length,
    statuses: buildStatusCounts(items),
    priorities: buildPriorityCounts(items),
    roles: buildRoleSummaries(items),
  };
}

function getGroupIdentity(
  item: ApprovalInboxItem,
  groupBy: ApprovalInboxGroupBy,
): { key: string; label: string } {
  if (groupBy === "status") {
    return { key: item.status, label: item.statusBadge.label };
  }
  if (groupBy === "priority") {
    return { key: item.priority, label: item.priorityBadge.label };
  }
  return { key: item.approverRole, label: item.approverRole };
}

export function groupApprovalInboxItems(
  items: readonly ApprovalInboxItem[],
  groupBy: ApprovalInboxGroupBy,
): readonly ApprovalInboxGroup[] {
  const groups = new Map<string, ApprovalInboxItem[]>();

  for (const item of items) {
    const identity = getGroupIdentity(item, groupBy);
    const groupItems = groups.get(identity.key) ?? [];
    groupItems.push(item);
    groups.set(identity.key, groupItems);
  }

  return [...groups.entries()].map(([groupKey, groupItems]) => {
    const { label } = getGroupIdentity(groupItems[0]!, groupBy);
    return {
      groupBy,
      groupKey,
      groupLabel: label,
      total: groupItems.length,
      unread: groupItems.filter((item) => item.isUnread).length,
      urgent: groupItems.filter((item) => item.isUrgent).length,
      items: groupItems,
    };
  });
}

export function buildApprovalInboxResponse(
  records: readonly ApprovalRecord[],
  request: ApprovalInboxRequest = {},
): ApprovalInboxResponse {
  const normalizedRequest = normalizeApprovalInboxRequest(request);
  const items = records
    .map((record) => buildApprovalInboxItem(record, normalizedRequest.now))
    .filter((item) => matchesFilter(item, normalizedRequest))
    .sort((left, right) => compareItems(left, right, normalizedRequest.sort));

  return {
    request: normalizedRequest,
    summary: summarizeApprovalInbox(items),
    items,
    groups: groupApprovalInboxItems(items, normalizedRequest.groupBy),
  };
}
