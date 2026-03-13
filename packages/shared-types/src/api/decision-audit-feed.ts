import type { ISODateTimeString, UUID } from "../utils/common.js";
import type {
  DecisionAuditEntry,
  DecisionAuditEventType,
  DecisionAuditOutcome,
  DecisionAuditScopeFilter,
  DecisionAuditSubjectFilter,
} from "../domain/decision-audit.js";

export type DecisionAuditFeedActorType =
  DecisionAuditEntry["actor"]["actorType"];
export type DecisionAuditFeedSortField =
  | "appendedAt"
  | "occurredAt"
  | "sequence";

export interface DecisionAuditFeedTimeFilter {
  occurredFrom?: ISODateTimeString;
  occurredTo?: ISODateTimeString;
  appendedFrom?: ISODateTimeString;
  appendedTo?: ISODateTimeString;
}

export interface DecisionAuditFeedResolvedTimeFilter {
  occurredFrom: ISODateTimeString | null;
  occurredTo: ISODateTimeString | null;
  appendedFrom: ISODateTimeString | null;
  appendedTo: ISODateTimeString | null;
}

export interface DecisionAuditFeedActorFilter {
  actorTypes?: readonly DecisionAuditFeedActorType[];
  actorIds?: readonly string[];
  actorRoles?: readonly string[];
}

export interface DecisionAuditFeedResolvedActorFilter {
  actorTypes: readonly DecisionAuditFeedActorType[];
  actorIds: readonly string[];
  actorRoles: readonly string[];
}

export interface DecisionAuditFeedCorrelationFilter {
  requestIds?: readonly string[];
  traceIds?: readonly string[];
  correlationIds?: readonly UUID[];
  causationIds?: readonly UUID[];
  idempotencyKeys?: readonly string[];
}

export interface DecisionAuditFeedResolvedCorrelationFilter {
  requestIds: readonly string[];
  traceIds: readonly string[];
  correlationIds: readonly UUID[];
  causationIds: readonly UUID[];
  idempotencyKeys: readonly string[];
}

export interface DecisionAuditFeedScopeFilter {
  entityType?: DecisionAuditScopeFilter["entityType"];
  horizonId?: string;
  selectorMode?: DecisionAuditScopeFilter["selectorMode"];
  selectorIds?: readonly string[];
  selectorQuery?: string;
  dimensions?: Record<string, string>;
}

export interface DecisionAuditFeedFilter {
  time?: DecisionAuditFeedTimeFilter;
  actor?: DecisionAuditFeedActorFilter;
  subject?: DecisionAuditSubjectFilter;
  scope?: DecisionAuditFeedScopeFilter;
  eventTypes?: readonly DecisionAuditEventType[];
  outcomes?: readonly DecisionAuditOutcome[];
  correlation?: DecisionAuditFeedCorrelationFilter;
}

export interface DecisionAuditFeedResolvedFilter {
  time: DecisionAuditFeedResolvedTimeFilter;
  actor: DecisionAuditFeedResolvedActorFilter;
  subject: DecisionAuditSubjectFilter | null;
  scope: DecisionAuditScopeFilter | null;
  eventTypes: readonly DecisionAuditEventType[];
  outcomes: readonly DecisionAuditOutcome[];
  correlation: DecisionAuditFeedResolvedCorrelationFilter;
}

export interface DecisionAuditFeedSort {
  field: DecisionAuditFeedSortField;
  direction: "asc" | "desc";
}

export interface DecisionAuditFeedRequest {
  filter?: DecisionAuditFeedFilter;
  sort?: DecisionAuditFeedSort;
  page?: {
    limit?: number;
    cursor?: string;
  };
}

export interface DecisionAuditFeedResolvedRequest {
  filter: DecisionAuditFeedResolvedFilter;
  sort: DecisionAuditFeedSort;
  page: {
    limit: number;
    cursor: string | null;
  };
}

export interface DecisionAuditFeedCursorPointer {
  entryId: UUID;
  occurredAt: ISODateTimeString;
  appendedAt: ISODateTimeString;
  sequence: number;
}

export interface DecisionAuditFeedCursorPayload {
  version: "1.0.0";
  requestFingerprint: string;
  sort: DecisionAuditFeedSort;
  last: DecisionAuditFeedCursorPointer;
}

export interface DecisionAuditFeedCorrelationCoverage {
  withRequestId: number;
  withTraceId: number;
  withCorrelationId: number;
  withCausationId: number;
  withIdempotencyKey: number;
}

export interface DecisionAuditFeedPageSummary {
  eventTypeCounts: Partial<Record<DecisionAuditEventType, number>>;
  outcomeCounts: Partial<Record<DecisionAuditOutcome, number>>;
  actorTypeCounts: Partial<Record<DecisionAuditFeedActorType, number>>;
  earliestOccurredAt: ISODateTimeString | null;
  latestOccurredAt: ISODateTimeString | null;
  earliestAppendedAt: ISODateTimeString | null;
  latestAppendedAt: ISODateTimeString | null;
  correlationCoverage: DecisionAuditFeedCorrelationCoverage;
}

export interface DecisionAuditFeedChainGap {
  previousEntryId: UUID;
  nextEntryId: UUID;
  previousSequence: number;
  nextSequence: number;
  previousEntryHash: string;
  nextPreviousEntryHash?: string;
  reason: "sequence_gap" | "hash_gap";
}

export interface DecisionAuditFeedChainSummary {
  entryCount: number;
  firstSequence: number | null;
  lastSequence: number | null;
  firstEntryHash: string | null;
  lastEntryHash: string | null;
  isContinuous: boolean;
  gapCount: number;
  gaps: readonly DecisionAuditFeedChainGap[];
}

export interface DecisionAuditFeedPage {
  matched: number;
  returned: number;
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface DecisionAuditFeedResponse {
  request: DecisionAuditFeedResolvedRequest;
  page: DecisionAuditFeedPage;
  entries: readonly DecisionAuditEntry[];
  pageSummary: DecisionAuditFeedPageSummary;
  chainSummary: DecisionAuditFeedChainSummary;
}
