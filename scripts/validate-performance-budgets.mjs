#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

const defaultBudgetsPath = path.resolve(
  scriptDir,
  "../docs/performance/build-ready-budgets.md",
);
const defaultCapacityPath = path.resolve(
  scriptDir,
  "../docs/performance/capacity-envelopes.md",
);

const LOAD_CLASS_IDS = ["T1", "T2", "T3"];
const BUDGET_BASELINE_MARKER = "performance-budget-baseline";
const CAPACITY_BASELINE_MARKER = "performance-capacity-baseline";

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPositiveNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isNonNegativeNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function extractMarkedJsonBlock(markdown, markerId) {
  const pattern = new RegExp(
    `<!-- ${markerId}:start -->\\s*\\\`\\\`\\\`json\\s*([\\s\\S]*?)\\s*\\\`\\\`\\\`\\s*<!-- ${markerId}:end -->`,
  );
  const match = markdown.match(pattern);

  if (!match) {
    throw new Error(`Missing JSON block for marker ${markerId}`);
  }

  try {
    return JSON.parse(match[1]);
  } catch (error) {
    throw new Error(
      `Invalid JSON for marker ${markerId}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function loadPerformanceBudgetBaselines(
  budgetsPath = defaultBudgetsPath,
  capacityPath = defaultCapacityPath,
) {
  const budgetsMarkdown = readFileSync(budgetsPath, "utf8");
  const capacityMarkdown = readFileSync(capacityPath, "utf8");

  return {
    budgets: extractMarkedJsonBlock(budgetsMarkdown, BUDGET_BASELINE_MARKER),
    capacity: extractMarkedJsonBlock(
      capacityMarkdown,
      CAPACITY_BASELINE_MARKER,
    ),
  };
}

function pushError(errors, label, message) {
  errors.push(`${label}: ${message}`);
}

function validateMetadata(errors, baseline, label, expectedType) {
  if (!isPlainObject(baseline)) {
    pushError(errors, label, "baseline must be an object");
    return;
  }

  if (baseline.baseline_type !== expectedType) {
    pushError(errors, label, `baseline_type must be ${expectedType}`);
  }

  if (baseline.schema_version !== "1") {
    pushError(errors, label, 'schema_version must be "1"');
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(baseline.reference_date ?? ""))) {
    pushError(errors, label, "reference_date must use YYYY-MM-DD");
  }

  if (!LOAD_CLASS_IDS.includes(String(baseline.target_load_profile ?? ""))) {
    pushError(errors, label, "target_load_profile must be one of T1, T2, T3");
  }
}

function validateLoadClasses(errors, loadClasses, label) {
  if (!isPlainObject(loadClasses)) {
    pushError(errors, label, "load_classes must be an object");
    return;
  }

  const metrics = [
    "sites_per_org_max",
    "monthly_active_users_max",
    "active_connectors_max",
    "canonical_rows_per_day_max",
  ];

  for (const classId of LOAD_CLASS_IDS) {
    const loadClass = loadClasses[classId];
    if (!isPlainObject(loadClass)) {
      pushError(errors, label, `load_classes.${classId} must be an object`);
      continue;
    }

    for (const metric of metrics) {
      if (!isPositiveNumber(loadClass[metric])) {
        pushError(
          errors,
          label,
          `load_classes.${classId}.${metric} must be a positive number`,
        );
      }
    }
  }

  for (const metric of metrics) {
    const t1 = loadClasses.T1?.[metric];
    const t2 = loadClasses.T2?.[metric];
    const t3 = loadClasses.T3?.[metric];
    if (
      isPositiveNumber(t1) &&
      isPositiveNumber(t2) &&
      isPositiveNumber(t3) &&
      !(t1 <= t2 && t2 <= t3)
    ) {
      pushError(errors, label, `${metric} must be monotonic from T1 to T3`);
    }
  }
}

function validateUniqueIdRows(errors, rows, label) {
  if (!Array.isArray(rows) || rows.length === 0) {
    pushError(errors, label, "must be a non-empty array");
    return [];
  }

  const ids = new Set();
  const validRows = [];

  for (const [index, row] of rows.entries()) {
    if (!isPlainObject(row)) {
      pushError(errors, label, `[${index}] must be an object`);
      continue;
    }

    if (!isNonEmptyString(row.id)) {
      pushError(errors, label, `[${index}].id must be a non-empty string`);
      continue;
    }

    if (ids.has(row.id)) {
      pushError(errors, label, `duplicate id ${row.id}`);
      continue;
    }

    ids.add(row.id);
    validRows.push(row);
  }

  return validRows;
}

function validateLatencyRows(errors, rows, label, p95Key, p99Key) {
  for (const row of validateUniqueIdRows(errors, rows, label)) {
    if (!isPositiveNumber(row[p95Key])) {
      pushError(errors, label, `${row.id}.${p95Key} must be a positive number`);
    }
    if (!isPositiveNumber(row[p99Key])) {
      pushError(errors, label, `${row.id}.${p99Key} must be a positive number`);
    }
    if (
      isPositiveNumber(row[p95Key]) &&
      isPositiveNumber(row[p99Key]) &&
      row[p95Key] > row[p99Key]
    ) {
      pushError(errors, label, `${row.id} must keep ${p95Key} <= ${p99Key}`);
    }
  }
}

function validateCachePolicies(errors, rows, label) {
  for (const row of validateUniqueIdRows(errors, rows, label)) {
    if (!isNonNegativeNumber(row.ttl_seconds_min)) {
      pushError(errors, label, `${row.id}.ttl_seconds_min must be >= 0`);
    }
    if (!isNonNegativeNumber(row.ttl_seconds_max)) {
      pushError(errors, label, `${row.id}.ttl_seconds_max must be >= 0`);
    }
    if (
      isNonNegativeNumber(row.ttl_seconds_min) &&
      isNonNegativeNumber(row.ttl_seconds_max) &&
      row.ttl_seconds_min > row.ttl_seconds_max
    ) {
      pushError(
        errors,
        label,
        `${row.id} must keep ttl_seconds_min <= ttl_seconds_max`,
      );
    }
    if (!Array.isArray(row.scope) || row.scope.length === 0) {
      pushError(errors, label, `${row.id}.scope must be a non-empty array`);
    }
    if (
      !Array.isArray(row.requires_invalidation) ||
      row.requires_invalidation.length === 0
    ) {
      pushError(
        errors,
        label,
        `${row.id}.requires_invalidation must be a non-empty array`,
      );
    }
  }
}

function validateProtectedSurfaces(errors, rows, label) {
  for (const row of validateUniqueIdRows(errors, rows, label)) {
    if (row.allows_full_refresh !== false) {
      pushError(errors, label, `${row.id}.allows_full_refresh must stay false`);
    }
    if (!Array.isArray(row.proof_required) || row.proof_required.length === 0) {
      pushError(
        errors,
        label,
        `${row.id}.proof_required must be a non-empty array`,
      );
    }
  }
}

function validateDirectionalLimits(errors, rows, label) {
  for (const row of validateUniqueIdRows(errors, rows, label)) {
    if (!["max", "min"].includes(String(row.direction ?? ""))) {
      pushError(errors, label, `${row.id}.direction must be max or min`);
      continue;
    }
    if (!isNonEmptyString(row.unit)) {
      pushError(errors, label, `${row.id}.unit must be a non-empty string`);
    }
    if (!isPositiveNumber(row.standard)) {
      pushError(errors, label, `${row.id}.standard must be a positive number`);
    }
    if (!isPositiveNumber(row.soft)) {
      pushError(errors, label, `${row.id}.soft must be a positive number`);
    }
    if (!isPositiveNumber(row.hard)) {
      pushError(errors, label, `${row.id}.hard must be a positive number`);
    }
    if (
      isPositiveNumber(row.standard) &&
      isPositiveNumber(row.soft) &&
      isPositiveNumber(row.hard)
    ) {
      const valid =
        row.direction === "max"
          ? row.standard <= row.soft && row.soft <= row.hard
          : row.standard >= row.soft && row.soft >= row.hard;
      if (!valid) {
        pushError(
          errors,
          label,
          `${row.id} must respect ${row.direction} ordering across standard/soft/hard`,
        );
      }
    }
  }
}

function validateBackfillProfiles(errors, rows, label) {
  for (const row of validateUniqueIdRows(errors, rows, label)) {
    for (const key of [
      "max_days",
      "max_raw_rows",
      "p95_minutes",
      "p99_minutes",
      "max_active_per_org",
      "max_active_platform_wide",
    ]) {
      if (!isPositiveNumber(row[key])) {
        pushError(errors, label, `${row.id}.${key} must be a positive number`);
      }
    }
    if (
      isPositiveNumber(row.p95_minutes) &&
      isPositiveNumber(row.p99_minutes) &&
      row.p95_minutes > row.p99_minutes
    ) {
      pushError(
        errors,
        label,
        `${row.id} must keep p95_minutes <= p99_minutes`,
      );
    }
  }
}

function validateGuardrails(errors, rows, label) {
  for (const row of validateUniqueIdRows(errors, rows, label)) {
    if (!["greater_than", "less_than"].includes(String(row.comparison ?? ""))) {
      pushError(
        errors,
        label,
        `${row.id}.comparison must be greater_than or less_than`,
      );
      continue;
    }
    if (!isNonEmptyString(row.unit)) {
      pushError(errors, label, `${row.id}.unit must be a non-empty string`);
    }
    if (!isPositiveNumber(row.yellow)) {
      pushError(errors, label, `${row.id}.yellow must be a positive number`);
    }
    if (!isPositiveNumber(row.red)) {
      pushError(errors, label, `${row.id}.red must be a positive number`);
    }
    if (
      isPositiveNumber(row.yellow) &&
      isPositiveNumber(row.red) &&
      ((row.comparison === "greater_than" && row.yellow >= row.red) ||
        (row.comparison === "less_than" && row.yellow <= row.red))
    ) {
      pushError(errors, label, `${row.id} must keep yellow before red`);
    }
  }
}

function validateCostEnvelopes(errors, rows, label) {
  const validRows = validateUniqueIdRows(errors, rows, label);
  const byId = new Map(validRows.map((row) => [row.id, row]));

  for (const row of validRows) {
    if (!isPositiveNumber(row.ceiling_eur)) {
      pushError(
        errors,
        label,
        `${row.id}.ceiling_eur must be a positive number`,
      );
    }
  }

  const t1 = byId.get("tenant_variable_t1_monthly")?.ceiling_eur;
  const t2 = byId.get("tenant_variable_t2_monthly")?.ceiling_eur;
  const t3 = byId.get("tenant_variable_t3_monthly")?.ceiling_eur;
  if (
    isPositiveNumber(t1) &&
    isPositiveNumber(t2) &&
    isPositiveNumber(t3) &&
    !(t1 <= t2 && t2 <= t3)
  ) {
    pushError(
      errors,
      label,
      "tenant_variable_t1_monthly <= tenant_variable_t2_monthly <= tenant_variable_t3_monthly must hold",
    );
  }
}

function validateStringList(errors, values, label) {
  if (!Array.isArray(values) || values.length === 0) {
    pushError(errors, label, "must be a non-empty array");
    return;
  }

  const seen = new Set();
  for (const [index, value] of values.entries()) {
    if (!isNonEmptyString(value)) {
      pushError(errors, label, `[${index}] must be a non-empty string`);
      continue;
    }
    if (seen.has(value)) {
      pushError(errors, label, `duplicate value ${value}`);
      continue;
    }
    seen.add(value);
  }
}

export function validatePerformanceBudgetBaselines({ budgets, capacity }) {
  const errors = [];

  validateMetadata(errors, budgets, "budgets", "performance-budgets");
  validateMetadata(
    errors,
    capacity,
    "capacity",
    "performance-capacity-envelopes",
  );

  validateLoadClasses(errors, budgets.load_classes, "budgets.load_classes");
  validateLoadClasses(errors, capacity.load_classes, "capacity.load_classes");

  if (
    JSON.stringify(budgets.load_classes ?? null) !==
    JSON.stringify(capacity.load_classes ?? null)
  ) {
    pushError(
      errors,
      "cross-doc",
      "load_classes must stay identical between build-ready-budgets.md and capacity-envelopes.md",
    );
  }

  if (budgets.target_load_profile !== capacity.target_load_profile) {
    pushError(
      errors,
      "cross-doc",
      "target_load_profile must stay identical between both baselines",
    );
  }

  validateLatencyRows(
    errors,
    budgets.api_budgets,
    "budgets.api_budgets",
    "p95_ms",
    "p99_ms",
  );
  validateLatencyRows(
    errors,
    budgets.ui_budgets,
    "budgets.ui_budgets",
    "p95_ms",
    "p99_ms",
  );
  validateLatencyRows(
    errors,
    budgets.journey_budgets,
    "budgets.journey_budgets",
    "p95_ms",
    "p99_ms",
  );
  validateLatencyRows(
    errors,
    budgets.async_budgets,
    "budgets.async_budgets",
    "p95_minutes",
    "p99_minutes",
  );
  validateCachePolicies(
    errors,
    budgets.cache_policies,
    "budgets.cache_policies",
  );
  validateProtectedSurfaces(
    errors,
    budgets.full_refresh_protected_surfaces,
    "budgets.full_refresh_protected_surfaces",
  );

  validateDirectionalLimits(
    errors,
    capacity.connector_limits,
    "capacity.connector_limits",
  );
  validateBackfillProfiles(
    errors,
    capacity.backfill_profiles,
    "capacity.backfill_profiles",
  );
  validateDirectionalLimits(errors, capacity.quotas, "capacity.quotas");
  validateGuardrails(
    errors,
    capacity.resource_guardrails,
    "capacity.resource_guardrails",
  );
  validateCostEnvelopes(
    errors,
    capacity.cost_envelopes_eur,
    "capacity.cost_envelopes_eur",
  );
  validateStringList(
    errors,
    capacity.architecture_review_triggers,
    "capacity.architecture_review_triggers",
  );

  return errors;
}

function summarize(budgets, capacity) {
  return [
    `${budgets.api_budgets.length} api budgets`,
    `${budgets.ui_budgets.length} ui budgets`,
    `${budgets.async_budgets.length} async budgets`,
    `${capacity.connector_limits.length} connector limits`,
    `${capacity.quotas.length} quotas`,
  ].join(", ");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  if (![0, 2].includes(args.length)) {
    console.error(
      "[performance-budgets] Usage: node scripts/validate-performance-budgets.mjs [budgetsPath capacityPath]",
    );
    process.exit(1);
  }

  const [budgetsPath, capacityPath] = args;
  const baselines = loadPerformanceBudgetBaselines(
    budgetsPath ?? defaultBudgetsPath,
    capacityPath ?? defaultCapacityPath,
  );
  const errors = validatePerformanceBudgetBaselines(baselines);

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`[performance-budgets] ${error}`);
    }
    process.exit(1);
  }

  console.log(
    `[performance-budgets] OK: ${summarize(
      baselines.budgets,
      baselines.capacity,
    )}`,
  );
}
