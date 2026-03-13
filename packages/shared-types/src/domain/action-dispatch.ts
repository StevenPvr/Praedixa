import type { ISODateTimeString, UUID } from "../utils/common.js";

export type ActionDispatchStatus =
  | "dry_run"
  | "pending"
  | "dispatched"
  | "acknowledged"
  | "failed"
  | "retried"
  | "canceled";

export type ActionDispatchMode = "dry_run" | "live" | "sandbox";

export type ActionDispatchAttemptStatus = Exclude<
  ActionDispatchStatus,
  "dry_run" | "pending"
>;

export type ActionFallbackStatus =
  | "not_needed"
  | "prepared"
  | "executed"
  | "dismissed";

export type ActionFallbackChannel =
  | "export"
  | "link"
  | "notification"
  | "task_copy";

export type ActionFallbackActor = "system" | "human";

export type ActionRetryBackoffStrategy = "fixed" | "exponential";

export interface ActionTemplateRef {
  templateId: string;
  templateVersion: number;
  actionType: string;
  destinationType: string;
}

export interface ActionDispatchRetryPolicy {
  maxAttempts: number;
  retryableErrorCodes: readonly string[];
  backoffStrategy: ActionRetryBackoffStrategy;
  initialDelayMs: number;
  maxDelayMs?: number;
}

export interface ActionDestinationCapabilities {
  supportsDryRun: boolean;
  supportsSandbox: boolean;
  supportsAcknowledgement: boolean;
  supportsCancellation: boolean;
  supportsRetry: boolean;
  supportsIdempotencyKeys: boolean;
  supportsHumanFallback: boolean;
  requiresHumanFallbackOnFailure?: boolean;
}

export interface ActionDestination {
  system: string;
  connectorId?: UUID;
  targetResourceType: string;
  targetResourceId?: string;
  sandbox?: boolean;
  capabilities: ActionDestinationCapabilities;
}

export interface ActionPermissionsContext {
  allowedByContract: boolean;
  permissionKeys: readonly string[];
}

export interface ActionDispatchAttempt {
  attemptNumber: number;
  status: ActionDispatchAttemptStatus;
  dispatchedAt: ISODateTimeString;
  latencyMs?: number;
  targetReference?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface ActionFallback {
  status: ActionFallbackStatus;
  channel: ActionFallbackChannel;
  reference?: string;
  preparedAt?: ISODateTimeString;
  executedAt?: ISODateTimeString;
  activatedBy?: ActionFallbackActor;
  activationReason?: string;
  humanRequired?: boolean;
}

export interface ActionDispatchRecord {
  kind: "ActionDispatch";
  schemaVersion: "1.0.0";
  actionId: UUID;
  contractId: string;
  contractVersion: number;
  recommendationId: UUID;
  approvalId?: UUID;
  status: ActionDispatchStatus;
  dispatchMode: ActionDispatchMode;
  template: ActionTemplateRef;
  destination: ActionDestination;
  permissionsContext: ActionPermissionsContext;
  retryPolicy: ActionDispatchRetryPolicy;
  idempotencyKey: string;
  payloadPreview: Record<string, unknown>;
  payloadFinal?: Record<string, unknown>;
  attempts: ActionDispatchAttempt[];
  fallback?: ActionFallback;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}
