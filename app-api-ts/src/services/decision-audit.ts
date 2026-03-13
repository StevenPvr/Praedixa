import { createHash } from "node:crypto";

import type {
  DecisionAuditActor,
  DecisionAuditEntry,
  DecisionAuditEntryInput,
  DecisionAuditEventType,
  DecisionAuditIntegrityIssue,
  DecisionAuditOutcome,
  DecisionAuditScopeFilter,
  DecisionAuditSubject,
  DecisionAuditSubjectFilter,
} from "@praedixa/shared-types/domain";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATETIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})Z$/;
const HEX_DIGEST_PATTERN = /^[0-9a-f]{64}$/i;
const REASON_CODE_PATTERN = /^[a-z0-9][a-z0-9_.:-]{1,127}$/;
const FIELD_PATH_PATTERN = /^[A-Za-z0-9_][A-Za-z0-9_.:[\]-]{0,255}$/;

const EVENT_DEFINITIONS: Record<
  DecisionAuditEventType,
  {
    subjectType: DecisionAuditSubject["subjectType"];
    outcome: DecisionAuditOutcome;
  }
> = {
  "contract.published": {
    subjectType: "contract",
    outcome: "succeeded",
  },
  "contract.rolled_back": {
    subjectType: "contract",
    outcome: "succeeded",
  },
  "approval.granted": {
    subjectType: "approval",
    outcome: "succeeded",
  },
  "approval.rejected": {
    subjectType: "approval",
    outcome: "rejected",
  },
  "action.dispatched": {
    subjectType: "action",
    outcome: "succeeded",
  },
  "action.failed": {
    subjectType: "action",
    outcome: "failed",
  },
  "action.retried": {
    subjectType: "action",
    outcome: "succeeded",
  },
  "action.canceled": {
    subjectType: "action",
    outcome: "canceled",
  },
  "ledger.recalculated": {
    subjectType: "ledger",
    outcome: "succeeded",
  },
  "ledger.validated": {
    subjectType: "ledger",
    outcome: "succeeded",
  },
  "ledger.contested": {
    subjectType: "ledger",
    outcome: "contested",
  },
};

const ALLOWED_INITIAL_EVENTS = new Set<DecisionAuditEventType>([
  "contract.published",
  "approval.granted",
  "approval.rejected",
  "action.dispatched",
  "action.failed",
  "action.canceled",
  "ledger.recalculated",
  "ledger.validated",
  "ledger.contested",
]);

const ALLOWED_NEXT_EVENTS: Record<
  DecisionAuditEventType,
  readonly DecisionAuditEventType[]
> = {
  "contract.published": ["contract.rolled_back"],
  "contract.rolled_back": [],
  "approval.granted": [],
  "approval.rejected": [],
  "action.dispatched": ["action.failed", "action.canceled"],
  "action.failed": ["action.retried", "action.canceled"],
  "action.retried": ["action.dispatched", "action.failed", "action.canceled"],
  "action.canceled": [],
  "ledger.recalculated": [
    "ledger.recalculated",
    "ledger.validated",
    "ledger.contested",
  ],
  "ledger.validated": [],
  "ledger.contested": [],
};

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function normalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) =>
      item === undefined ? null : normalizeJson(item),
    );
  }

  if (isPlainObject(value)) {
    const next: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      const normalized = normalizeJson(value[key]);
      if (normalized !== undefined) {
        next[key] = normalized;
      }
    }
    return next;
  }

  return value;
}

function canonicalizeJson(value: unknown): string {
  return JSON.stringify(normalizeJson(value));
}

function hashCanonicalValue(value: unknown): string {
  return createHash("sha256").update(canonicalizeJson(value)).digest("hex");
}

function isNonEmptyString(value: string | undefined | null): value is string {
  return (value?.trim().length ?? 0) > 0;
}

function isIsoDateTimeString(value: string): boolean {
  return ISO_DATETIME_PATTERN.test(value) && !Number.isNaN(Date.parse(value));
}

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function isDigest(value: string | undefined): boolean {
  return value != null && HEX_DIGEST_PATTERN.test(value);
}

