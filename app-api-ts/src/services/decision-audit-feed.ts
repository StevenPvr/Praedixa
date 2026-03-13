import { createHash } from "node:crypto";

import type {
  DecisionAuditActor,
  DecisionAuditEntry,
  DecisionAuditEventType,
  DecisionAuditOutcome,
  DecisionAuditScopeFilter,
  DecisionAuditSubjectFilter,
  DecisionEntityType,
  DecisionSelectorMode,
} from "@praedixa/shared-types/domain";

import {
  filterDecisionAuditByScope,
  filterDecisionAuditBySubject,
} from "./decision-audit.js";

export type DecisionAuditFeedActorType = DecisionAuditActor["actorType"];

export type DecisionAuditFeedSortField =
  | "occurredAt"
  | "appendedAt"
  | "sequence";

export type DecisionAuditFeedSortDirection = "asc" | "desc";

export interface DecisionAuditFeedTimeFilter {
  occurredFrom?: string;
  occurredTo?: string;
  appendedFrom?: string;
  appendedTo?: string;
}

export interface DecisionAuditFeedActorFilter {
  actorTypes?: readonly DecisionAuditFeedActorType[];
  actorIds?: readonly string[];
  actorRoles?: readonly string[];
}

export interface DecisionAuditFeedCorrelationFilter {
  requestIds?: readonly string[];
  traceIds?: readonly string[];
  correlationIds?: readonly string[];
  causationIds?: readonly string[];
  idempotencyKeys?: readonly string[];
}

export interface DecisionAuditFeedFilter {
  time?: DecisionAuditFeedTimeFilter;
  actor?: DecisionAuditFeedActorFilter;
  subject?: DecisionAuditSubjectFilter;
  scope?: DecisionAuditScopeFilter;
  eventTypes?: readonly DecisionAuditEventType[];
  outcomes?: readonly DecisionAuditOutcome[];
  correlation?: DecisionAuditFeedCorrelationFilter;
}

export interface DecisionAuditFeedSort {
  field: DecisionAuditFeedSortField;
  direction: DecisionAuditFeedSortDirection;
}

export interface DecisionAuditFeedPageRequest {
  limit?: number;
  cursor?: string;
}

export interface DecisionAuditFeedRequest {
  filter?: DecisionAuditFeedFilter;
  sort?: DecisionAuditFeedSort;
  page?: DecisionAuditFeedPageRequest;
}

export interface DecisionAuditFeedResolvedTimeFilter {
  occurredFrom: string | null;
  occurredTo: string | null;
  appendedFrom: string | null;
  appendedTo: string | null;
}

export interface DecisionAuditFeedResolvedActorFilter {
  actorTypes: readonly DecisionAuditFeedActorType[];
  actorIds: readonly string[];
  actorRoles: readonly string[];
}

