import type {
  EmailDeliveryProof,
  OnboardingAccessInviteRecipient,
  OnboardingAccessInviteStatus,
  OnboardingApiSourceActivation,
  CreateOnboardingCaseRequest,
  OnboardingInviteRole,
  OnboardingActivationMode,
  OnboardingBlockerSeverity,
  OnboardingBlockerStatus,
  OnboardingCaseBlocker,
  OnboardingCaseDetail,
  OnboardingCaseEvent,
  OnboardingCasePhase,
  OnboardingCaseStatus,
  OnboardingCaseSummary,
  OnboardingCaseTask,
  OnboardingEnvironmentTarget,
  OnboardingProcessReference,
  OnboardingReadinessStatus,
  OnboardingSourceActivation,
  OnboardingSourceActivationRun,
  OnboardingSourceActivationStatus,
  OnboardingSourceActivationTransport,
  OnboardingFileFormat,
  OnboardingSourceMode,
  OnboardingTaskDomain,
  OnboardingTaskStatus,
  OnboardingTaskPayload,
} from "@praedixa/shared-types/api";

import {
  isUuidString,
  normalizeStringArray,
  PersistenceError,
  toIsoDateTime,
} from "./persistence.js";
import { buildOnboardingTaskTemplates } from "./admin-onboarding-process.js";

export type DbOnboardingCaseRow = {
  id: string;
  organization_id: string;
  organization_name: string | null;
  organization_slug: string | null;
  status: OnboardingCaseStatus;
  phase: OnboardingCasePhase;
  activation_mode: OnboardingActivationMode;
  environment_target: OnboardingEnvironmentTarget;
  data_residency_region: string;
  workflow_provider: OnboardingProcessReference["workflowProvider"];
  process_definition_key: string;
  process_definition_version: number;
  process_instance_key: string;
  subscription_modules: string[] | null;
  selected_packs: string[] | null;
  source_modes: OnboardingSourceMode[] | null;
  last_readiness_status: OnboardingReadinessStatus;
  last_readiness_score: number;
  owner_user_id: string | null;
  sponsor_user_id: string | null;
  started_at: string | Date;
  target_go_live_at: string | Date | null;
  closed_at: string | Date | null;
  metadata_json: Record<string, unknown> | null;
  open_task_count: string | number;
  open_blocker_count: string | number;
};

export type DbOnboardingTaskRow = {
  id: string;
  case_id: string;
  task_key: string;
  title: string;
  domain: OnboardingTaskDomain;
  task_type: string;
  status: OnboardingTaskStatus;
  assignee_user_id: string | null;
  sort_order: number;
  due_at: string | Date | null;
  completed_at: string | Date | null;
  details_json: Record<string, unknown> | null;
  created_at: string | Date;
  updated_at: string | Date;
};

export type DbOnboardingBlockerRow = {
  id: string;
  case_id: string;
  blocker_key: string;
  title: string;
  domain: OnboardingTaskDomain;
  severity: OnboardingBlockerSeverity;
  status: OnboardingBlockerStatus;
  details_json: Record<string, unknown> | null;
  opened_at: string | Date;
  resolved_at: string | Date | null;
};

export type DbOnboardingEventRow = {
  id: string;
  case_id: string;
  actor_user_id: string | null;
  event_type: string;
  message: string;
  payload_json: Record<string, unknown> | null;
  occurred_at: string | Date;
};

export type SeedTask = {
  taskKey: string;
  title: string;
  domain: OnboardingTaskDomain;
  taskType: string;
  sortOrder: number;
  detailsJson?: Record<string, unknown>;
};

type TaskValidationMode = "save" | "complete";

export type SeedBlocker = {
  blockerKey: string;
  title: string;
  domain: OnboardingTaskDomain;
  severity: OnboardingBlockerSeverity;
  detailsJson?: Record<string, unknown>;
};

export type CreateOnboardingCaseInput = {
  organizationId: string;
  actorUserId: string;
  request: CreateOnboardingCaseRequest;
};

export const CASE_STATUSES = new Set<OnboardingCaseStatus>([
  "draft",
  "in_progress",
  "blocked",
  "ready_limited",
  "ready_full",
  "active_limited",
  "active_full",
  "completed",
  "cancelled",
]);

const CASE_PHASES = new Set<OnboardingCasePhase>([
  "intake",
  "access_setup",
  "source_activation",
  "mapping_validation",
  "product_configuration",
  "readiness_review",
  "activation",
  "hypercare",
]);

const ACTIVATION_MODES = new Set<OnboardingActivationMode>([
  "shadow",
  "limited",
  "full",
]);

const ENVIRONMENT_TARGETS = new Set<OnboardingEnvironmentTarget>([
  "sandbox",
  "production",
]);

const SOURCE_MODES = new Set<OnboardingSourceMode>(["api", "file", "sftp"]);

const READINESS_STATUSES = new Set<OnboardingReadinessStatus>([
  "not_started",
  "in_progress",
  "ready",
  "warning",
  "blocked",
]);

