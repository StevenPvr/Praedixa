import type {
  ActionDispatchAttemptStatus,
  ActionDispatchStatus,
  ActionFallbackStatus,
} from "../domain/action-dispatch.js";
import type { LedgerStatus } from "../domain/ledger.js";
import type { ISODateTimeString, UUID } from "../utils/common.js";

export type ActionDispatchDecisionOutcome =
  | "dispatched"
  | "acknowledged"
  | "failed"
  | "retried"
  | "canceled";

export interface ActionDispatchDecisionRequest {
  outcome: ActionDispatchDecisionOutcome;
  reasonCode: string;
  comment?: string;
  occurredAt?: ISODateTimeString;
  latencyMs?: number;
  targetReference?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface ActionDispatchDecisionResponse {
  actionId: UUID;
  recommendationId: UUID;
  occurredAt: ISODateTimeString;
  actionStatus: ActionDispatchStatus;
  latestAttemptStatus: ActionDispatchAttemptStatus | null;
  ledgerStatus: LedgerStatus | null;
  fallbackStatus: ActionFallbackStatus | null;
  retryEligible: boolean;
}