export interface DecisionAuditFeedResolvedCorrelationFilter {
  requestIds: readonly string[];
  traceIds: readonly string[];
  correlationIds: readonly string[];
  causationIds: readonly string[];
  idempotencyKeys: readonly string[];
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

export interface DecisionAuditFeedResolvedPage {
  limit: number;
  cursor: string | null;
}

export interface DecisionAuditFeedResolvedRequest {
  filter: DecisionAuditFeedResolvedFilter;
  sort: DecisionAuditFeedSort;
  page: DecisionAuditFeedResolvedPage;
}

export interface DecisionAuditFeedCursorPointer {
  entryId: string;
  occurredAt: string;
  appendedAt: string;
  sequence: number;
}

export interface DecisionAuditFeedCursorPayload {
  version: "1.0.0";
  requestFingerprint: string;
  sort: DecisionAuditFeedSort;
  last: DecisionAuditFeedCursorPointer;
}

export interface DecisionAuditFeedPageInfo {
  matched: number;
  returned: number;
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
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
  earliestOccurredAt: string | null;
  latestOccurredAt: string | null;
  earliestAppendedAt: string | null;
  latestAppendedAt: string | null;
  correlationCoverage: DecisionAuditFeedCorrelationCoverage;
}

export type DecisionAuditFeedChainGapReason = "sequence_gap" | "hash_gap";

export interface DecisionAuditFeedChainGap {
  previousEntryId: string;
  nextEntryId: string;
  previousSequence: number;
  nextSequence: number;
  previousEntryHash: string;
  nextPreviousEntryHash?: string;
  reason: DecisionAuditFeedChainGapReason;
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

export interface DecisionAuditFeedResponse {
  request: DecisionAuditFeedResolvedRequest;
  page: DecisionAuditFeedPageInfo;
  entries: readonly DecisionAuditEntry[];
  pageSummary: DecisionAuditFeedPageSummary;
  chainSummary: DecisionAuditFeedChainSummary;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATETIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})Z$/;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const ACTOR_TYPES: readonly DecisionAuditFeedActorType[] = [
  "service",
  "system",
  "user",
];
const EVENT_TYPES: readonly DecisionAuditEventType[] = [
  "action.canceled",
  "action.dispatched",
  "action.failed",
  "action.retried",
  "approval.granted",
  "approval.rejected",
  "contract.published",
  "contract.rolled_back",
  "ledger.contested",
  "ledger.recalculated",
  "ledger.validated",
];
const OUTCOMES: readonly DecisionAuditOutcome[] = [
  "canceled",
  "contested",
  "failed",
  "rejected",
  "succeeded",
];
const ENTITY_TYPES: readonly DecisionEntityType[] = [
  "flow",
  "order_aggregate",
  "organization",
  "period",
  "route",
  "site",
  "stock_node",
  "team",
];
const SELECTOR_MODES: readonly DecisionSelectorMode[] = ["all", "ids", "query"];
const SORT_FIELDS: readonly DecisionAuditFeedSortField[] = [
  "appendedAt",
  "occurredAt",
  "sequence",
];
const DEFAULT_SORT: DecisionAuditFeedSort = {
  field: "occurredAt",
  direction: "desc",
};

function hasOwnKey(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isResolvedDecisionAuditFeedRequest(
  request: DecisionAuditFeedRequest | DecisionAuditFeedResolvedRequest,
): request is DecisionAuditFeedResolvedRequest {
  if (
    !("filter" in request) ||
    request.filter == null ||
    !("page" in request) ||
    request.page == null ||
    !("sort" in request) ||
    request.sort == null
  ) {
    return false;
  }

  const { filter, page } = request;
  const time = filter.time;
  const actor = filter.actor;
  const correlation = filter.correlation;

  return (
    time != null &&
    actor != null &&
    correlation != null &&
    hasOwnKey(time, "occurredFrom") &&
    hasOwnKey(time, "occurredTo") &&
    hasOwnKey(time, "appendedFrom") &&
    hasOwnKey(time, "appendedTo") &&
    Array.isArray(actor.actorTypes) &&
    Array.isArray(actor.actorIds) &&
    Array.isArray(actor.actorRoles) &&
    Array.isArray(filter.eventTypes) &&
    Array.isArray(filter.outcomes) &&
    Array.isArray(correlation.requestIds) &&
    Array.isArray(correlation.traceIds) &&
    Array.isArray(correlation.correlationIds) &&
    Array.isArray(correlation.causationIds) &&
    Array.isArray(correlation.idempotencyKeys) &&
    typeof page.limit === "number" &&
    hasOwnKey(page, "cursor")
  );
}

function isNonEmptyString(value: string | null | undefined): value is string {
  return (value?.trim().length ?? 0) > 0;
}

function isIsoDateTimeString(value: string): boolean {
  return ISO_DATETIME_PATTERN.test(value) && !Number.isNaN(Date.parse(value));
}

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function normalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeJson(item));
  }
  if (isPlainObject(value)) {
    const next: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      next[key] = normalizeJson(value[key]);
    }
    return next;
  }
  return value;
}

function canonicalizeJson(value: unknown): string {
  return JSON.stringify(normalizeJson(value));
}

