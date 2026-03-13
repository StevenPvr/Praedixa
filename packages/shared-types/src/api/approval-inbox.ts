import type { ISODateTimeString, UUID } from "../utils/common.js";
import type {
  ApprovalActorType,
  ApprovalOutcome,
  ApprovalStatus,
} from "../domain/approval.js";
import type { DecisionScope } from "../domain/decision-contract.js";

export type ApprovalInboxBadgeTone =
  | "neutral"
  | "info"
  | "warning"
  | "danger"
  | "success";

export type ApprovalInboxPriority = "low" | "medium" | "high" | "critical";

export type ApprovalInboxGroupBy = "status" | "priority" | "approverRole";

export type ApprovalInboxSortField =
  | "priority"
  | "requestedAt"
  | "deadlineAt"
  | "riskScore"
  | "estimatedCostEur"
  | "ageHours";

export type ApprovalInboxSortDirection = "asc" | "desc";

export interface ApprovalInboxFilter {
  approverRoles?: readonly string[];
  statuses?: readonly ApprovalStatus[];
  priorities?: readonly ApprovalInboxPriority[];
  contractIds?: readonly string[];
  contractVersion?: number;
  search?: string;
  requiresJustification?: boolean;
  unreadOnly?: boolean;
  urgentOnly?: boolean;
  overdueOnly?: boolean;
}

export interface ApprovalInboxSort {
  field: ApprovalInboxSortField;
  direction: ApprovalInboxSortDirection;
}

export interface ApprovalInboxRequest {
  filter?: ApprovalInboxFilter;
  sort?: ApprovalInboxSort;
  groupBy?: ApprovalInboxGroupBy;
  includeResolved?: boolean;
  now?: ISODateTimeString;
}

export interface ApprovalInboxResolvedFilter {
  approverRoles: readonly string[];
  statuses: readonly ApprovalStatus[];
  priorities: readonly ApprovalInboxPriority[];
  contractIds: readonly string[];
  contractVersion: number | null;
  search: string | null;
  requiresJustification: boolean | null;
  unreadOnly: boolean;
  urgentOnly: boolean;
  overdueOnly: boolean;
}

export interface ApprovalInboxResolvedRequest {
  filter: ApprovalInboxResolvedFilter;
  sort: ApprovalInboxSort;
  groupBy: ApprovalInboxGroupBy;
  includeResolved: boolean;
  now: ISODateTimeString;
}

export interface ApprovalInboxBadge {
  label: string;
  tone: ApprovalInboxBadgeTone;
}

export interface ApprovalInboxRiskBadge extends ApprovalInboxBadge {
  score: number | null;
}

export interface ApprovalInboxCostBadge extends ApprovalInboxBadge {
  amountEur: number | null;
}

export interface ApprovalInboxActorSummary {
  actorType: ApprovalActorType;
  actorId: string;
  actorRole: string | null;
  label: string;
}

export interface ApprovalInboxScopeSummary {
  entityType: DecisionScope["entityType"];
  selectorMode: DecisionScope["selector"]["mode"];
  horizonId: string;
  targetCount: number | null;
  label: string;
}

export interface ApprovalInboxPolicySummary {
  estimatedCostEur: number | null;
  riskScore: number | null;
  actionTypes: readonly string[];
  destinationTypes: readonly string[];
}

export interface ApprovalInboxDecisionSummary {
  outcome: ApprovalOutcome;
  actorUserId: UUID;
  actorRole: string;
  reasonCode: string;
  comment?: string;
  decidedAt: ISODateTimeString;
  actor: ApprovalInboxActorSummary;
}

export interface ApprovalInboxItem {
  approvalId: UUID;
  contractId: string;
  contractVersion: number;
  recommendationId: UUID;
  scenarioRunId?: UUID;
  status: ApprovalStatus;
  priority: ApprovalInboxPriority;
  approverRole: string;
  stepOrder: number;
  requestedAt: ISODateTimeString;
  deadlineAt?: ISODateTimeString;
  ageHours: number;
  isOverdue: boolean;
  isUrgent: boolean;
  isUnread: boolean;
  requiresJustification: boolean;
  requestedBy: ApprovalInboxActorSummary;
  scope: ApprovalInboxScopeSummary;
  policy: ApprovalInboxPolicySummary;
  decision?: ApprovalInboxDecisionSummary;
  statusBadge: ApprovalInboxBadge;
  priorityBadge: ApprovalInboxBadge;
  riskBadge: ApprovalInboxRiskBadge;
  costBadge: ApprovalInboxCostBadge;
  tags: readonly string[];
}

export interface ApprovalInboxStatusCounts {
  requested: number;
  granted: number;
  rejected: number;
  expired: number;
  canceled: number;
}

export interface ApprovalInboxPriorityCounts {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

export interface ApprovalInboxRoleSummary {
  approverRole: string;
  total: number;
  unread: number;
  urgent: number;
}

export interface ApprovalInboxSummary {
  total: number;
  unread: number;
  urgent: number;
  overdue: number;
  requiresJustification: number;
  statuses: ApprovalInboxStatusCounts;
  priorities: ApprovalInboxPriorityCounts;
  roles: readonly ApprovalInboxRoleSummary[];
}

export interface ApprovalInboxGroup {
  groupBy: ApprovalInboxGroupBy;
  groupKey: string;
  groupLabel: string;
  total: number;
  unread: number;
  urgent: number;
  items: readonly ApprovalInboxItem[];
}

export interface ApprovalInboxResponse {
  request: ApprovalInboxResolvedRequest;
  summary: ApprovalInboxSummary;
  items: readonly ApprovalInboxItem[];
  groups: readonly ApprovalInboxGroup[];
}
