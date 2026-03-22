import type { ISODateTimeString, UUID } from "../utils/common.js";
import type { EmailDeliveryProof } from "./email-delivery-proof.js";

export type OnboardingWorkflowProvider = "camunda";

export type OnboardingCaseStatus =
  | "draft"
  | "in_progress"
  | "blocked"
  | "ready_limited"
  | "ready_full"
  | "active_limited"
  | "active_full"
  | "completed"
  | "cancelled";

export type OnboardingCasePhase =
  | "intake"
  | "access_setup"
  | "source_activation"
  | "mapping_validation"
  | "product_configuration"
  | "readiness_review"
  | "activation"
  | "hypercare";

export type OnboardingActivationMode = "shadow" | "limited" | "full";

export type OnboardingEnvironmentTarget = "sandbox" | "production";

export type OnboardingSourceMode = "api" | "file" | "sftp";
export type OnboardingSourceActivationTransport =
  | "api_pull"
  | "manual_upload"
  | "sftp_pull";
export type OnboardingSourceActivationStatus =
  | "draft"
  | "processing"
  | "ready"
  | "failed";
export type OnboardingFileFormat = "csv" | "tsv" | "xlsx";

export type OnboardingReadinessStatus =
  | "not_started"
  | "in_progress"
  | "ready"
  | "warning"
  | "blocked";

export type OnboardingTaskStatus = "todo" | "in_progress" | "done" | "blocked";

export type OnboardingTaskDomain =
  | "scope"
  | "access"
  | "sources"
  | "mapping"
  | "product"
  | "activation";

export type OnboardingInviteRole =
  | "org_admin"
  | "hr_manager"
  | "manager"
  | "employee"
  | "viewer";

export type OnboardingSourceType = "api" | "file" | "sftp";

export type OnboardingSourceRunAction =
  | "probe"
  | "sync"
  | "file_import"
  | "medallion_trigger";

export type OnboardingSourceRunStatus =
  | "queued"
  | "running"
  | "success"
  | "failed";

export type OnboardingAccessInviteStatus = "draft" | "sent" | "failed";

export interface OnboardingSourceActivationRun {
  status: "pending" | "success" | "failed";
  triggeredAt: ISODateTimeString;
  completedAt?: ISODateTimeString | null;
  bronzeFiles?: number | null;
  silverRows?: number | null;
  goldRows?: number | null;
  quarantinedFiles?: number | null;
  errorMessage?: string | null;
}

export interface OnboardingSourceActivationBase {
  id: string;
  label: string;
  sourceMode: OnboardingSourceMode;
  transport: OnboardingSourceActivationTransport;
  datasetKey: string;
  domain: string;
  importProfile: string;
  replayStrategy?: string | null;
  status: OnboardingSourceActivationStatus;
  lastError?: string | null;
  lastRun?: OnboardingSourceActivationRun | null;
}

export interface OnboardingFileSourceActivation extends OnboardingSourceActivationBase {
  sourceMode: "file" | "sftp";
  transport: "manual_upload" | "sftp_pull";
  fileName: string;
  fileFormat: OnboardingFileFormat;
  storedRelativePath: string;
  uploadedAt: ISODateTimeString;
}

export interface OnboardingApiSourceActivation extends OnboardingSourceActivationBase {
  sourceMode: "api";
  transport: "api_pull";
  connectionId: string;
  vendor: string;
  displayName: string;
  probeStatus: "pending" | "success" | "failed";
  syncStatus: "pending" | "queued" | "running" | "success" | "failed";
}

export type OnboardingSourceActivation =
  | OnboardingFileSourceActivation
  | OnboardingApiSourceActivation;

export interface OnboardingFileSourceUploadResult {
  activation: OnboardingFileSourceActivation;
  bundle: OnboardingCaseBundle;
}

export interface OnboardingApiSourceActivationResult {
  activation: OnboardingApiSourceActivation;
  bundle: OnboardingCaseBundle;
}

export interface OnboardingAccessInviteRecipient {
  email: string;
  role: OnboardingInviteRole;
  siteId: UUID | null;
  siteName?: string | null;
  status: OnboardingAccessInviteStatus;
  delivery: "activation_link";
  deliveryChannel: "keycloak_execute_actions_email";
  passwordHandling: "client_sets_password";
  invitedAt?: ISODateTimeString | null;
  invitedUserId?: UUID | null;
  deliveryProof?: EmailDeliveryProof | null;
  errorMessage?: string | null;
}