function createRequestFingerprint(
  request: DecisionAuditFeedResolvedRequest,
): string {
  return createHash("sha256")
    .update(
      canonicalizeJson({
        filter: request.filter,
        sort: request.sort,
      }),
    )
    .digest("hex");
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function normalizeEnumList<T extends string>(
  values: readonly T[] | undefined,
  allowed: readonly T[],
  field: string,
): readonly T[] {
  if (values == null) {
    return [];
  }
  const normalized = values.map((value) => value.trim() as T);
  if (normalized.some((value) => value.length === 0)) {
    throw new Error(`${field} cannot contain empty values`);
  }
  const unique = new Set(normalized);
  if (unique.size !== normalized.length) {
    throw new Error(`${field} cannot contain duplicates`);
  }
  if (!normalized.every((value) => allowed.includes(value))) {
    throw new Error(`${field} contains unsupported values`);
  }
  return [...unique].sort((left, right) => left.localeCompare(right));
}

function normalizeStringList(
  values: readonly string[] | undefined,
  field: string,
): readonly string[] {
  if (values == null) {
    return [];
  }
  const normalized = values.map((value) => value.trim());
  if (normalized.some((value) => value.length === 0)) {
    throw new Error(`${field} cannot contain empty values`);
  }
  const unique = new Set(normalized);
  if (unique.size !== normalized.length) {
    throw new Error(`${field} cannot contain duplicates`);
  }
  return [...unique].sort((left, right) => left.localeCompare(right));
}

function normalizeUuidList(
  values: readonly string[] | undefined,
  field: string,
): readonly string[] {
  const normalized = normalizeStringList(values, field);
  if (!normalized.every((value) => isUuid(value))) {
    throw new Error(`${field} must contain UUID values`);
  }
  return normalized;
}

function normalizeOptionalDate(
  value: string | undefined,
  field: string,
): string | null {
  if (value == null) {
    return null;
  }
  if (!isIsoDateTimeString(value)) {
    throw new Error(`${field} must be an ISO datetime`);
  }
  return value;
}

function normalizeTimeFilter(
  filter: DecisionAuditFeedFilter["time"],
): DecisionAuditFeedResolvedTimeFilter {
  const occurredFrom = normalizeOptionalDate(
    filter?.occurredFrom,
    "filter.time.occurredFrom",
  );
  const occurredTo = normalizeOptionalDate(
    filter?.occurredTo,
    "filter.time.occurredTo",
  );
  const appendedFrom = normalizeOptionalDate(
    filter?.appendedFrom,
    "filter.time.appendedFrom",
  );
  const appendedTo = normalizeOptionalDate(
    filter?.appendedTo,
    "filter.time.appendedTo",
  );

  if (occurredFrom != null && occurredTo != null && occurredFrom > occurredTo) {
    throw new Error(
      "filter.time.occurredFrom cannot be later than filter.time.occurredTo",
    );
  }
  if (appendedFrom != null && appendedTo != null && appendedFrom > appendedTo) {
    throw new Error(
      "filter.time.appendedFrom cannot be later than filter.time.appendedTo",
    );
  }

  return {
    occurredFrom,
    occurredTo,
    appendedFrom,
    appendedTo,
  };
}

function normalizeActorFilter(
  filter: DecisionAuditFeedFilter["actor"],
): DecisionAuditFeedResolvedActorFilter {
  return {
    actorTypes: normalizeEnumList(
      filter?.actorTypes,
      ACTOR_TYPES,
      "filter.actor.actorTypes",
    ),
    actorIds: normalizeStringList(filter?.actorIds, "filter.actor.actorIds"),
    actorRoles: normalizeStringList(
      filter?.actorRoles,
      "filter.actor.actorRoles",
    ),
  };
}

function normalizeCorrelationFilter(
  filter: DecisionAuditFeedFilter["correlation"],
): DecisionAuditFeedResolvedCorrelationFilter {
  return {
    requestIds: normalizeStringList(
      filter?.requestIds,
      "filter.correlation.requestIds",
    ),
    traceIds: normalizeStringList(
      filter?.traceIds,
      "filter.correlation.traceIds",
    ),
    correlationIds: normalizeUuidList(
      filter?.correlationIds,
      "filter.correlation.correlationIds",
    ),
    causationIds: normalizeUuidList(
      filter?.causationIds,
      "filter.correlation.causationIds",
    ),
    idempotencyKeys: normalizeStringList(
      filter?.idempotencyKeys,
      "filter.correlation.idempotencyKeys",
    ),
  };
}

function normalizeSubjectFilter(
  filter: DecisionAuditFeedFilter["subject"],
): DecisionAuditSubjectFilter | null {
  if (filter == null) {
    return null;
  }
  if (
    filter.subjectType != null &&
    !["contract", "approval", "action", "ledger"].includes(filter.subjectType)
  ) {
    throw new Error("filter.subject.subjectType is invalid");
  }
  if (filter.contractId != null && !isNonEmptyString(filter.contractId)) {
    throw new Error("filter.subject.contractId cannot be blank");
  }
  if (
    filter.contractVersion != null &&
    (!Number.isInteger(filter.contractVersion) || filter.contractVersion < 1)
  ) {
    throw new Error("filter.subject.contractVersion must be >= 1");
  }
  if (filter.approvalId != null && !isUuid(filter.approvalId)) {
    throw new Error("filter.subject.approvalId must be a UUID");
  }
  if (filter.actionId != null && !isUuid(filter.actionId)) {
    throw new Error("filter.subject.actionId must be a UUID");
  }
  if (filter.ledgerId != null && !isUuid(filter.ledgerId)) {
    throw new Error("filter.subject.ledgerId must be a UUID");
  }
  if (
    filter.revision != null &&
    (!Number.isInteger(filter.revision) || filter.revision < 1)
  ) {
    throw new Error("filter.subject.revision must be >= 1");
  }
  if (
    filter.subjectType === "contract" &&
    (filter.approvalId != null ||
      filter.actionId != null ||
      filter.ledgerId != null ||
      filter.revision != null)
  ) {
    throw new Error(
      "filter.subject.contract filters cannot target other subject ids",
    );
  }
  if (
    filter.subjectType === "approval" &&
    (filter.actionId != null ||
      filter.ledgerId != null ||
      filter.revision != null)
  ) {
    throw new Error(
      "filter.subject.approval filters cannot target other subject ids",
    );
  }
  if (
    filter.subjectType === "action" &&
    (filter.approvalId != null ||
      filter.ledgerId != null ||
      filter.revision != null)
  ) {
    throw new Error(
      "filter.subject.action filters cannot target other subject ids",
    );
  }
  if (
    filter.subjectType === "ledger" &&
    (filter.approvalId != null || filter.actionId != null)
  ) {
    throw new Error(
      "filter.subject.ledger filters cannot target other subject ids",
    );
  }
  return cloneValue(filter);
}

function normalizeDimensions(
  dimensions: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (dimensions == null) {
    return undefined;
  }
  const entries = Object.entries(dimensions)
    .map(([key, value]) => [key.trim(), value.trim()] as const)
    .sort(([left], [right]) => left.localeCompare(right));
  if (entries.some(([key, value]) => key.length === 0 || value.length === 0)) {
    throw new Error(
      "filter.scope.dimensions cannot contain blank keys or values",
    );
  }
  return Object.fromEntries(entries);
}

function normalizeScopeFilter(
  filter: DecisionAuditFeedFilter["scope"],
): DecisionAuditScopeFilter | null {
  if (filter == null) {
    return null;
  }
  if (filter.entityType != null && !ENTITY_TYPES.includes(filter.entityType)) {
    throw new Error("filter.scope.entityType is invalid");
  }
  if (filter.horizonId != null && !isNonEmptyString(filter.horizonId)) {
    throw new Error("filter.scope.horizonId cannot be blank");
  }
  if (
    filter.selectorMode != null &&
    !SELECTOR_MODES.includes(filter.selectorMode)
  ) {
    throw new Error("filter.scope.selectorMode is invalid");
  }

  const selectorIds = normalizeStringList(
    filter.selectorIds,
    "filter.scope.selectorIds",
  );
  const selectorQuery =
    filter.selectorQuery == null ? undefined : filter.selectorQuery.trim();

  if (filter.selectorQuery != null && !isNonEmptyString(selectorQuery)) {
    throw new Error("filter.scope.selectorQuery cannot be blank");
  }
  if (
    filter.selectorMode === "all" &&
    (selectorIds.length > 0 || selectorQuery != null)
  ) {
    throw new Error(
      "filter.scope.selectorMode all cannot be combined with ids or query",
    );
  }
  if (filter.selectorMode === "ids" && selectorIds.length === 0) {
    throw new Error(
      "filter.scope.selectorIds are required for selectorMode ids",
    );
  }
  if (filter.selectorMode === "query" && selectorQuery == null) {
    throw new Error(
      "filter.scope.selectorQuery is required for selectorMode query",
    );
  }
  if (
    filter.selectorMode != null &&
    filter.selectorMode !== "ids" &&
    selectorIds.length > 0
  ) {
    throw new Error("filter.scope.selectorIds require selectorMode ids");
  }
  if (
    filter.selectorMode != null &&
    filter.selectorMode !== "query" &&
    selectorQuery != null
  ) {
    throw new Error("filter.scope.selectorQuery requires selectorMode query");
  }

  return {
    entityType: filter.entityType,
    horizonId: filter.horizonId,
    selectorMode: filter.selectorMode,
    selectorIds,
    selectorQuery,
    dimensions: normalizeDimensions(filter.dimensions),
  };
}

function normalizeSort(
  sort: DecisionAuditFeedSort | undefined,
): DecisionAuditFeedSort {
  if (sort == null) {
    return cloneValue(DEFAULT_SORT);
  }
  if (!SORT_FIELDS.includes(sort.field)) {
    throw new Error("sort.field is invalid");
  }
  if (!["asc", "desc"].includes(sort.direction)) {
    throw new Error("sort.direction is invalid");
  }
  return {
    field: sort.field,
    direction: sort.direction,
  };
}

function normalizeLimit(limit: number | undefined): number {
  if (limit == null) {
    return DEFAULT_LIMIT;
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new Error(`page.limit must be an integer between 1 and ${MAX_LIMIT}`);
  }
  return limit;
}

export function resolveDecisionAuditFeedRequest(
  request: DecisionAuditFeedRequest | undefined,
): DecisionAuditFeedResolvedRequest {
  const cursor =
    request?.page?.cursor == null ? null : request.page.cursor.trim();
  if (request?.page?.cursor != null && !isNonEmptyString(cursor)) {
    throw new Error("page.cursor cannot be blank");
  }

  return {
    filter: {
      time: normalizeTimeFilter(request?.filter?.time),
      actor: normalizeActorFilter(request?.filter?.actor),
      subject: normalizeSubjectFilter(request?.filter?.subject),
      scope: normalizeScopeFilter(request?.filter?.scope),
      eventTypes: normalizeEnumList(
        request?.filter?.eventTypes,
        EVENT_TYPES,
        "filter.eventTypes",
      ),
      outcomes: normalizeEnumList(
        request?.filter?.outcomes,
        OUTCOMES,
        "filter.outcomes",
      ),
      correlation: normalizeCorrelationFilter(request?.filter?.correlation),
    },
    sort: normalizeSort(request?.sort),
    page: {
      limit: normalizeLimit(request?.page?.limit),
      cursor,
    },
  };
}

function buildCursorPointer(
  entry: DecisionAuditEntry,
): DecisionAuditFeedCursorPointer {
  return {
    entryId: entry.entryId,
    occurredAt: entry.occurredAt,
    appendedAt: entry.appendedAt,
    sequence: entry.chain.sequence,
  };
}

function isMatchingCursorEntry(
  entry: DecisionAuditEntry,
  cursor: DecisionAuditFeedCursorPointer,
): boolean {
  return (
    entry.entryId === cursor.entryId &&
    entry.occurredAt === cursor.occurredAt &&
    entry.appendedAt === cursor.appendedAt &&
    entry.chain.sequence === cursor.sequence
  );
}

export function encodeDecisionAuditFeedCursor(
  request: DecisionAuditFeedResolvedRequest,
  entry: DecisionAuditEntry,
): string {
  const payload: DecisionAuditFeedCursorPayload = {
    version: "1.0.0",
    requestFingerprint: createRequestFingerprint(request),
    sort: request.sort,
    last: buildCursorPointer(entry),
  };
  return encodeBase64Url(JSON.stringify(payload));
}

export function decodeDecisionAuditFeedCursor(
  cursor: string,
): DecisionAuditFeedCursorPayload {
  try {
    const payload = JSON.parse(
      decodeBase64Url(cursor),
    ) as DecisionAuditFeedCursorPayload;
    if (payload.version !== "1.0.0") {
      throw new Error("Decision audit feed cursor version is unsupported");
    }
    if (!SORT_FIELDS.includes(payload.sort.field)) {
      throw new Error("Decision audit feed cursor field is invalid");
    }
    if (!["asc", "desc"].includes(payload.sort.direction)) {
      throw new Error("Decision audit feed cursor direction is invalid");
    }
    if (!isUuid(payload.last.entryId)) {
      throw new Error("Decision audit feed cursor entryId must be a UUID");
    }
    if (!isIsoDateTimeString(payload.last.occurredAt)) {
      throw new Error(
        "Decision audit feed cursor occurredAt must be an ISO datetime",
      );
    }
    if (!isIsoDateTimeString(payload.last.appendedAt)) {
      throw new Error(
        "Decision audit feed cursor appendedAt must be an ISO datetime",
      );
    }
    if (!Number.isInteger(payload.last.sequence) || payload.last.sequence < 1) {
      throw new Error("Decision audit feed cursor sequence must be >= 1");
    }
    if (!isNonEmptyString(payload.requestFingerprint)) {
      throw new Error(
        "Decision audit feed cursor requestFingerprint is missing",
      );
    }
    return payload;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "cursor could not be decoded";
    throw new Error(`Invalid decision audit feed cursor: ${message}`);
  }
}

function matchesTimeFilter(
  entry: DecisionAuditEntry,
  filter: DecisionAuditFeedResolvedTimeFilter,
): boolean {
  if (filter.occurredFrom != null && entry.occurredAt < filter.occurredFrom) {
    return false;
  }
  if (filter.occurredTo != null && entry.occurredAt > filter.occurredTo) {
    return false;
  }
  if (filter.appendedFrom != null && entry.appendedAt < filter.appendedFrom) {
    return false;
  }
  if (filter.appendedTo != null && entry.appendedAt > filter.appendedTo) {
    return false;
  }
  return true;
}

function matchesActorFilter(
  entry: DecisionAuditEntry,
  filter: DecisionAuditFeedResolvedActorFilter,
): boolean {
  if (
    filter.actorTypes.length > 0 &&
    !filter.actorTypes.includes(entry.actor.actorType)
  ) {
    return false;
  }
  if (
    filter.actorIds.length > 0 &&
    !filter.actorIds.includes(entry.actor.actorId)
  ) {
    return false;
  }
  if (
    filter.actorRoles.length > 0 &&
    (entry.actor.actorRole == null ||
      !filter.actorRoles.includes(entry.actor.actorRole))
  ) {
    return false;
  }
  return true;
}

function matchesCorrelationFilter(
  entry: DecisionAuditEntry,
  filter: DecisionAuditFeedResolvedCorrelationFilter,
): boolean {
  const correlationIds = entry.correlationIds;
  if (
    filter.requestIds.length > 0 &&
    (correlationIds?.requestId == null ||
      !filter.requestIds.includes(correlationIds.requestId))
  ) {
    return false;
  }
  if (
    filter.traceIds.length > 0 &&
    (correlationIds?.traceId == null ||
      !filter.traceIds.includes(correlationIds.traceId))
  ) {
    return false;
  }
  if (
    filter.correlationIds.length > 0 &&
    (correlationIds?.correlationId == null ||
      !filter.correlationIds.includes(correlationIds.correlationId))
  ) {
    return false;
  }
  if (
    filter.causationIds.length > 0 &&
    (correlationIds?.causationId == null ||
      !filter.causationIds.includes(correlationIds.causationId))
  ) {
    return false;
  }
  if (
    filter.idempotencyKeys.length > 0 &&
    (correlationIds?.idempotencyKey == null ||
      !filter.idempotencyKeys.includes(correlationIds.idempotencyKey))
  ) {
    return false;
  }
  return true;
}

function compareString(left: string, right: string): number {
  return left.localeCompare(right);
}

function compareNumber(left: number, right: number): number {
  return left - right;
}

function compareDecisionAuditEntries(
  left: DecisionAuditEntry,
  right: DecisionAuditEntry,
  sort: DecisionAuditFeedSort,
): number {
  const direction = sort.direction === "asc" ? 1 : -1;
  const values =
    sort.field === "occurredAt"
      ? [
          compareString(left.occurredAt, right.occurredAt),
          compareString(left.appendedAt, right.appendedAt),
          compareNumber(left.chain.sequence, right.chain.sequence),
          compareString(left.entryId, right.entryId),
        ]
      : sort.field === "appendedAt"
        ? [
            compareString(left.appendedAt, right.appendedAt),
            compareString(left.occurredAt, right.occurredAt),
            compareNumber(left.chain.sequence, right.chain.sequence),
            compareString(left.entryId, right.entryId),
          ]
        : [
            compareNumber(left.chain.sequence, right.chain.sequence),
            compareString(left.appendedAt, right.appendedAt),
            compareString(left.occurredAt, right.occurredAt),
            compareString(left.entryId, right.entryId),
          ];

  for (const value of values) {
    if (value !== 0) {
      return value * direction;
    }
  }
  return 0;
}

export function filterDecisionAuditFeedEntries(
  entries: readonly DecisionAuditEntry[],
  request: DecisionAuditFeedRequest | DecisionAuditFeedResolvedRequest,
): readonly DecisionAuditEntry[] {
  const resolved = isResolvedDecisionAuditFeedRequest(request)
    ? request
    : resolveDecisionAuditFeedRequest(request);

  let filteredEntries: readonly DecisionAuditEntry[] = entries.filter(
    (entry) =>
      matchesTimeFilter(entry, resolved.filter.time) &&
      matchesActorFilter(entry, resolved.filter.actor) &&
      matchesCorrelationFilter(entry, resolved.filter.correlation) &&
      (resolved.filter.eventTypes.length === 0 ||
        resolved.filter.eventTypes.includes(entry.eventType)) &&
      (resolved.filter.outcomes.length === 0 ||
        resolved.filter.outcomes.includes(entry.outcome)),
  );

  if (resolved.filter.subject != null) {
    filteredEntries = filterDecisionAuditBySubject(
      filteredEntries,
      resolved.filter.subject,
    );
  }
  if (resolved.filter.scope != null) {
    filteredEntries = filterDecisionAuditByScope(
      filteredEntries,
      resolved.filter.scope,
    );
  }

  return filteredEntries;
}

export function sortDecisionAuditFeedEntries(
  entries: readonly DecisionAuditEntry[],
  sort: DecisionAuditFeedSort,
): readonly DecisionAuditEntry[] {
  return [...entries].sort((left, right) =>
    compareDecisionAuditEntries(left, right, sort),
  );
}

function incrementCount<T extends string>(
  counts: Partial<Record<T, number>>,
  key: T,
): void {
  counts[key] = (counts[key] ?? 0) + 1;
}

export function buildDecisionAuditFeedPageSummary(
  entries: readonly DecisionAuditEntry[],
): DecisionAuditFeedPageSummary {
  const eventTypeCounts: Partial<Record<DecisionAuditEventType, number>> = {};
  const outcomeCounts: Partial<Record<DecisionAuditOutcome, number>> = {};
  const actorTypeCounts: Partial<Record<DecisionAuditFeedActorType, number>> =
    {};
  const correlationCoverage: DecisionAuditFeedCorrelationCoverage = {
    withRequestId: 0,
    withTraceId: 0,
    withCorrelationId: 0,
    withCausationId: 0,
    withIdempotencyKey: 0,
  };

  for (const entry of entries) {
    incrementCount(eventTypeCounts, entry.eventType);
    incrementCount(outcomeCounts, entry.outcome);
    incrementCount(actorTypeCounts, entry.actor.actorType);
    if (entry.correlationIds?.requestId != null) {
      correlationCoverage.withRequestId += 1;
    }
    if (entry.correlationIds?.traceId != null) {
      correlationCoverage.withTraceId += 1;
    }
    if (entry.correlationIds?.correlationId != null) {
      correlationCoverage.withCorrelationId += 1;
    }
    if (entry.correlationIds?.causationId != null) {
      correlationCoverage.withCausationId += 1;
    }
    if (entry.correlationIds?.idempotencyKey != null) {
      correlationCoverage.withIdempotencyKey += 1;
    }
  }

  const occurred = entries.map((entry) => entry.occurredAt).sort(compareString);
  const appended = entries.map((entry) => entry.appendedAt).sort(compareString);

  return {
    eventTypeCounts,
    outcomeCounts,
    actorTypeCounts,
    earliestOccurredAt: occurred[0] ?? null,
    latestOccurredAt: occurred.at(-1) ?? null,
    earliestAppendedAt: appended[0] ?? null,
    latestAppendedAt: appended.at(-1) ?? null,
    correlationCoverage,
  };
}

export function buildDecisionAuditFeedChainSummary(
  entries: readonly DecisionAuditEntry[],
): DecisionAuditFeedChainSummary {
  const ordered = [...entries].sort(
    (left, right) =>
      compareNumber(left.chain.sequence, right.chain.sequence) ||
      compareString(left.entryId, right.entryId),
  );
  const gaps: DecisionAuditFeedChainGap[] = [];

  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const next = ordered[index];
    if (previous == null || next == null) {
      continue;
    }
    if (next.chain.sequence !== previous.chain.sequence + 1) {
      gaps.push({
        previousEntryId: previous.entryId,
        nextEntryId: next.entryId,
        previousSequence: previous.chain.sequence,
        nextSequence: next.chain.sequence,
        previousEntryHash: previous.chain.entryHash,
        nextPreviousEntryHash: next.chain.previousEntryHash,
        reason: "sequence_gap",
      });
      continue;
    }
    if (next.chain.previousEntryHash !== previous.chain.entryHash) {
      gaps.push({
        previousEntryId: previous.entryId,
        nextEntryId: next.entryId,
        previousSequence: previous.chain.sequence,
        nextSequence: next.chain.sequence,
        previousEntryHash: previous.chain.entryHash,
        nextPreviousEntryHash: next.chain.previousEntryHash,
        reason: "hash_gap",
      });
    }
  }

  return {
    entryCount: ordered.length,
    firstSequence: ordered[0]?.chain.sequence ?? null,
    lastSequence: ordered.at(-1)?.chain.sequence ?? null,
    firstEntryHash: ordered[0]?.chain.entryHash ?? null,
    lastEntryHash: ordered.at(-1)?.chain.entryHash ?? null,
    isContinuous: gaps.length === 0,
    gapCount: gaps.length,
    gaps,
  };
}