const TASK_STATUSES = new Set<OnboardingTaskStatus>([
  "todo",
  "in_progress",
  "done",
  "blocked",
]);

const TASK_DOMAINS = new Set<OnboardingTaskDomain>([
  "scope",
  "access",
  "sources",
  "mapping",
  "product",
  "activation",
]);

const BLOCKER_SEVERITIES = new Set<OnboardingBlockerSeverity>([
  "info",
  "warning",
  "critical",
]);

const BLOCKER_STATUSES = new Set<OnboardingBlockerStatus>(["open", "resolved"]);
const ONBOARDING_INVITE_ROLES = new Set<OnboardingInviteRole>([
  "org_admin",
  "hr_manager",
  "manager",
  "employee",
  "viewer",
]);
const ONBOARDING_ACCESS_INVITE_STATUSES = new Set<OnboardingAccessInviteStatus>(
  ["draft", "sent", "failed"],
);
const SOURCE_ACTIVATION_STATUSES = new Set<OnboardingSourceActivationStatus>([
  "draft",
  "processing",
  "ready",
  "failed",
]);
const SOURCE_ACTIVATION_TRANSPORTS =
  new Set<OnboardingSourceActivationTransport>([
    "api_pull",
    "manual_upload",
    "sftp_pull",
  ]);
const FILE_FORMATS = new Set<OnboardingFileFormat>(["csv", "tsv", "xlsx"]);
const SOURCE_RUN_STATUSES = new Set<OnboardingSourceActivationRun["status"]>([
  "pending",
  "success",
  "failed",
]);
const API_PROBE_STATUSES = new Set<
  OnboardingApiSourceActivation["probeStatus"]
>(["pending", "success", "failed"]);
const API_SYNC_STATUSES = new Set<OnboardingApiSourceActivation["syncStatus"]>([
  "pending",
  "queued",
  "running",
  "success",
  "failed",
]);
const DELIVERY_PROOF_STATUSES = new Set<EmailDeliveryProof["status"]>([
  "pending",
  "provider_accepted",
  "delivery_delayed",
  "delivered",
  "bounced",
  "complained",
  "failed",
]);

export const DEFAULT_PROCESS_DEFINITION_KEY = "client-onboarding-v1";
export const DEFAULT_PROCESS_DEFINITION_VERSION = 1;
export const DEFAULT_WORKFLOW_PROVIDER: OnboardingProcessReference["workflowProvider"] =
  "camunda";

export function assertUuid(value: string, label: string): void {
  if (!isUuidString(value)) {
    throw new PersistenceError(
      `${label} must be a UUID.`,
      400,
      "INVALID_IDENTIFIER",
      { [label]: value },
    );
  }
}

export function requireActorId(value: string, label: string): string {
  const normalized = normalizeText(value);
  if (!normalized) {
    throw new PersistenceError(
      `${label} is required.`,
      403,
      "ACTOR_CONTEXT_REQUIRED",
    );
  }
  return normalized;
}

export function assertInSet<T extends string>(
  value: string,
  allowed: ReadonlySet<T>,
  label: string,
): asserts value is T {
  if (!allowed.has(value as T)) {
    throw new PersistenceError(
      `${label} is invalid.`,
      422,
      "VALIDATION_ERROR",
      { [label]: value },
    );
  }
}

