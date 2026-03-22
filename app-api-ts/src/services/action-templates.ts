import type {
  ActionDispatchRetryPolicy,
  ActionFallbackChannel,
  ActionTemplateRef,
  DecisionApprovalRequirement,
} from "@praedixa/shared-types/domain";
import type {
  ActionTemplateListRequest,
  ActionTemplateListResponse,
  ActionTemplateResolveRequest,
  ActionTemplateResolveResponse,
} from "@praedixa/shared-types/api";

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

export interface ActionTemplate extends ActionTemplateRef {
  kind: "ActionTemplate";
  schemaVersion: "1.0.0";
  name: string;
  description?: string;
  status: ActionTemplateStatus;
  actionType: string;
  destinationType: string;
  destinationSystem: string;
  payloadSchemaHints: readonly ActionTemplatePayloadSchemaHint[];
  requiredApprovals: readonly DecisionApprovalRequirement[];
  retryPolicy: ActionDispatchRetryPolicy;
  idempotencyPolicy: ActionTemplateIdempotencyPolicy;
  dryRun: ActionTemplateDryRunCapability;
  fallback: ActionTemplateFallbackCapability;
  tags?: readonly string[];
}

export interface ListActionTemplatesInput {
  actionType?: string;
  destinationType?: string;
  includeDeprecated?: boolean;
  search?: string;
  tags?: readonly string[];
}

export interface ResolveActionTemplateInput {
  actionType: string;
  destinationType: string;
  templateId?: string;
  templateVersion?: number;
  includeDeprecated?: boolean;
}