function paginateDecisionAuditFeedEntries(
  entries: readonly DecisionAuditEntry[],
  request: DecisionAuditFeedResolvedRequest,
): {
  matched: number;
  pageEntries: readonly DecisionAuditEntry[];
  hasMore: boolean;
  nextCursor: string | null;
} {
  const matched = entries.length;
  const sorted = sortDecisionAuditFeedEntries(entries, request.sort);
  let startIndex = 0;

  if (request.page.cursor != null) {
    const decoded = decodeDecisionAuditFeedCursor(request.page.cursor);
    if (decoded.requestFingerprint !== createRequestFingerprint(request)) {
      throw new Error(
        "Decision audit feed cursor does not match the current request",
      );
    }
    if (
      decoded.sort.field !== request.sort.field ||
      decoded.sort.direction !== request.sort.direction
    ) {
      throw new Error(
        "Decision audit feed cursor sort does not match the current request",
      );
    }
    const cursorIndex = sorted.findIndex((entry) =>
      isMatchingCursorEntry(entry, decoded.last),
    );
    if (cursorIndex < 0) {
      throw new Error(
        "Decision audit feed cursor does not match the filtered result set",
      );
    }
    startIndex = cursorIndex + 1;
  }

  const pageEntries = sorted.slice(startIndex, startIndex + request.page.limit);
  const hasMore = startIndex + request.page.limit < matched;
  const lastEntry = pageEntries.at(-1);

  return {
    matched,
    pageEntries,
    hasMore,
    nextCursor:
      hasMore && lastEntry != null
        ? encodeDecisionAuditFeedCursor(request, lastEntry)
        : null,
  };
}

export function buildDecisionAuditFeedResponse(
  entries: readonly DecisionAuditEntry[],
  request: DecisionAuditFeedRequest | DecisionAuditFeedResolvedRequest,
): DecisionAuditFeedResponse {
  const resolved = isResolvedDecisionAuditFeedRequest(request)
    ? request
    : resolveDecisionAuditFeedRequest(request);
  const filteredEntries = filterDecisionAuditFeedEntries(entries, resolved);
  const { matched, pageEntries, hasMore, nextCursor } =
    paginateDecisionAuditFeedEntries(filteredEntries, resolved);

  return {
    request: resolved,
    page: {
      matched,
      returned: pageEntries.length,
      limit: resolved.page.limit,
      hasMore,
      nextCursor,
    },
    entries: pageEntries,
    pageSummary: buildDecisionAuditFeedPageSummary(pageEntries),
    chainSummary: buildDecisionAuditFeedChainSummary(pageEntries),
  };
}