export interface OnboardingSourceRun {
  id: UUID;
  caseId: UUID;
  taskId: UUID;
  sourceKey: string;
  sourceType: OnboardingSourceType;
  action: OnboardingSourceRunAction;
  status: OnboardingSourceRunStatus;
  message: string | null;
  fileName: string | null;
  fileSizeBytes: number | null;
  storedPath: string | null;
  statsJson: Record<string, unknown>;
  startedAt: ISODateTimeString | null;
  completedAt: ISODateTimeString | null;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export type OnboardingBlockerSeverity = "info" | "warning" | "critical";

export type OnboardingBlockerStatus = "open" | "resolved";

export interface OnboardingProcessReference {
  workflowProvider: OnboardingWorkflowProvider;
  processDefinitionKey: string;
  processDefinitionVersion: number;
  processInstanceKey: string;
}

export interface OnboardingCaseSummary {
  id: UUID;
  organizationId: UUID;
  organizationName?: string | null;
  organizationSlug?: string | null;
  status: OnboardingCaseStatus;
  phase: OnboardingCasePhase;
  activationMode: OnboardingActivationMode;
  environmentTarget: OnboardingEnvironmentTarget;
  dataResidencyRegion: string;
  subscriptionModules: readonly string[];
  selectedPacks: readonly string[];
  sourceModes: readonly OnboardingSourceMode[];
  lastReadinessStatus: OnboardingReadinessStatus;
  lastReadinessScore: number;
  openTaskCount: number;
  openBlockerCount: number;
  ownerUserId: UUID | null;
  sponsorUserId: UUID | null;
  startedAt: ISODateTimeString;
  targetGoLiveAt: ISODateTimeString | null;
  closedAt: ISODateTimeString | null;
  process: OnboardingProcessReference;
}

export interface OnboardingCaseDetail extends OnboardingCaseSummary {
  metadataJson: Record<string, unknown>;
}

export interface OnboardingCaseTask {
  id: UUID;
  caseId: UUID;
  taskKey: string;
  title: string;
  domain: OnboardingTaskDomain;
  taskType: string;
  status: OnboardingTaskStatus;
  assigneeUserId: UUID | null;
  sortOrder: number;
  dueAt: ISODateTimeString | null;
  completedAt: ISODateTimeString | null;
  detailsJson: Record<string, unknown>;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface OnboardingCaseBlocker {
  id: UUID;
  caseId: UUID;
  blockerKey: string;
  title: string;
  domain: OnboardingTaskDomain;
  severity: OnboardingBlockerSeverity;
  status: OnboardingBlockerStatus;
  detailsJson: Record<string, unknown>;
  openedAt: ISODateTimeString;
  resolvedAt: ISODateTimeString | null;
}

export interface OnboardingCaseEvent {
  id: UUID;
  caseId: UUID;
  actorUserId: UUID | null;
  eventType: string;
  message: string;
  payloadJson: Record<string, unknown>;
  occurredAt: ISODateTimeString;
}

export interface OnboardingCaseBundle {
  case: OnboardingCaseDetail;
  tasks: readonly OnboardingCaseTask[];
  blockers: readonly OnboardingCaseBlocker[];
  events: readonly OnboardingCaseEvent[];
}

export interface CreateOnboardingCaseRequest {
  ownerUserId?: UUID | null;
  sponsorUserId?: UUID | null;
  activationMode: OnboardingActivationMode;
  environmentTarget: OnboardingEnvironmentTarget;
  dataResidencyRegion: string;
  subscriptionModules: readonly string[];
  selectedPacks: readonly string[];
  sourceModes: readonly OnboardingSourceMode[];
  targetGoLiveAt?: ISODateTimeString | null;
  metadataJson?: Record<string, unknown>;
}

export interface CreateAdminOnboardingCaseRequest extends CreateOnboardingCaseRequest {
  organizationId: UUID;
}

export interface OnboardingTaskPayload {
  [key: string]: unknown;
}

export interface SaveOnboardingCaseTaskRequest {
  note?: string | null;
  payloadJson?: OnboardingTaskPayload;
}

export interface CompleteOnboardingCaseTaskRequest {
  note?: string | null;
  payloadJson?: OnboardingTaskPayload;
}

export interface OnboardingCaseLifecycleRequest {
  reason?: string | null;
}
