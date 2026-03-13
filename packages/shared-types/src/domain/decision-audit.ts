import type { ISODateTimeString, UUID } from "../utils/common.js";
import type { DecisionScope } from "./decision-contract.js";

export type DecisionAuditActor =
  | {
      actorType: "user";
      actorId: UUID;
      actorRole?: string;
    }
  | {
      actorType: "system" | "service";
      actorId: string;
      actorRole?: string;
    };

export type DecisionAuditSubject =
  | {
      subjectType: "contract";
      contractId: string;
      contractVersion: number;
    }
  | {
      subjectType: "approval";
      approvalId: UUID;
      contractId: string;
      contractVersion: number;
    }
  | {
      subjectType: "action";
      actionId: UUID;
      contractId: string;
      contractVersion: number;
    }
  | {
      subjectType: "ledger";
      ledgerId: UUID;
      revision: number;
      contractId: string;
      contractVersion: number;
    };

export type DecisionAuditEventType =
  | "contract.published"
  | "contract.rolled_back"
  | "approval.granted"
  | "approval.rejected"
  | "action.dispatched"
  | "action.failed"
  | "action.retried"
  | "action.canceled"
  | "ledger.recalculated"
  | "ledger.validated"
  | "ledger.contested";

export type DecisionAuditOutcome =
  | "succeeded"
  | "rejected"
  | "failed"
  | "canceled"
  | "contested";

export type DecisionAuditDiffChangeType =
  | "set"
  | "unset"
  | "replace"
  | "increment";

export interface DecisionAuditReason {
  code: string;
  detail?: string;
}

export interface DecisionAuditDiffField {
  fieldPath: string;
  changeType: DecisionAuditDiffChangeType;
  beforeDigest?: string;
  afterDigest?: string;
}

export interface DecisionAuditDiffSummary {
  changedFields: readonly DecisionAuditDiffField[];
}

export interface DecisionAuditCorrelationIds {
  requestId?: string;
  traceId?: string;
  correlationId?: UUID;
  causationId?: UUID;
  idempotencyKey?: string;
}

export interface DecisionAuditPayloadRef {
  reference: string;
  canonicalization: "json-c14n/v1";
  hashAlgorithm: "sha256";
  digest: string;
  byteLength: number;
}

export interface DecisionAuditChain {
  sequence: number;
  previousEntryHash?: string;
  entryHash: string;
}

export interface DecisionAuditEntry {
  kind: "DecisionAuditEntry";
  schemaVersion: "1.0.0";
  entryId: UUID;
  eventType: DecisionAuditEventType;
  actor: DecisionAuditActor;
  subject: DecisionAuditSubject;
  scope: DecisionScope;
  outcome: DecisionAuditOutcome;
  reason: DecisionAuditReason;
  diff: DecisionAuditDiffSummary;
  correlationIds?: DecisionAuditCorrelationIds;
  payloadRef: DecisionAuditPayloadRef;
  occurredAt: ISODateTimeString;
  appendedAt: ISODateTimeString;
  chain: DecisionAuditChain;
}

export interface DecisionAuditEntryInput {
  entryId: UUID;
  eventType: DecisionAuditEventType;
  actor: DecisionAuditActor;
  subject: DecisionAuditSubject;
  scope: DecisionScope;
  outcome: DecisionAuditOutcome;
  reason: DecisionAuditReason;
  diff: DecisionAuditDiffSummary;
  correlationIds?: DecisionAuditCorrelationIds;
  payloadRef: DecisionAuditPayloadRef;
  occurredAt: ISODateTimeString;
  appendedAt: ISODateTimeString;
}

export interface DecisionAuditSubjectFilter {
  subjectType?: DecisionAuditSubject["subjectType"];
  contractId?: string;
  contractVersion?: number;
  approvalId?: UUID;
  actionId?: UUID;
  ledgerId?: UUID;
  revision?: number;
}

export interface DecisionAuditScopeFilter {
  entityType?: DecisionScope["entityType"];
  horizonId?: string;
  selectorMode?: DecisionScope["selector"]["mode"];
  selectorIds?: readonly string[];
  selectorQuery?: string;
  dimensions?: Record<string, string>;
}

export type DecisionAuditIntegrityCode =
  | "INVALID_ENTRY"
  | "INVALID_SEQUENCE"
  | "INVALID_CHAIN"
  | "INVALID_EVENT_SUBJECT"
  | "INVALID_EVENT_OUTCOME"
  | "INCOHERENT_TERMINAL_EVENT";

export interface DecisionAuditIntegrityIssue {
  code: DecisionAuditIntegrityCode;
  entryId: UUID;
  message: string;
}
