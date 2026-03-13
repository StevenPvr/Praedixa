import type {
  ActionTemplateRef,
  ActionDispatchRetryPolicy,
  ActionFallbackChannel,
} from "./action-dispatch.js";
import type { DecisionApprovalRequirement } from "./decision-contract.js";

export type ActionTemplateStatus = "active" | "deprecated";

export type ActionTemplatePayloadKind =
  | "string"
  | "integer"
  | "number"
  | "boolean"
  | "enum"
  | "object"
  | "array";

export type ActionTemplatePayloadFormat =
  | "date"
  | "iso_datetime"
  | "uuid"
  | "uri";

export type ActionTemplateDryRunMode =
  | "payload_preview"
  | "connector_validation"
  | "sandbox_dispatch";

export type ActionTemplateIdempotencyMode = "required" | "optional";

export type ActionTemplateIdempotencyScope =
  | "action"
  | "recommendation"
  | "contract_version"
  | "payload_hash";

export interface ActionTemplatePayloadSchemaHint {
  path: string;
  kind: ActionTemplatePayloadKind;
  required: boolean;
  description?: string;
  format?: ActionTemplatePayloadFormat;
  allowedValues?: readonly string[];
}

export interface ActionTemplateIdempotencyPolicy {
  mode: ActionTemplateIdempotencyMode;
  scope: ActionTemplateIdempotencyScope;
  keyTemplate: string;
  ttlHours?: number;
}

export interface ActionTemplateDryRunCapability {
  supported: boolean;
  mode?: ActionTemplateDryRunMode;
  requiresSandbox?: boolean;
}

export interface ActionTemplateFallbackCapability {
  supported: boolean;
  channel?: ActionFallbackChannel;
  humanRequired?: boolean;
}

export interface ActionTemplate {
  kind: "ActionTemplate";
  schemaVersion: "1.0.0";
  templateId: ActionTemplateRef["templateId"];
  templateVersion: ActionTemplateRef["templateVersion"];
  actionType: ActionTemplateRef["actionType"];
  destinationType: ActionTemplateRef["destinationType"];
  name: string;
  description?: string;
  status: ActionTemplateStatus;
  destinationSystem: string;
  payloadSchemaHints: readonly ActionTemplatePayloadSchemaHint[];
  requiredApprovals: readonly DecisionApprovalRequirement[];
  retryPolicy: ActionDispatchRetryPolicy;
  idempotencyPolicy: ActionTemplateIdempotencyPolicy;
  dryRun: ActionTemplateDryRunCapability;
  fallback: ActionTemplateFallbackCapability;
  tags?: readonly string[];
}
