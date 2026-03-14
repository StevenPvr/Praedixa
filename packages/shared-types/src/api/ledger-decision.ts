import type {
  LedgerMetricValue,
  LedgerRoiComponent,
  LedgerStatus,
  LedgerValidationStatus,
} from "../domain/ledger.js";
import type { LedgerDetailExportFormat } from "./ledger-detail.js";
import type { ISODateTimeString, UUID } from "../utils/common.js";

export interface LedgerDecisionActualSnapshotInput {
  recordedAt?: ISODateTimeString;
  values: Record<string, LedgerMetricValue>;
}

export interface LedgerDecisionRoiComponentInput extends Pick<
  LedgerRoiComponent,
  "key" | "label" | "kind" | "value" | "validationStatus"
> {}

export type LedgerDecisionRequest =
  | {
      operation: "close" | "recalculate";
      reasonCode: string;
      comment?: string;
      occurredAt?: ISODateTimeString;
      actual: LedgerDecisionActualSnapshotInput;
      roi: {
        currency?: string;
        validationStatus: LedgerValidationStatus;
        components: readonly LedgerDecisionRoiComponentInput[];
      };
    }
  | {
      operation: "validate";
      reasonCode: string;
      comment?: string;
      occurredAt?: ISODateTimeString;
      validationStatus: LedgerValidationStatus;
    };

export interface LedgerDecisionResponse {
  ledgerId: UUID;
  recommendationId: UUID;
  operation: LedgerDecisionRequest["operation"];
  occurredAt: ISODateTimeString;
  selectedRevision: number;
  latestRevision: number;
  status: LedgerStatus;
  validationStatus: LedgerValidationStatus;
  exportReadyFormats: readonly LedgerDetailExportFormat[];
}