const ACTION_TEMPLATES = [
  {
    kind: "ActionTemplate",
    schemaVersion: "1.0.0",
    templateId: "wfm.shift.schedule_adjust",
    templateVersion: 1,
    name: "WFM shift adjustment",
    description: "Deprecated UKG-compatible shift adjustment payload.",
    status: "deprecated",
    actionType: "schedule.adjust",
    destinationType: "wfm.shift",
    destinationSystem: "ukg",
    payloadSchemaHints: [
      {
        path: "site_code",
        kind: "string",
        required: true,
        description: "Canonical persisted site code.",
      },
      {
        path: "shift_date",
        kind: "string",
        required: true,
        format: "date",
      },
      {
        path: "delta_headcount",
        kind: "integer",
        required: true,
      },
    ],
    requiredApprovals: [
      {
        ruleId: "ops_manager_review",
        approverRole: "ops_manager",
        minStepOrder: 1,
      },
    ],
    retryPolicy: {
      maxAttempts: 2,
      retryableErrorCodes: ["UKG_RATE_LIMIT", "UKG_UPSTREAM_5XX"],
      backoffStrategy: "exponential",
      initialDelayMs: 1000,
      maxDelayMs: 10000,
    },
    idempotencyPolicy: {
      mode: "required",
      scope: "recommendation",
      keyTemplate: "{{contractId}}:{{recommendationId}}:{{destinationType}}",
      ttlHours: 48,
    },
    dryRun: {
      supported: true,
      mode: "payload_preview",
    },
    fallback: {
      supported: true,
      channel: "task_copy",
      humanRequired: true,
    },
    tags: ["coverage", "workforce"],
  },
  {
    kind: "ActionTemplate",
    schemaVersion: "1.0.0",
    templateId: "wfm.shift.schedule_adjust",
    templateVersion: 2,
    name: "WFM shift adjustment",
    description: "Current UKG-compatible shift adjustment payload.",
    status: "active",
    actionType: "schedule.adjust",
    destinationType: "wfm.shift",
    destinationSystem: "ukg",
    payloadSchemaHints: [
      {
        path: "site_code",
        kind: "string",
        required: true,
        description: "Canonical persisted site code.",
      },
      {
        path: "effective_date",
        kind: "string",
        required: true,
        format: "date",
      },
      {
        path: "delta_headcount",
        kind: "integer",
        required: true,
      },
      {
        path: "reason_code",
        kind: "enum",
        required: true,
        allowedValues: ["coverage_gap", "absence", "peak_activity"],
      },
    ],
    requiredApprovals: [
      {
        ruleId: "ops_manager_review",
        approverRole: "ops_manager",
        minStepOrder: 1,
      },
      {
        ruleId: "finance_review",
        approverRole: "finance_controller",
        minStepOrder: 2,
        thresholdKey: "overtime_budget_eur",
      },
    ],
    retryPolicy: {
      maxAttempts: 3,
      retryableErrorCodes: [
        "UKG_RATE_LIMIT",
        "UKG_TIMEOUT",
        "UKG_UPSTREAM_5XX",
      ],
      backoffStrategy: "exponential",
      initialDelayMs: 1000,
      maxDelayMs: 15000,
    },
    idempotencyPolicy: {
      mode: "required",
      scope: "recommendation",
      keyTemplate: "{{contractId}}:{{recommendationId}}:{{destinationType}}",
      ttlHours: 72,
    },
    dryRun: {
      supported: true,
      mode: "connector_validation",
      requiresSandbox: true,
    },
    fallback: {
      supported: true,
      channel: "task_copy",
      humanRequired: true,
    },
    tags: ["coverage", "workforce"],
  },
  {
    kind: "ActionTemplate",
    schemaVersion: "1.0.0",
    templateId: "messaging.slack.notify_team",
    templateVersion: 1,
    name: "Slack team notification",
    status: "active",
    actionType: "notify.team",
    destinationType: "messaging.slack",
    destinationSystem: "slack",
    payloadSchemaHints: [
      {
        path: "channel_id",
        kind: "string",
        required: true,
      },
      {
        path: "message",
        kind: "string",
        required: true,
      },
    ],
    requiredApprovals: [],
    retryPolicy: {
      maxAttempts: 2,
      retryableErrorCodes: ["SLACK_RATE_LIMIT", "SLACK_TIMEOUT"],
      backoffStrategy: "fixed",
      initialDelayMs: 2000,
      maxDelayMs: 2000,
    },
    idempotencyPolicy: {
      mode: "optional",
      scope: "payload_hash",
      keyTemplate: "{{destinationType}}:{{payloadHash}}",
      ttlHours: 24,
    },
    dryRun: {
      supported: true,
      mode: "payload_preview",
    },
    fallback: {
      supported: false,
    },
    tags: ["notification"],
  },
  {
    kind: "ActionTemplate",
    schemaVersion: "1.0.0",
    templateId: "ticketing.jira.create_task",
    templateVersion: 1,
    name: "Jira task creation",
    status: "active",
    actionType: "task.create",
    destinationType: "ticketing.jira",
    destinationSystem: "jira",
    payloadSchemaHints: [
      {
        path: "project_key",
        kind: "string",
        required: true,
      },
      {
        path: "summary",
        kind: "string",
        required: true,
      },
      {
        path: "priority",
        kind: "enum",
        required: true,
        allowedValues: ["low", "medium", "high", "critical"],
      },
    ],
    requiredApprovals: [
      {
        ruleId: "ops_manager_review",
        approverRole: "ops_manager",
        minStepOrder: 1,
      },
    ],
    retryPolicy: {
      maxAttempts: 2,
      retryableErrorCodes: ["JIRA_RATE_LIMIT", "JIRA_TIMEOUT"],
      backoffStrategy: "fixed",
      initialDelayMs: 1000,
      maxDelayMs: 1000,
    },
    idempotencyPolicy: {
      mode: "required",
      scope: "action",
      keyTemplate: "{{actionId}}:{{destinationType}}",
      ttlHours: 168,
    },
    dryRun: {
      supported: true,
      mode: "payload_preview",
    },
    fallback: {
      supported: true,
      channel: "export",
      humanRequired: false,
    },
    tags: ["fallback", "ticketing"],
  },
] as const satisfies readonly ActionTemplate[];

function compareTemplates(left: ActionTemplate, right: ActionTemplate): number {
  return (
    left.destinationType.localeCompare(right.destinationType) ||
    left.actionType.localeCompare(right.actionType) ||
    left.templateId.localeCompare(right.templateId) ||
    right.templateVersion - left.templateVersion
  );
}

function clonePayloadHint(
  hint: ActionTemplatePayloadSchemaHint,
): ActionTemplatePayloadSchemaHint {
  return {
    ...hint,
    ...(hint.allowedValues == null
      ? {}
      : { allowedValues: [...hint.allowedValues] }),
  };
}

