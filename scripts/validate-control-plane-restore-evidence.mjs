#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultInventoryPath = path.resolve(
  scriptDir,
  "../docs/security/control-plane-metadata-inventory.json",
);

const validSummaryKinds = new Set(["inventory", "backup", "restore"]);
const validCheckStatuses = new Set(["pass", "fail"]);
const validBackupCheckStatuses = new Set(["pass", "fail", "not_applicable"]);
const sha256Pattern = /^[0-9a-f]{64}$/i;

export function loadControlPlaneInventory(filePath = defaultInventoryPath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

export function loadJsonFile(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

export function validateControlPlaneInventory(inventory) {
  const errors = [];

  if (!inventory || typeof inventory !== "object" || Array.isArray(inventory)) {
    return ["inventory must be a JSON object"];
  }

  if (inventory.inventory_type !== "control-plane-metadata") {
    errors.push(
      `inventory_type must be "control-plane-metadata" (got ${String(
        inventory.inventory_type ?? "<empty>",
      )})`,
    );
  }

  if (inventory.schema_version !== "1") {
    errors.push(
      `schema_version must be "1" (got ${String(
        inventory.schema_version ?? "<empty>",
      )})`,
    );
  }

  if (
    typeof inventory.inventory_version !== "string" ||
    inventory.inventory_version.length === 0
  ) {
    errors.push("inventory_version must be a non-empty string");
  }

  const checks = inventory.required_restore_checks;
  if (!Array.isArray(checks) || checks.length === 0) {
    errors.push("required_restore_checks must be a non-empty array");
    return errors;
  }

  const seenCheckIds = new Set();
  for (const [index, check] of checks.entries()) {
    const label = `required_restore_checks[${index}]`;
    if (!check || typeof check !== "object" || Array.isArray(check)) {
      errors.push(`${label} must be an object`);
      continue;
    }

    for (const field of [
      "check_id",
      "target",
      "description",
      "evidence_hint",
    ]) {
      if (typeof check[field] !== "string" || check[field].length === 0) {
        errors.push(`${label}.${field} must be a non-empty string`);
      }
    }

    if (typeof check.check_id === "string") {
      if (!/^[a-z0-9_]+$/.test(check.check_id)) {
        errors.push(`${label}.check_id must be snake_case`);
      }
      if (seenCheckIds.has(check.check_id)) {
        errors.push(`duplicate required restore check_id ${check.check_id}`);
      }
      seenCheckIds.add(check.check_id);
    }
  }

  return errors;
}

function validateSharedSummaryFields(summary, inventory, expectedType) {
  const errors = [];

  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    return ["summary must be a JSON object"];
  }

  if (summary.summary_type !== expectedType) {
    errors.push(
      `summary_type must be "${expectedType}" (got ${String(
        summary.summary_type ?? "<empty>",
      )})`,
    );
  }

  if (summary.schema_version !== "1") {
    errors.push(
      `schema_version must be "1" (got ${String(
        summary.schema_version ?? "<empty>",
      )})`,
    );
  }

  if (summary.inventory_version !== inventory.inventory_version) {
    errors.push(
      `inventory_version must match control-plane inventory (${inventory.inventory_version})`,
    );
  }

  if (typeof summary.status !== "string" || summary.status.length === 0) {
    errors.push("status must be a non-empty string");
  }

  if (
    typeof summary.instance_id !== "string" ||
    summary.instance_id.length === 0
  ) {
    errors.push("instance_id must be a non-empty string");
  }

  if (typeof summary.region !== "string" || summary.region.length === 0) {
    errors.push("region must be a non-empty string");
  }

  return errors;
}

function sha256Hex(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function validateEvidenceRef(
  evidence,
  label,
  errors,
  options = { verifyArtifacts: false },
) {
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    errors.push(`${label}.evidence must be an object`);
    return;
  }

  if (typeof evidence.path !== "string" || evidence.path.length === 0) {
    errors.push(`${label}.evidence.path must be a non-empty string`);
  }

  if (
    typeof evidence.sha256 !== "string" ||
    !sha256Pattern.test(evidence.sha256)
  ) {
    errors.push(`${label}.evidence.sha256 must be a 64-char hex digest`);
  }

  if (
    options.verifyArtifacts !== true ||
    typeof evidence.path !== "string" ||
    typeof evidence.sha256 !== "string" ||
    !sha256Pattern.test(evidence.sha256)
  ) {
    return;
  }

  if (!existsSync(evidence.path)) {
    errors.push(`${label}.evidence.path does not exist: ${evidence.path}`);
    return;
  }

  if (sha256Hex(evidence.path) !== evidence.sha256) {
    errors.push(`${label}.evidence digest mismatch for ${evidence.path}`);
  }
}

function collectSummaryChecks(summary, errors, allowedStatuses, options = {}) {
  if (!Array.isArray(summary.checks) || summary.checks.length === 0) {
    errors.push("checks must be a non-empty array");
    return new Map();
  }

  const checksById = new Map();
  for (const [index, check] of summary.checks.entries()) {
    const label = `checks[${index}]`;
    if (!check || typeof check !== "object" || Array.isArray(check)) {
      errors.push(`${label} must be an object`);
      continue;
    }

    if (typeof check.check_id !== "string" || check.check_id.length === 0) {
      errors.push(`${label}.check_id must be a non-empty string`);
      continue;
    }

    if (checksById.has(check.check_id)) {
      errors.push(`duplicate summary check_id ${check.check_id}`);
      continue;
    }

    if (!allowedStatuses.has(check.status)) {
      errors.push(
        `${label}.status must be one of ${Array.from(allowedStatuses).join(", ")}`,
      );
    }

    if (options.requireEvidence === true) {
      validateEvidenceRef(check.evidence, label, errors, {
        verifyArtifacts: options.verifyEvidenceArtifacts === true,
      });
    }

    checksById.set(check.check_id, check);
  }

  return checksById;
}

export function validateBackupEvidenceSummary(summary, inventory) {
  const errors = [
    ...validateSharedSummaryFields(
      summary,
      inventory,
      "database-backup-evidence",
    ),
  ];

  if (summary.status !== "pass") {
    errors.push("backup evidence status must be pass");
  }

  if (
    typeof summary.recorded_at !== "string" ||
    summary.recorded_at.length === 0
  ) {
    errors.push("recorded_at must be a non-empty string");
  }

  if (
    !Number.isInteger(summary.backup_count) ||
    Number(summary.backup_count) < 1
  ) {
    errors.push("backup_count must be an integer >= 1");
  }

  if (
    typeof summary.latest_backup_id !== "string" ||
    summary.latest_backup_id.length === 0
  ) {
    errors.push("latest_backup_id must be a non-empty string");
  }

  if (
    typeof summary.latest_backup_created_at !== "string" ||
    summary.latest_backup_created_at.length === 0
  ) {
    errors.push("latest_backup_created_at must be a non-empty string");
  }

  const checksById = collectSummaryChecks(
    summary,
    errors,
    validBackupCheckStatuses,
  );
  for (const requiredCheckId of [
    "instance_snapshot_recorded",
    "latest_backup_identified",
    "manual_backup_requested_or_not_required",
  ]) {
    if (!checksById.has(requiredCheckId)) {
      errors.push(`backup evidence missing check ${requiredCheckId}`);
    }
  }

  return errors;
}

export function validateRestoreEvidenceSummary(summary, inventory) {
  const errors = [
    ...validateSharedSummaryFields(
      summary,
      inventory,
      "database-restore-evidence",
    ),
  ];

  if (
    typeof summary.started_at !== "string" ||
    summary.started_at.length === 0 ||
    typeof summary.ended_at !== "string" ||
    summary.ended_at.length === 0
  ) {
    errors.push("started_at and ended_at must be non-empty strings");
  }

  if (
    typeof summary.source_database_name !== "string" ||
    summary.source_database_name.length === 0
  ) {
    errors.push("source_database_name must be a non-empty string");
  }

  if (typeof summary.backup_id !== "string" || summary.backup_id.length === 0) {
    errors.push("backup_id must be a non-empty string");
  }

  if (
    typeof summary.restored_database_name !== "string" ||
    summary.restored_database_name.length === 0
  ) {
    errors.push("restored_database_name must be a non-empty string");
  }

  if (
    !Number.isInteger(summary.rto_seconds) ||
    Number(summary.rto_seconds) < 0
  ) {
    errors.push("rto_seconds must be an integer >= 0");
  }

  if (typeof summary.verified_database_presence !== "boolean") {
    errors.push("verified_database_presence must be a boolean");
  }

  if (!validCheckStatuses.has(summary.status)) {
    errors.push("status must be one of pass, fail");
  }

  const checksById = collectSummaryChecks(summary, errors, validCheckStatuses, {
    requireEvidence: true,
    verifyEvidenceArtifacts: true,
  });
  if (!checksById.has("restored_database_visible")) {
    errors.push("restore evidence missing check restored_database_visible");
  }

  for (const requiredCheck of inventory.required_restore_checks) {
    const actual = checksById.get(requiredCheck.check_id);
    if (!actual) {
      errors.push(`restore evidence missing check ${requiredCheck.check_id}`);
      continue;
    }

    if (summary.status === "pass" && actual.status !== "pass") {
      errors.push(
        `restore evidence status=pass requires ${requiredCheck.check_id}=pass`,
      );
    }
  }

  if (summary.status === "pass") {
    if (summary.verified_database_presence !== true) {
      errors.push(
        "restore evidence status=pass requires verified_database_presence=true",
      );
    }

    const restoredDatabaseVisible = checksById.get("restored_database_visible");
    if (restoredDatabaseVisible?.status !== "pass") {
      errors.push(
        "restore evidence status=pass requires restored_database_visible=pass",
      );
    }
  }

  return errors;
}

function parseArgs(argv) {
  const args = {
    inventoryPath: defaultInventoryPath,
    summaryPath: "",
    kind: "inventory",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case "--inventory":
        args.inventoryPath = argv[index + 1] ?? "";
        index += 1;
        break;
      case "--summary":
        args.summaryPath = argv[index + 1] ?? "";
        index += 1;
        break;
      case "--kind":
        args.kind = argv[index + 1] ?? "";
        index += 1;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!validSummaryKinds.has(args.kind)) {
    throw new Error(
      `Unsupported kind: ${args.kind} (expected ${Array.from(
        validSummaryKinds,
      ).join("|")})`,
    );
  }

  if (args.kind !== "inventory" && args.summaryPath.length === 0) {
    throw new Error(`--summary is required for kind=${args.kind}`);
  }

  return args;
}

function runCli() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(
      `[control-plane-evidence] ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    process.exit(2);
  }

  const inventory = loadControlPlaneInventory(args.inventoryPath);
  const inventoryErrors = validateControlPlaneInventory(inventory);
  if (inventoryErrors.length > 0) {
    for (const error of inventoryErrors) {
      console.error(`[control-plane-evidence] ${error}`);
    }
    process.exit(1);
  }

  if (args.kind === "inventory") {
    console.log(
      `[control-plane-evidence] OK: inventory ${inventory.inventory_version} with ${inventory.required_restore_checks.length} required restore checks`,
    );
    return;
  }

  const summary = loadJsonFile(args.summaryPath);
  const summaryErrors =
    args.kind === "backup"
      ? validateBackupEvidenceSummary(summary, inventory)
      : validateRestoreEvidenceSummary(summary, inventory);

  if (summaryErrors.length > 0) {
    for (const error of summaryErrors) {
      console.error(`[control-plane-evidence] ${error}`);
    }
    process.exit(1);
  }

  console.log(
    `[control-plane-evidence] OK: ${args.kind} summary validated against inventory ${inventory.inventory_version}`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runCli();
}
