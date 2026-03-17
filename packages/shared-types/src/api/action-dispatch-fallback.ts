import type {
  ActionDispatchStatus,
  ActionFallbackChannel,
  ActionFallbackStatus,
} from "../domain/action-dispatch.js";
import type { LedgerStatus } from "../domain/ledger.js";
import type { ISODateTimeString, UUID } from "../utils/common.js";

export type ActionDispatchFallbackOperation = "prepare" | "execute";

export interface ActionDispatchFallbackPrepareRequest {
  operation: "prepare";
  reasonCode: string;
  comment?: string;
  occurredAt?: ISODateTimeString;
  channel: ActionFallbackChannel;
  reference?: string;
}

export interface ActionDispatchFallbackExecuteRequest {
  operation: "execute";
  reasonCode: string;
  comment?: string;
  occurredAt?: ISODateTimeString;
}

export type ActionDispatchFallbackRequest =
  | ActionDispatchFallbackPrepareRequest
  | ActionDispatchFallbackExecuteRequest;

export interface ActionDispatchFallbackResponse {
  actionId: UUID;
  recommendationId: UUID;
  occurredAt: ISODateTimeString;
  actionStatus: ActionDispatchStatus;
  fallbackStatus: ActionFallbackStatus;
  fallbackPreparedAt?: ISODateTimeString;
  fallbackExecutedAt?: ISODateTimeString;
  ledgerStatus: LedgerStatus | null;
  retryEligible: boolean;
}