function cloneTemplate(template: ActionTemplate): ActionTemplate {
  return {
    ...template,
    payloadSchemaHints: template.payloadSchemaHints.map(clonePayloadHint),
    requiredApprovals: template.requiredApprovals.map((approval) => ({
      ...approval,
    })),
    retryPolicy: {
      ...template.retryPolicy,
      retryableErrorCodes: [...template.retryPolicy.retryableErrorCodes],
    },
    idempotencyPolicy: {
      ...template.idempotencyPolicy,
    },
    dryRun: {
      ...template.dryRun,
    },
    fallback: {
      ...template.fallback,
    },
    ...(template.tags == null ? {} : { tags: [...template.tags] }),
  };
}

function matchesListFilters(
  template: ActionTemplate,
  filters: ListActionTemplatesInput,
): boolean {
  if (!filters.includeDeprecated && template.status !== "active") {
    return false;
  }

  if (
    filters.actionType != null &&
    template.actionType !== filters.actionType
  ) {
    return false;
  }

  if (
    filters.destinationType != null &&
    template.destinationType !== filters.destinationType
  ) {
    return false;
  }

  if (
    filters.tags != null &&
    filters.tags.some((tag) => !(template.tags ?? []).includes(tag))
  ) {
    return false;
  }

  if (filters.search != null) {
    const search = filters.search.trim().toLowerCase();
    if (search.length === 0) {
      return false;
    }

    const haystack = [
      template.templateId,
      template.name,
      template.description,
      template.actionType,
      template.destinationType,
      template.destinationSystem,
      ...(template.tags ?? []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (!haystack.includes(search)) {
      return false;
    }
  }

  return true;
}

function findTemplateById(
  templateId: string,
  templateVersion?: number,
): ActionTemplate | undefined {
  const candidates = ACTION_TEMPLATES.filter(
    (template) =>
      template.templateId === templateId &&
      (templateVersion == null || template.templateVersion === templateVersion),
  ).sort(compareTemplates);

  return candidates[0];
}

function assertTemplateCompatibility(
  template: ActionTemplate,
  input: ResolveActionTemplateInput,
): void {
  if (template.actionType !== input.actionType) {
    throw new Error(
      `Action template ${template.templateId}@${template.templateVersion} is incompatible with action type ${input.actionType}.`,
    );
  }

  if (template.destinationType !== input.destinationType) {
    throw new Error(
      `Action template ${template.templateId}@${template.templateVersion} is incompatible with destination type ${input.destinationType}.`,
    );
  }

  if (!input.includeDeprecated && template.status !== "active") {
    throw new Error(
      `Action template ${template.templateId}@${template.templateVersion} is not active.`,
    );
  }
}

export function listActionTemplates(
  input: ListActionTemplatesInput = {},
): readonly ActionTemplate[] {
  return ACTION_TEMPLATES.filter((template) =>
    matchesListFilters(template, input),
  )
    .sort(compareTemplates)
    .map(cloneTemplate);
}

export function resolveActionTemplate(
  input: ResolveActionTemplateInput,
): ActionTemplate {
  if (input.templateId != null) {
    const template = findTemplateById(input.templateId, input.templateVersion);

    if (template == null) {
      throw new Error(
        `Unknown action template ${input.templateId}${input.templateVersion == null ? "" : `@${input.templateVersion}`}.`,
      );
    }

    assertTemplateCompatibility(template, input);
    return cloneTemplate(template);
  }

  const compatible = listActionTemplates({
    actionType: input.actionType,
    destinationType: input.destinationType,
    ...(input.includeDeprecated !== undefined
      ? { includeDeprecated: input.includeDeprecated }
      : {}),
  });

  if (compatible.length === 0) {
    throw new Error(
      `No action template supports action type ${input.actionType} for destination type ${input.destinationType}.`,
    );
  }

  return compatible[0]!;
}

export function listActionTemplatesResponse(
  input: ActionTemplateListRequest = {},
): ActionTemplateListResponse {
  const items = listActionTemplates(input);
  return {
    total: items.length,
    items,
  };
}

export function resolveActionTemplateResponse(
  input: ActionTemplateResolveRequest,
): ActionTemplateResolveResponse {
  return {
    template: resolveActionTemplate(input),
  };
}
