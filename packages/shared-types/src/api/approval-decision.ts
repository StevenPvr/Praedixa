import type { ActionDispatchStatus } from "../domain/action-dispatch.js";
import type { LedgerStatus } from "../domain/ledger.js";
import type { ApprovalInboxItem } from "./approval-inbox.js";
import type { ISODateTimeString, UUID } from "../utils/common.js";

export type ApprovalDecisionOutcome = "granted" | "rejected";

export interface ApprovalDecisionRequest {
  outcome: ApprovalDecisionOutcome;
  reasonCode: string;
  comment?: string;
  decidedAt?: ISODateTimeString;
}

export interface ApprovalDecisionResponse {
  approval: ApprovalInboxItem;
  recommendationId: UUID;
  allApprovalsGranted: boolean;
  allApprovalsResolved: boolean;
  actionStatus: ActionDispatchStatus | null;
  ledgerStatus: LedgerStatus | null;
}