function hasUniqueChangedFields(entry: DecisionAuditEntryInput): boolean {
  const seen = new Set<string>();
  for (const change of entry.diff.changedFields) {
    const key = `${change.fieldPath}:${change.changeType}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
  }
  return true;
}

function normalizeChangedFields(
  entry: DecisionAuditEntryInput,
): DecisionAuditEntryInput["diff"]["changedFields"] {
  return [...entry.diff.changedFields]
    .map((change) => ({ ...change }))
    .sort((left, right) => {
      const pathOrder = left.fieldPath.localeCompare(right.fieldPath);
      return pathOrder !== 0
        ? pathOrder
        : left.changeType.localeCompare(right.changeType);
    });
}

function getSubjectKey(subject: DecisionAuditSubject): string {
  switch (subject.subjectType) {
    case "contract":
      return `contract:${subject.contractId}:v${subject.contractVersion}`;
    case "approval":
      return `approval:${subject.approvalId}`;
    case "action":
      return `action:${subject.actionId}`;
    case "ledger":
      return `ledger:${subject.ledgerId}:r${subject.revision}`;
  }
}

function buildHashMaterial(
  entry: Omit<DecisionAuditEntry, "chain">,
  sequence: number,
  previousEntryHash?: string,
): Record<string, unknown> {
  return {
    ...entry,
    chain: {
      sequence,
      previousEntryHash,
    },
  };
}

function createIntegrityIssue(
  code: DecisionAuditIntegrityIssue["code"],
  entryId: string,
  message: string,
): DecisionAuditIntegrityIssue {
  return {
    code,
    entryId,
    message,
  };
}

function validateActor(actor: DecisionAuditActor): string | undefined {
  if (!isNonEmptyString(actor.actorId)) {
    return "Decision audit actorId cannot be empty";
  }
  if (actor.actorType === "user" && !isUuid(actor.actorId)) {
    return "Decision audit user actorId must be a UUID";
  }
  if (actor.actorRole != null && !isNonEmptyString(actor.actorRole)) {
    return "Decision audit actorRole cannot be blank";
  }
  return undefined;
}

function validateSubject(subject: DecisionAuditSubject): string | undefined {
  if (!isNonEmptyString(subject.contractId)) {
    return "Decision audit contractId cannot be empty";
  }
  if (
    !Number.isInteger(subject.contractVersion) ||
    subject.contractVersion < 1
  ) {
    return "Decision audit contractVersion must be >= 1";
  }

  if (subject.subjectType === "approval" && !isUuid(subject.approvalId)) {
    return "Decision audit approvalId must be a UUID";
  }
  if (subject.subjectType === "action" && !isUuid(subject.actionId)) {
    return "Decision audit actionId must be a UUID";
  }
  if (subject.subjectType === "ledger") {
    if (!isUuid(subject.ledgerId)) {
      return "Decision audit ledgerId must be a UUID";
    }
    if (!Number.isInteger(subject.revision) || subject.revision < 1) {
      return "Decision audit ledger revision must be >= 1";
    }
  }

  return undefined;
}

function validateReason(entry: DecisionAuditEntryInput): string | undefined {
  if (!REASON_CODE_PATTERN.test(entry.reason.code)) {
    return "Decision audit reason code is invalid";
  }
  if (entry.reason.detail != null && !isNonEmptyString(entry.reason.detail)) {
    return "Decision audit reason detail cannot be blank";
  }
  return undefined;
}

function validateDiff(entry: DecisionAuditEntryInput): string | undefined {
  if (entry.diff.changedFields.length === 0) {
    return "Decision audit diff summary requires at least one changed field";
  }
  if (!hasUniqueChangedFields(entry)) {
    return "Decision audit diff summary contains duplicate field changes";
  }

  for (const change of entry.diff.changedFields) {
    if (!FIELD_PATH_PATTERN.test(change.fieldPath)) {
      return `Decision audit field path ${change.fieldPath} is invalid`;
    }
    if (change.beforeDigest != null && !isDigest(change.beforeDigest)) {
      return `Decision audit beforeDigest for ${change.fieldPath} is invalid`;
    }
    if (change.afterDigest != null && !isDigest(change.afterDigest)) {
      return `Decision audit afterDigest for ${change.fieldPath} is invalid`;
    }
  }

  return undefined;
}

function validatePayloadRef(
  entry: DecisionAuditEntryInput,
): string | undefined {
  const { payloadRef } = entry;
  if (!isNonEmptyString(payloadRef.reference)) {
    return "Decision audit payload reference cannot be empty";
  }
  if (payloadRef.canonicalization !== "json-c14n/v1") {
    return "Decision audit canonicalization must be json-c14n/v1";
  }
  if (payloadRef.hashAlgorithm !== "sha256") {
    return "Decision audit hash algorithm must be sha256";
  }
  if (!isDigest(payloadRef.digest)) {
    return "Decision audit payload digest must be a sha256 hex digest";
  }
  if (!Number.isInteger(payloadRef.byteLength) || payloadRef.byteLength < 1) {
    return "Decision audit payload byteLength must be >= 1";
  }
  return undefined;
}

function validateCorrelationIds(
  entry: DecisionAuditEntryInput,
): string | undefined {
  const { correlationIds } = entry;
  if (correlationIds == null) {
    return undefined;
  }
  if (
    correlationIds.requestId != null &&
    !isNonEmptyString(correlationIds.requestId)
  ) {
    return "Decision audit requestId cannot be blank";
  }
  if (
    correlationIds.traceId != null &&
    !isNonEmptyString(correlationIds.traceId)
  ) {
    return "Decision audit traceId cannot be blank";
  }
  if (
    correlationIds.idempotencyKey != null &&
    !isNonEmptyString(correlationIds.idempotencyKey)
  ) {
    return "Decision audit idempotencyKey cannot be blank";
  }
  if (
    correlationIds.correlationId != null &&
    !isUuid(correlationIds.correlationId)
  ) {
    return "Decision audit correlationId must be a UUID";
  }
  if (
    correlationIds.causationId != null &&
    !isUuid(correlationIds.causationId)
  ) {
    return "Decision audit causationId must be a UUID";
  }
  return undefined;
}

function validateTimestamps(
  entry: DecisionAuditEntryInput,
): string | undefined {
  if (!isIsoDateTimeString(entry.occurredAt)) {
    return "Decision audit occurredAt must be an ISO datetime";
  }
  if (!isIsoDateTimeString(entry.appendedAt)) {
    return "Decision audit appendedAt must be an ISO datetime";
  }
  if (entry.appendedAt < entry.occurredAt) {
    return "Decision audit appendedAt cannot precede occurredAt";
  }
  return undefined;
}

function validateEventAlignment(
  entry: DecisionAuditEntryInput,
): string | undefined {
  const rule = EVENT_DEFINITIONS[entry.eventType];
  if (rule.subjectType !== entry.subject.subjectType) {
    return `Decision audit event ${entry.eventType} cannot target subject ${entry.subject.subjectType}`;
  }
  if (rule.outcome !== entry.outcome) {
    return `Decision audit event ${entry.eventType} requires outcome ${rule.outcome}`;
  }
  return undefined;
}

function assertEntryInput(entry: DecisionAuditEntryInput): void {
  if (!isUuid(entry.entryId)) {
    throw new Error("Decision audit entryId must be a UUID");
  }

  const checks = [
    validateActor(entry.actor),
    validateSubject(entry.subject),
    validateReason(entry),
    validateDiff(entry),
    validatePayloadRef(entry),
    validateCorrelationIds(entry),
    validateTimestamps(entry),
    validateEventAlignment(entry),
  ];

  const firstFailure = checks.find((value) => value != null);
  if (firstFailure != null) {
    throw new Error(firstFailure);
  }
}

function materializeEntry(
  input: DecisionAuditEntryInput,
  sequence: number,
  previousEntryHash?: string,
): DecisionAuditEntry {
  const cloned = cloneValue(input);
  const entryWithoutChain: Omit<DecisionAuditEntry, "chain"> = {
    kind: "DecisionAuditEntry",
    schemaVersion: "1.0.0",
    ...cloned,
    diff: {
      changedFields: normalizeChangedFields(cloned),
    },
  };
  const entryHash = hashCanonicalValue(
    buildHashMaterial(entryWithoutChain, sequence, previousEntryHash),
  );

  return {
    ...entryWithoutChain,
    chain: {
      sequence,
      previousEntryHash,
      entryHash,
    },
  };
}

function matchesSubjectFilter(
  entry: DecisionAuditEntry,
  filter: DecisionAuditSubjectFilter,
): boolean {
  if (
    filter.subjectType != null &&
    entry.subject.subjectType !== filter.subjectType
  ) {
    return false;
  }
  if (
    filter.contractId != null &&
    entry.subject.contractId !== filter.contractId
  ) {
    return false;
  }
  if (
    filter.contractVersion != null &&
    entry.subject.contractVersion !== filter.contractVersion
  ) {
    return false;
  }
  if (
    filter.approvalId != null &&
    (entry.subject.subjectType !== "approval" ||
      entry.subject.approvalId !== filter.approvalId)
  ) {
    return false;
  }
  if (
    filter.actionId != null &&
    (entry.subject.subjectType !== "action" ||
      entry.subject.actionId !== filter.actionId)
  ) {
    return false;
  }
  if (
    filter.ledgerId != null &&
    (entry.subject.subjectType !== "ledger" ||
      entry.subject.ledgerId !== filter.ledgerId)
  ) {
    return false;
  }
  if (
    filter.revision != null &&
    (entry.subject.subjectType !== "ledger" ||
      entry.subject.revision !== filter.revision)
  ) {
    return false;
  }
  return true;
}

function matchesScopeFilter(
  entry: DecisionAuditEntry,
  filter: DecisionAuditScopeFilter,
): boolean {
  if (
    filter.entityType != null &&
    entry.scope.entityType !== filter.entityType
  ) {
    return false;
  }
  if (filter.horizonId != null && entry.scope.horizonId !== filter.horizonId) {
    return false;
  }
  if (
    filter.selectorMode != null &&
    entry.scope.selector.mode !== filter.selectorMode
  ) {
    return false;
  }
  if (
    filter.selectorQuery != null &&
    entry.scope.selector.query !== filter.selectorQuery
  ) {
    return false;
  }
  if (filter.selectorIds != null) {
    const entryIds = entry.scope.selector.ids ?? [];
    if (!filter.selectorIds.every((value) => entryIds.includes(value))) {
      return false;
    }
  }
  if (filter.dimensions != null) {
    for (const [key, value] of Object.entries(filter.dimensions)) {
      if (entry.scope.dimensions?.[key] !== value) {
        return false;
      }
    }
  }
  return true;
}

function validateChainEntry(
  entry: DecisionAuditEntry,
  index: number,
  previousEntry?: DecisionAuditEntry,
): DecisionAuditIntegrityIssue[] {
  const issues: DecisionAuditIntegrityIssue[] = [];
  const expectedSequence = index + 1;

  if (entry.kind !== "DecisionAuditEntry" || entry.schemaVersion !== "1.0.0") {
    issues.push(
      createIntegrityIssue(
        "INVALID_ENTRY",
        entry.entryId,
        "Decision audit entry kind or schemaVersion is invalid",
      ),
    );
  }

  if (entry.chain.sequence !== expectedSequence) {
    issues.push(
      createIntegrityIssue(
        "INVALID_SEQUENCE",
        entry.entryId,
        `Decision audit sequence ${entry.chain.sequence} does not match expected ${expectedSequence}`,
      ),
    );
  }

  const expectedPreviousHash = previousEntry?.chain.entryHash;
  if (entry.chain.previousEntryHash !== expectedPreviousHash) {
    issues.push(
      createIntegrityIssue(
        "INVALID_CHAIN",
        entry.entryId,
        "Decision audit previousEntryHash does not match the prior entry hash",
      ),
    );
  }

  const expectedHash = hashCanonicalValue(
    buildHashMaterial(
      {
        ...entry,
        chain: undefined,
      } as Omit<DecisionAuditEntry, "chain">,
      entry.chain.sequence,
      entry.chain.previousEntryHash,
    ),
  );

  if (entry.chain.entryHash !== expectedHash) {
    issues.push(
      createIntegrityIssue(
        "INVALID_CHAIN",
        entry.entryId,
        "Decision audit entryHash does not match the canonical payload",
      ),
    );
  }

  return issues;
}

function validateMaterializedEntry(
  entry: DecisionAuditEntry,
): DecisionAuditIntegrityIssue[] {
  try {
    assertEntryInput({
      entryId: entry.entryId,
      eventType: entry.eventType,
      actor: entry.actor,
      subject: entry.subject,
      scope: entry.scope,
      outcome: entry.outcome,
      reason: entry.reason,
      diff: entry.diff,
      correlationIds: entry.correlationIds,
      payloadRef: entry.payloadRef,
      occurredAt: entry.occurredAt,
      appendedAt: entry.appendedAt,
    });
    return [];
  } catch (error) {
    return [
      createIntegrityIssue(
        "INVALID_ENTRY",
        entry.entryId,
        error instanceof Error
          ? error.message
          : "Decision audit entry is invalid",
      ),
    ];
  }
}

function getSubjectTransitionIssue(
  previousEntry: DecisionAuditEntry | undefined,
  nextEntry: DecisionAuditEntry,
): DecisionAuditIntegrityIssue | undefined {
  if (previousEntry == null) {
    if (!ALLOWED_INITIAL_EVENTS.has(nextEntry.eventType)) {
      return createIntegrityIssue(
        "INCOHERENT_TERMINAL_EVENT",
        nextEntry.entryId,
        `Decision audit event ${nextEntry.eventType} cannot start a ${nextEntry.subject.subjectType} stream`,
      );
    }
    return undefined;
  }

  const allowedNext = ALLOWED_NEXT_EVENTS[previousEntry.eventType];
  if (!allowedNext.includes(nextEntry.eventType)) {
    return createIntegrityIssue(
      "INCOHERENT_TERMINAL_EVENT",
      nextEntry.entryId,
      `Decision audit event ${nextEntry.eventType} is incoherent after ${previousEntry.eventType}`,
    );
  }

  return undefined;
}

export function createDecisionAuditEntry(
  input: DecisionAuditEntryInput,
  previousEntry?: DecisionAuditEntry,
): DecisionAuditEntry {
  assertEntryInput(input);
  const sequence = (previousEntry?.chain.sequence ?? 0) + 1;
  return materializeEntry(input, sequence, previousEntry?.chain.entryHash);
}

export function appendDecisionAuditEntry(
  entries: readonly DecisionAuditEntry[],
  input: DecisionAuditEntryInput,
): readonly DecisionAuditEntry[] {
  const nextEntry = createDecisionAuditEntry(
    input,
    entries[entries.length - 1],
  );
  const nextEntries = [...entries, nextEntry];
  assertDecisionAuditIntegrity(nextEntries);
  return nextEntries;
}

export function filterDecisionAuditBySubject(
  entries: readonly DecisionAuditEntry[],
  filter: DecisionAuditSubjectFilter,
): readonly DecisionAuditEntry[] {
  return entries.filter((entry) => matchesSubjectFilter(entry, filter));
}

export function filterDecisionAuditByScope(
  entries: readonly DecisionAuditEntry[],
  filter: DecisionAuditScopeFilter,
): readonly DecisionAuditEntry[] {
  return entries.filter((entry) => matchesScopeFilter(entry, filter));
}

export function findIncoherentTerminalDecisionAuditEvent(
  entries: readonly DecisionAuditEntry[],
): DecisionAuditIntegrityIssue | undefined {
  const lastBySubject = new Map<string, DecisionAuditEntry>();

  for (const entry of entries) {
    const subjectKey = getSubjectKey(entry.subject);
    const issue = getSubjectTransitionIssue(
      lastBySubject.get(subjectKey),
      entry,
    );
    if (issue != null) {
      return issue;
    }
    lastBySubject.set(subjectKey, entry);
  }

  return undefined;
}

export function listDecisionAuditIntegrityIssues(
  entries: readonly DecisionAuditEntry[],
): readonly DecisionAuditIntegrityIssue[] {
  const issues: DecisionAuditIntegrityIssue[] = [];

  entries.forEach((entry, index) => {
    issues.push(...validateMaterializedEntry(entry));
    issues.push(...validateChainEntry(entry, index, entries[index - 1]));
  });

  const terminalIssue = findIncoherentTerminalDecisionAuditEvent(entries);
  if (terminalIssue != null) {
    issues.push(terminalIssue);
  }

  return issues;
}

export function assertDecisionAuditIntegrity(
  entries: readonly DecisionAuditEntry[],
): void {
  const issues = listDecisionAuditIntegrityIssues(entries);
  if (issues.length === 0) {
    return;
  }

  throw new Error(issues[0]!.message);
}
