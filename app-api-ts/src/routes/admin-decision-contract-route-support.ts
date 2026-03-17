import { z } from "zod";
import type {
  DecisionContract,
  DecisionContractTransition,
} from "@praedixa/shared-types/domain";
import type { DecisionContractStudioCreateRequest } from "@praedixa/shared-types/api";

import { failure } from "../response.js";
import { DecisionContractRuntimeError } from "../services/decision-contract-runtime-support.js";
import { PersistenceError } from "../services/persistence.js";

const DECISION_ENTITY_TYPES = [
  "organization",
  "site",
  "team",
  "flow",
  "route",
  "order_aggregate",
  "stock_node",
  "period",
] as const;
const DECISION_SELECTOR_MODES = ["all", "ids", "query"] as const;
const DECISION_PACKS = ["coverage", "flow", "allocation", "core"] as const;
const DECISION_CONTRACT_STATUSES = [
  "draft",
  "testing",
  "approved",
  "published",
  "archived",
] as const;
const DECISION_CONTRACT_TRANSITIONS = [
  "submit_for_testing",
  "approve",
  "publish",
  "archive",
  "reopen_draft",
] as const satisfies readonly DecisionContractTransition[];

export const decisionContractStudioListQuerySchema = z.object({
  workspaceId: z.string().trim().min(1).optional(),
  pack: z.enum(DECISION_PACKS).optional(),
  statuses: z.array(z.enum(DECISION_CONTRACT_STATUSES)).optional(),
  search: z.string().trim().min(1).optional(),
  includeArchived: z.boolean().optional(),
});
export const decisionContractStudioCreateSchema = z.object({
  templateId: z.string().trim().min(1),
  templateVersion: z.number().int().positive(),
  contractId: z.string().trim().min(1),
  workspaceId: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1),
  description: z.string().trim().max(500).optional(),
  reason: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(500).optional(),
  tags: z.array(z.string().trim().min(1).max(64)).max(12).optional(),
  scopeOverrides: z
    .object({
      entityType: z.enum(DECISION_ENTITY_TYPES),
      selector: z
        .object({
          mode: z.enum(DECISION_SELECTOR_MODES),
          ids: z.array(z.string().trim().min(1)).max(100).optional(),
          query: z.string().trim().max(240).optional(),
        })
        .optional(),
      horizonId: z.string().trim().min(1).max(64).optional(),
      dimensions: z.record(z.string(), z.string().trim()).optional(),
    })
    .optional(),
});
const decisionContractPayloadSchema = z.custom<DecisionContract>(
  (value) =>
    value != null && typeof value === "object" && !Array.isArray(value),
  "DecisionContract payload is required.",
);
export const decisionContractStudioSaveMutationSchema = z.union([
  z.object({
    contract: decisionContractPayloadSchema,
  }),
  decisionContractStudioCreateSchema,
]);
export const decisionContractStudioTransitionSchema = z.object({
  transition: z.enum(DECISION_CONTRACT_TRANSITIONS),
  reason: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(500).optional(),
});
export const decisionContractStudioForkSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().max(500).optional(),
  reason: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(500).optional(),
});
export const decisionContractStudioRollbackSchema = z.object({
  targetVersion: z.number().int().positive(),
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().max(500).optional(),
  reason: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(500).optional(),
});

const adminAllowedRoles = ["super_admin"] as const;
const adminOnly = { allowedRoles: adminAllowedRoles };
export const adminOrgRead = {
  ...adminOnly,
  requiredPermissions: ["admin:org:read"] as const,
};
export const adminOrgWrite = {
  ...adminOnly,
  requiredPermissions: ["admin:org:write"] as const,
};

export function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function parsePositiveInteger(
  value: string | undefined,
  label: string,
): number {
  if (!value || !/^[1-9]\d*$/.test(value)) {
    throw new Error(`${label} must be a positive integer`);
  }
  return Number.parseInt(value, 10);
}

export function extractDecisionContractSaveReason(contract: unknown): string {
  if (!contract || typeof contract !== "object") {
    return "admin_contract_save";
  }

  const audit =
    "audit" in contract && contract.audit && typeof contract.audit === "object"
      ? contract.audit
      : null;
  if (!audit) {
    return "admin_contract_save";
  }

  const changeReason =
    "changeReason" in audit && typeof audit.changeReason === "string"
      ? audit.changeReason.trim()
      : "";
  return changeReason.length > 0 ? changeReason : "admin_contract_save";
}

export function decisionContractRuntimeFailure(
  error: unknown,
  requestId: string,
  fallbackCode: string,
  fallbackMessage: string,
) {
  if (error instanceof DecisionContractRuntimeError) {
    return failure(error.code, error.message, requestId, error.statusCode);
  }

  if (error instanceof PersistenceError) {
    return failure(
      error.code,
      error.message,
      requestId,
      error.statusCode,
      error.details,
    );
  }

  return failure(
    fallbackCode,
    error instanceof Error ? error.message : fallbackMessage,
    requestId,
    400,
  );
}

export function normalizeDecisionScopeOverrides(
  value: DecisionContractStudioCreateRequest["scopeOverrides"],
): DecisionContractStudioCreateRequest["scopeOverrides"] {
  if (!value) {
    return undefined;
  }

  const selector =
    value.selector?.mode == null
      ? undefined
      : value.selector.mode === "ids"
        ? {
            mode: "ids" as const,
            ids: value.selector.ids ? [...value.selector.ids] : [],
          }
        : value.selector.mode === "query"
          ? {
              mode: "query" as const,
              query: value.selector.query,
            }
          : { mode: "all" as const };

  return {
    entityType: value.entityType,
    selector,
    horizonId: value.horizonId,
    dimensions: value.dimensions,
  };
}