export function normalizeText(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeSourceModes(
  sourceModes: readonly OnboardingSourceMode[],
): OnboardingSourceMode[] {
  const normalized = normalizeStringArray(sourceModes);
  if (normalized.length === 0) {
    throw new PersistenceError(
      "At least one source mode is required.",
      422,
      "VALIDATION_ERROR",
    );
  }

  normalized.forEach((sourceMode) => {
    assertInSet(sourceMode, SOURCE_MODES, "sourceMode");
  });

  return normalized as OnboardingSourceMode[];
}

export function normalizeRequestedCase(
  request: CreateOnboardingCaseRequest,
): CreateOnboardingCaseRequest {
  const dataResidencyRegion = normalizeText(request.dataResidencyRegion);
  if (!dataResidencyRegion) {
    throw new PersistenceError(
      "dataResidencyRegion is required.",
      422,
      "VALIDATION_ERROR",
    );
  }

  assertInSet(request.activationMode, ACTIVATION_MODES, "activationMode");
  assertInSet(
    request.environmentTarget,
    ENVIRONMENT_TARGETS,
    "environmentTarget",
  );

  const subscriptionModules = normalizeStringArray(request.subscriptionModules);
  const selectedPacks = normalizeStringArray(request.selectedPacks);
  if (subscriptionModules.length === 0) {
    throw new PersistenceError(
      "At least one subscription module is required.",
      422,
      "VALIDATION_ERROR",
    );
  }
  if (selectedPacks.length === 0) {
    throw new PersistenceError(
      "At least one selected pack is required.",
      422,
      "VALIDATION_ERROR",
    );
  }

  const ownerUserId = normalizeText(request.ownerUserId ?? null);
  if (ownerUserId) {
    assertUuid(ownerUserId, "ownerUserId");
  }
  const sponsorUserId = normalizeText(request.sponsorUserId ?? null);
  if (sponsorUserId) {
    assertUuid(sponsorUserId, "sponsorUserId");
  }

  return {
    ...request,
    ownerUserId,
    sponsorUserId,
    dataResidencyRegion,
    subscriptionModules,
    selectedPacks,
    sourceModes: normalizeSourceModes(request.sourceModes),
    metadataJson:
      request.metadataJson &&
      typeof request.metadataJson === "object" &&
      !Array.isArray(request.metadataJson)
        ? request.metadataJson
        : {},
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readTrimmedString(
  payload: Record<string, unknown>,
  key: string,
): string | null {
  const value = payload[key];
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readBoolean(
  payload: Record<string, unknown>,
  key: string,
): boolean | null {
  return typeof payload[key] === "boolean" ? payload[key] : null;
}

function readStringArray(
  payload: Record<string, unknown>,
  key: string,
): string[] {
  const value = payload[key];
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function readInviteRecipients(
  payload: Record<string, unknown>,
  key: string,
): OnboardingAccessInviteRecipient[] {
  const rawValue = payload[key];
  if (!Array.isArray(rawValue)) {
    return [];
  }

  const recipients: OnboardingAccessInviteRecipient[] = [];
  for (const entry of rawValue) {
    const invite = asRecord(entry);
    const email = normalizeText(
      typeof invite["email"] === "string"
        ? invite["email"].toLowerCase()
        : null,
    );
    const role = readTrimmedString(invite, "role");
    const siteId = readTrimmedString(invite, "siteId");
    const siteName = readTrimmedString(invite, "siteName");
    const status = readTrimmedString(invite, "status");
    const invitedAt = readTrimmedString(invite, "invitedAt");
    const invitedUserId = readTrimmedString(invite, "invitedUserId");
    const errorMessage = readTrimmedString(invite, "errorMessage");
    const deliveryProof = readDeliveryProof(invite, "deliveryProof");

    if (!email || !isValidEmail(email) || !role || !status) {
      continue;
    }
    assertInSet(role, ONBOARDING_INVITE_ROLES, "inviteRole");
    assertInSet(status, ONBOARDING_ACCESS_INVITE_STATUSES, "inviteStatus");
    if (siteId) {
      assertUuid(siteId, "siteId");
    }
    if (invitedUserId) {
      assertUuid(invitedUserId, "invitedUserId");
    }

    recipients.push({
      email,
      role,
      siteId: siteId ?? null,
      siteName,
      status,
      delivery: "activation_link",
      deliveryChannel: "keycloak_execute_actions_email",
      passwordHandling: "client_sets_password",
      invitedAt: invitedAt ?? null,
      invitedUserId: invitedUserId ?? null,
      deliveryProof,
      errorMessage:
        status === "failed" ? (errorMessage ?? "Invitation failed") : null,
    });
  }

  return recipients;
}

function readSourceActivationRun(
  payload: Record<string, unknown>,
  key: string,
): OnboardingSourceActivationRun | null {
  const rawValue = asRecord(payload[key]);
  const status = readTrimmedString(rawValue, "status");
  const triggeredAt = readTrimmedString(rawValue, "triggeredAt");
  if (!status || !triggeredAt) {
    return null;
  }
  assertInSet(status, SOURCE_RUN_STATUSES, "sourceActivationRunStatus");
  return {
    status,
    triggeredAt,
    completedAt: readTrimmedString(rawValue, "completedAt"),
    bronzeFiles:
      typeof rawValue["bronzeFiles"] === "number"
        ? rawValue["bronzeFiles"]
        : null,
    silverRows:
      typeof rawValue["silverRows"] === "number"
        ? rawValue["silverRows"]
        : null,
    goldRows:
      typeof rawValue["goldRows"] === "number" ? rawValue["goldRows"] : null,
    quarantinedFiles:
      typeof rawValue["quarantinedFiles"] === "number"
        ? rawValue["quarantinedFiles"]
        : null,
    errorMessage: readTrimmedString(rawValue, "errorMessage"),
  };
}

export function readSourceActivations(
  payload: Record<string, unknown>,
  key: string,
): OnboardingSourceActivation[] {
  const rawValue = payload[key];
  if (!Array.isArray(rawValue)) {
    return [];
  }

  const activations: OnboardingSourceActivation[] = [];
  for (const entry of rawValue) {
    const activation = asRecord(entry);
    const id = readTrimmedString(activation, "id");
    const label = readTrimmedString(activation, "label");
    const sourceMode = readTrimmedString(activation, "sourceMode");
    const transport = readTrimmedString(activation, "transport");
    const datasetKey = readTrimmedString(activation, "datasetKey");
    const domain = readTrimmedString(activation, "domain");
    const importProfile = readTrimmedString(activation, "importProfile");
    const status = readTrimmedString(activation, "status");
    if (
      !id ||
      !label ||
      !sourceMode ||
      !transport ||
      !datasetKey ||
      !domain ||
      !importProfile ||
      !status
    ) {
      continue;
    }
    assertInSet(sourceMode, SOURCE_MODES, "sourceActivationMode");
    assertInSet(
      transport,
      SOURCE_ACTIVATION_TRANSPORTS,
      "sourceActivationTransport",
    );
    assertInSet(status, SOURCE_ACTIVATION_STATUSES, "sourceActivationStatus");

    const base = {
      id,
      label,
      datasetKey,
      domain,
      importProfile,
      replayStrategy: readTrimmedString(activation, "replayStrategy"),
      status,
      lastError: readTrimmedString(activation, "lastError"),
      lastRun: readSourceActivationRun(activation, "lastRun"),
    };

    if (sourceMode === "api") {
      const connectionId = readTrimmedString(activation, "connectionId");
      const vendor = readTrimmedString(activation, "vendor");
      const displayName = readTrimmedString(activation, "displayName");
      const probeStatus = readTrimmedString(activation, "probeStatus");
      const syncStatus = readTrimmedString(activation, "syncStatus");
      if (
        !connectionId ||
        !vendor ||
        !displayName ||
        !probeStatus ||
        !syncStatus
      ) {
        continue;
      }
      if (
        !API_PROBE_STATUSES.has(
          probeStatus as OnboardingApiSourceActivation["probeStatus"],
        )
      ) {
        continue;
      }
      if (
        !API_SYNC_STATUSES.has(
          syncStatus as OnboardingApiSourceActivation["syncStatus"],
        )
      ) {
        continue;
      }
      activations.push({
        ...base,
        sourceMode: "api",
        transport: "api_pull",
        connectionId,
        vendor,
        displayName,
        probeStatus:
          probeStatus as OnboardingApiSourceActivation["probeStatus"],
        syncStatus: syncStatus as OnboardingApiSourceActivation["syncStatus"],
      });
      continue;
    }

    const fileName = readTrimmedString(activation, "fileName");
    const fileFormat = readTrimmedString(activation, "fileFormat");
    const storedRelativePath = readTrimmedString(
      activation,
      "storedRelativePath",
    );
    const uploadedAt = readTrimmedString(activation, "uploadedAt");
    if (!fileName || !fileFormat || !storedRelativePath || !uploadedAt) {
      continue;
    }
    assertInSet(fileFormat, FILE_FORMATS, "fileFormat");
    const transportValue =
      sourceMode === "sftp" ? "sftp_pull" : "manual_upload";
    activations.push({
      ...base,
      sourceMode,
      transport: transportValue,
      fileName,
      fileFormat,
      storedRelativePath,
      uploadedAt,
    });
  }

  return activations;
}

export function readAccessInviteRecipientsFromPayload(
  payload: Record<string, unknown>,
): OnboardingAccessInviteRecipient[] {
  return readInviteRecipients(payload, "inviteRecipients");
}

function readDeliveryProof(
  payload: Record<string, unknown>,
  key: string,
): EmailDeliveryProof | null {
  const value = asRecord(payload[key]);
  const status = readTrimmedString(value, "status");
  const initiatedAt = readTrimmedString(value, "initiatedAt");
  if (
    !status ||
    !initiatedAt ||
    !DELIVERY_PROOF_STATUSES.has(status as never)
  ) {
    return null;
  }

  return {
    provider: "resend",
    channel: "keycloak_execute_actions_email",
    delivery: "activation_link",
    status: status as EmailDeliveryProof["status"],
    initiatedAt,
    eventType: readTrimmedString(value, "eventType") || null,
    occurredAt: readTrimmedString(value, "occurredAt") || null,
    observedAt: readTrimmedString(value, "observedAt") || null,
    summary: readTrimmedString(value, "summary") || null,
  };
}

function ensureTaskFields(
  mode: TaskValidationMode,
  taskKey: string,
  payload: Record<string, unknown>,
  requiredFields: readonly string[],
): void {
  if (mode !== "complete") {
    return;
  }

  const missing = requiredFields.filter((field) => {
    const value = payload[field];
    if (typeof value === "string") {
      return value.trim().length === 0;
    }
    if (Array.isArray(value)) {
      return value.length === 0;
    }
    return value == null || value === false;
  });

  if (missing.length > 0) {
    throw new PersistenceError(
      `Task ${taskKey} is missing required evidence.`,
      422,
      "VALIDATION_ERROR",
      { taskKey, missingFields: missing },
    );
  }
}

export function normalizeOnboardingTaskPayload(input: {
  taskKey: string;
  payloadJson?: OnboardingTaskPayload | null;
  mode: TaskValidationMode;
}): Record<string, unknown> {
  const payload = asRecord(input.payloadJson);

  switch (input.taskKey) {
    case "scope-contract": {
      const normalized = {
        contractScope: readTrimmedString(payload, "contractScope"),
        dataResidencyApproved: readBoolean(payload, "dataResidencyApproved"),
        environmentValidated: readBoolean(payload, "environmentValidated"),
        commercialOwner: readTrimmedString(payload, "commercialOwner"),
      };
      ensureTaskFields(input.mode, input.taskKey, normalized, [
        "contractScope",
        "dataResidencyApproved",
        "environmentValidated",
      ]);
      return normalized;
    }
    case "access-model": {
      const inviteRecipients = readInviteRecipients(
        payload,
        "inviteRecipients",
      );
      const normalized = {
        ssoMode: readTrimmedString(payload, "ssoMode"),
        roleModelConfirmed: readBoolean(payload, "roleModelConfirmed"),
        invitationsReady: readBoolean(payload, "invitationsReady"),
        siteScopesValidated: readBoolean(payload, "siteScopesValidated"),
        invitationDelivery: "activation_link" as const,
        invitationChannel: "keycloak_execute_actions_email" as const,
        passwordHandling: "client_sets_password" as const,
        inviteRecipients,
        invitedRecipientCount: inviteRecipients.filter(
          (entry) => entry.status === "sent",
        ).length,
      };
      if (
        input.mode === "complete" &&
        normalized.inviteRecipients.length === 0
      ) {
        throw new PersistenceError(
          "Task access-model requires at least one invited client account.",
          422,
          "VALIDATION_ERROR",
          { taskKey: input.taskKey, missingFields: ["inviteRecipients"] },
        );
      }
      const incompleteInviteRecipients = normalized.inviteRecipients.filter(
        (entry) => entry.status !== "sent",
      );
      if (input.mode === "complete" && incompleteInviteRecipients.length > 0) {
        throw new PersistenceError(
          "Task access-model still has invitations that were not successfully initialized.",
          422,
          "VALIDATION_ERROR",
          {
            taskKey: input.taskKey,
            incompleteInviteRecipients: incompleteInviteRecipients.map(
              (entry) => ({
                email: entry.email,
                status: entry.status,
              }),
            ),
          },
        );
      }
      ensureTaskFields(input.mode, input.taskKey, normalized, [
        "ssoMode",
        "roleModelConfirmed",
        "invitationsReady",
        "siteScopesValidated",
        "invitedRecipientCount",
      ]);
      return normalized;
    }
    case "source-strategy": {
      const normalized = {
        primarySystems: readStringArray(payload, "primarySystems"),
        sourceOwner: readTrimmedString(payload, "sourceOwner"),
        extractionCadence: readTrimmedString(payload, "extractionCadence"),
      };
      ensureTaskFields(input.mode, input.taskKey, normalized, [
        "primarySystems",
        "sourceOwner",
        "extractionCadence",
      ]);
      return normalized;
    }
    case "activate-api-sources": {
      const sourceActivations = readSourceActivations(
        payload,
        "sourceActivations",
      ).filter((entry) => entry.sourceMode === "api");
      const normalized = {
        sourceActivations,
        datasetsValidated: readBoolean(payload, "datasetsValidated"),
      };
      ensureTaskFields(input.mode, input.taskKey, normalized, [
        "datasetsValidated",
      ]);
      if (
        input.mode === "complete" &&
        normalized.sourceActivations.length === 0
      ) {
        throw new PersistenceError(
          "Task activate-api-sources requires at least one activated API source.",
          422,
          "VALIDATION_ERROR",
          { taskKey: input.taskKey, missingFields: ["sourceActivations"] },
        );
      }
      if (
        input.mode === "complete" &&
        normalized.sourceActivations.some((entry) => entry.status !== "ready")
      ) {
        throw new PersistenceError(
          "Task activate-api-sources still contains API sources that are not ready.",
          422,
          "VALIDATION_ERROR",
          {
            taskKey: input.taskKey,
            sourceStatuses: normalized.sourceActivations.map((entry) => ({
              id: entry.id,
              status: entry.status,
            })),
          },
        );
      }
      return normalized;
    }
    case "configure-file-sources": {
      const sourceActivations = readSourceActivations(
        payload,
        "sourceActivations",
      ).filter((entry) => entry.sourceMode !== "api");
      const normalized = {
        importProfile: readTrimmedString(payload, "importProfile"),
        sampleFileReceived: readBoolean(payload, "sampleFileReceived"),
        mappingPreviewValidated: readBoolean(
          payload,
          "mappingPreviewValidated",
        ),
        replayStrategy: readTrimmedString(payload, "replayStrategy"),
        sourceActivations,
      };
      ensureTaskFields(input.mode, input.taskKey, normalized, [
        "importProfile",
        "sampleFileReceived",
        "mappingPreviewValidated",
      ]);
      if (
        input.mode === "complete" &&
        normalized.sourceActivations.length === 0
      ) {
        throw new PersistenceError(
          "Task configure-file-sources requires at least one uploaded or configured file source.",
          422,
          "VALIDATION_ERROR",
          { taskKey: input.taskKey, missingFields: ["sourceActivations"] },
        );
      }
      if (
        input.mode === "complete" &&
        normalized.sourceActivations.some((entry) => entry.status !== "ready")
      ) {
        throw new PersistenceError(
          "Task configure-file-sources still contains file or SFTP sources that are not ready.",
          422,
          "VALIDATION_ERROR",
          {
            taskKey: input.taskKey,
            sourceStatuses: normalized.sourceActivations.map((entry) => ({
              id: entry.id,
              status: entry.status,
            })),
          },
        );
      }
      return normalized;
    }
    case "publish-mappings": {
      const normalized = {
        mappingVersion: readTrimmedString(payload, "mappingVersion"),
        criticalFieldsCovered: readBoolean(payload, "criticalFieldsCovered"),
        quarantineClosed: readBoolean(payload, "quarantineClosed"),
        coveragePercent:
          typeof payload["coveragePercent"] === "number"
            ? payload["coveragePercent"]
            : null,
      };
      ensureTaskFields(input.mode, input.taskKey, normalized, [
        "mappingVersion",
        "criticalFieldsCovered",
        "quarantineClosed",
        "coveragePercent",
      ]);
      return normalized;
    }
    case "configure-product-scope": {
      const normalized = {
        kpis: readStringArray(payload, "kpis"),
        horizons: readStringArray(payload, "horizons"),
        levers: readStringArray(payload, "levers"),
        proofPacksConfirmed: readBoolean(payload, "proofPacksConfirmed"),
      };
      ensureTaskFields(input.mode, input.taskKey, normalized, [
        "kpis",
        "horizons",
        "levers",
        "proofPacksConfirmed",
      ]);
      return normalized;
    }
    case "activation-review": {
      const normalized = {
        approvalGranted: readBoolean(payload, "approvalGranted"),
        goLiveOwner: readTrimmedString(payload, "goLiveOwner"),
        rollbackPlanReady: readBoolean(payload, "rollbackPlanReady"),
        monitoringPlanReady: readBoolean(payload, "monitoringPlanReady"),
      };
      ensureTaskFields(input.mode, input.taskKey, normalized, [
        "approvalGranted",
        "goLiveOwner",
        "rollbackPlanReady",
        "monitoringPlanReady",
      ]);
      return normalized;
    }
    case "execute-activation": {
      const normalized = {
        activationWindow: readTrimmedString(payload, "activationWindow"),
        activatedBy: readTrimmedString(payload, "activatedBy"),
        smokeCheckPassed: readBoolean(payload, "smokeCheckPassed"),
      };
      ensureTaskFields(input.mode, input.taskKey, normalized, [
        "activationWindow",
        "activatedBy",
        "smokeCheckPassed",
      ]);
      return normalized;
    }
    case "close-hypercare": {
      const normalized = {
        closeSummary: readTrimmedString(payload, "closeSummary"),
        incidentsClosed: readBoolean(payload, "incidentsClosed"),
        clientSignoffReceived: readBoolean(payload, "clientSignoffReceived"),
      };
      ensureTaskFields(input.mode, input.taskKey, normalized, [
        "closeSummary",
        "incidentsClosed",
        "clientSignoffReceived",
      ]);
      return normalized;
    }
    default:
      return payload;
  }
}

export function mapCaseRow(row: DbOnboardingCaseRow): OnboardingCaseDetail {
  assertInSet(row.status, CASE_STATUSES, "status");
  assertInSet(row.phase, CASE_PHASES, "phase");
  assertInSet(row.activation_mode, ACTIVATION_MODES, "activationMode");
  assertInSet(row.environment_target, ENVIRONMENT_TARGETS, "environmentTarget");
  assertInSet(
    row.last_readiness_status,
    READINESS_STATUSES,
    "lastReadinessStatus",
  );

  return {
    id: row.id,
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    organizationSlug: row.organization_slug,
    status: row.status,
    phase: row.phase,
    activationMode: row.activation_mode,
    environmentTarget: row.environment_target,
    dataResidencyRegion: row.data_residency_region,
    subscriptionModules: Array.isArray(row.subscription_modules)
      ? row.subscription_modules
      : [],
    selectedPacks: Array.isArray(row.selected_packs) ? row.selected_packs : [],
    sourceModes: Array.isArray(row.source_modes) ? row.source_modes : [],
    lastReadinessStatus: row.last_readiness_status,
    lastReadinessScore: Number(row.last_readiness_score) || 0,
    openTaskCount: Number(row.open_task_count) || 0,
    openBlockerCount: Number(row.open_blocker_count) || 0,
    ownerUserId: row.owner_user_id,
    sponsorUserId: row.sponsor_user_id,
    startedAt: toIsoDateTime(row.started_at) ?? new Date().toISOString(),
    targetGoLiveAt: toIsoDateTime(row.target_go_live_at),
    closedAt: toIsoDateTime(row.closed_at),
    process: {
      workflowProvider: row.workflow_provider,
      processDefinitionKey: row.process_definition_key,
      processDefinitionVersion: Number(row.process_definition_version) || 1,
      processInstanceKey: row.process_instance_key,
    },
    metadataJson:
      row.metadata_json &&
      typeof row.metadata_json === "object" &&
      !Array.isArray(row.metadata_json)
        ? row.metadata_json
        : {},
  };
}

export function mapCaseSummaryRow(
  row: DbOnboardingCaseRow,
): OnboardingCaseSummary {
  return mapCaseRow(row);
}

export function mapTaskRow(row: DbOnboardingTaskRow): OnboardingCaseTask {
  assertInSet(row.domain, TASK_DOMAINS, "taskDomain");
  assertInSet(row.status, TASK_STATUSES, "taskStatus");
  return {
    id: row.id,
    caseId: row.case_id,
    taskKey: row.task_key,
    title: row.title,
    domain: row.domain,
    taskType: row.task_type,
    status: row.status,
    assigneeUserId: row.assignee_user_id,
    sortOrder: Number(row.sort_order) || 0,
    dueAt: toIsoDateTime(row.due_at),
    completedAt: toIsoDateTime(row.completed_at),
    detailsJson:
      row.details_json &&
      typeof row.details_json === "object" &&
      !Array.isArray(row.details_json)
        ? row.details_json
        : {},
    createdAt: toIsoDateTime(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIsoDateTime(row.updated_at) ?? new Date().toISOString(),
  };
}

export function mapBlockerRow(
  row: DbOnboardingBlockerRow,
): OnboardingCaseBlocker {
  assertInSet(row.domain, TASK_DOMAINS, "blockerDomain");
  assertInSet(row.severity, BLOCKER_SEVERITIES, "blockerSeverity");
  assertInSet(row.status, BLOCKER_STATUSES, "blockerStatus");
  return {
    id: row.id,
    caseId: row.case_id,
    blockerKey: row.blocker_key,
    title: row.title,
    domain: row.domain,
    severity: row.severity,
    status: row.status,
    detailsJson:
      row.details_json &&
      typeof row.details_json === "object" &&
      !Array.isArray(row.details_json)
        ? row.details_json
        : {},
    openedAt: toIsoDateTime(row.opened_at) ?? new Date().toISOString(),
    resolvedAt: toIsoDateTime(row.resolved_at),
  };
}

export function mapEventRow(row: DbOnboardingEventRow): OnboardingCaseEvent {
  return {
    id: row.id,
    caseId: row.case_id,
    actorUserId: row.actor_user_id,
    eventType: row.event_type,
    message: row.message,
    payloadJson:
      row.payload_json &&
      typeof row.payload_json === "object" &&
      !Array.isArray(row.payload_json)
        ? row.payload_json
        : {},
    occurredAt: toIsoDateTime(row.occurred_at) ?? new Date().toISOString(),
  };
}

export function phaseFromTasks(
  tasks: readonly SeedTask[],
): OnboardingCasePhase {
  const first = tasks
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder)[0];
  switch (first?.domain) {
    case undefined:
      return "intake";
    case "access":
      return "access_setup";
    case "sources":
      return "source_activation";
    case "mapping":
      return "mapping_validation";
    case "product":
      return "product_configuration";
    case "activation":
      return "activation";
    case "scope":
    default:
      return "intake";
  }
}

export function seedTasks(
  request: CreateOnboardingCaseRequest,
): readonly SeedTask[] {
  return buildOnboardingTaskTemplates(request).map((template) => ({
    taskKey: template.taskKey,
    title: template.title,
    domain: template.domain,
    taskType: template.taskType,
    sortOrder: template.sortOrder,
    detailsJson: {
      workflowElementId: template.elementId,
    },
  }));
}

export function seedBlockers(): readonly SeedBlocker[] {
  return [
    {
      blockerKey: "access-model-unverified",
      title: "Le modele d'acces et le SSO ne sont pas encore verifies",
      domain: "access",
      severity: "warning",
      detailsJson: { resolveOnTaskKeys: ["access-model"] },
    },
    {
      blockerKey: "sources-not-activated",
      title: "Aucune source critique n'a encore passe le cycle probe + sync",
      domain: "sources",
      severity: "critical",
      detailsJson: {
        resolveOnTaskKeys: [
          "source-strategy",
          "activate-api-sources",
          "configure-file-sources",
        ],
      },
    },
    {
      blockerKey: "mapping-unpublished",
      title: "Les mappings critiques ne sont pas encore publies",
      domain: "mapping",
      severity: "critical",
      detailsJson: { resolveOnTaskKeys: ["publish-mappings"] },
    },
    {
      blockerKey: "product-scope-unconfirmed",
      title:
        "Le scope produit, les KPI et les horizons ne sont pas encore confirmes",
      domain: "product",
      severity: "warning",
      detailsJson: { resolveOnTaskKeys: ["configure-product-scope"] },
    },
    {
      blockerKey: "activation-not-approved",
      title:
        "La revue readiness et l'activation pilote ne sont pas encore approuvees",
      domain: "activation",
      severity: "critical",
      detailsJson: { resolveOnTaskKeys: ["activation-review"] },
    },
  ];
}

function phaseFromDomain(domain: OnboardingTaskDomain): OnboardingCasePhase {
  switch (domain) {
    case "access":
      return "access_setup";
    case "sources":
      return "source_activation";
    case "mapping":
      return "mapping_validation";
    case "product":
      return "product_configuration";
    case "activation":
      return "activation";
    case "scope":
    default:
      return "intake";
  }
}

export function phaseFromProjectedTasks(
  tasks: readonly Pick<
    OnboardingCaseTask,
    "taskKey" | "domain" | "sortOrder" | "status"
  >[],
): OnboardingCasePhase {
  const orderedTasks = [...tasks].sort(
    (left, right) => left.sortOrder - right.sortOrder,
  );
  const nextTask = orderedTasks.find((task) => task.status !== "done");
  if (nextTask) {
    if (nextTask.taskKey === "close-hypercare") {
      return "hypercare";
    }
    return phaseFromDomain(nextTask.domain);
  }

  if (orderedTasks.some((task) => task.taskKey === "close-hypercare")) {
    return "hypercare";
  }
  return orderedTasks.length > 0
    ? phaseFromDomain(orderedTasks[orderedTasks.length - 1]!.domain)
    : "intake";
}

export function computeCaseProjectionSnapshot(input: {
  activationMode: OnboardingActivationMode;
  tasks: readonly Pick<
    OnboardingCaseTask,
    "taskKey" | "status" | "sortOrder" | "domain"
  >[];
  blockers: readonly Pick<OnboardingCaseBlocker, "severity" | "status">[];
  currentStatus?: OnboardingCaseStatus;
}): {
  caseStatus: OnboardingCaseStatus;
  readinessStatus: OnboardingReadinessStatus;
  readinessScore: number;
  phase: OnboardingCasePhase;
} {
  const totalTasks = input.tasks.length;
  const doneTasks = input.tasks.filter((task) => task.status === "done").length;
  const openBlockers = input.blockers.filter(
    (blocker) => blocker.status === "open",
  );
  const hasCriticalOpenBlocker = openBlockers.some(
    (blocker) => blocker.severity === "critical",
  );
  const hasWarningOpenBlocker = openBlockers.some(
    (blocker) => blocker.severity !== "critical",
  );

  const preActivationTasks = input.tasks.filter(
    (task) =>
      task.taskKey !== "execute-activation" &&
      task.taskKey !== "close-hypercare",
  );
  const donePreActivationTasks = preActivationTasks.filter(
    (task) => task.status === "done",
  ).length;
  const activationExecuted = input.tasks.some(
    (task) => task.taskKey === "execute-activation" && task.status === "done",
  );
  const hypercarePresent = input.tasks.some(
    (task) => task.taskKey === "close-hypercare",
  );

  let readinessStatus: OnboardingReadinessStatus = "not_started";
  if (donePreActivationTasks > 0 && preActivationTasks.length > 0) {
    readinessStatus = "in_progress";
  }
  if (hasCriticalOpenBlocker) {
    readinessStatus = "blocked";
  } else if (hasWarningOpenBlocker) {
    readinessStatus = "warning";
  } else if (
    preActivationTasks.length > 0 &&
    donePreActivationTasks === preActivationTasks.length
  ) {
    readinessStatus = "ready";
  }

  let caseStatus: OnboardingCaseStatus = hasCriticalOpenBlocker
    ? "blocked"
    : "in_progress";
  if (input.currentStatus === "cancelled") {
    caseStatus = "cancelled";
  }
  if (
    caseStatus !== "cancelled" &&
    preActivationTasks.length > 0 &&
    donePreActivationTasks === preActivationTasks.length
  ) {
    caseStatus =
      input.activationMode === "full" ? "ready_full" : "ready_limited";
  }
  if (caseStatus !== "cancelled" && activationExecuted) {
    caseStatus =
      input.activationMode === "full" ? "active_full" : "active_limited";
  }
  if (
    caseStatus !== "cancelled" &&
    (input.currentStatus === "completed" ||
      (totalTasks > 0 && doneTasks === totalTasks && hypercarePresent))
  ) {
    caseStatus = "completed";
  }

  return {
    caseStatus,
    readinessStatus,
    readinessScore:
      totalTasks === 0
        ? 0
        : Math.max(
            0,
            Math.min(100, Math.round((doneTasks / totalTasks) * 100)),
          ),
    phase: phaseFromProjectedTasks(input.tasks),
  };
}
