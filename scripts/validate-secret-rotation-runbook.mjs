#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  loadRuntimeSecretInventory,
  validateRuntimeSecretInventory,
} from "./validate-runtime-secret-inventory.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");

const defaultRunbookPath = path.join(
  repoRoot,
  "docs/runbooks/security-secret-rotation.md",
);
const defaultInventoryPath = path.join(
  repoRoot,
  "docs/deployment/runtime-secrets-inventory.json",
);
const defaultMatrixPath = path.join(
  repoRoot,
  "docs/deployment/environment-secrets-owners-matrix.md",
);

const requiredHeadings = [
  "## Objectif",
  "## Scope",
  "## Matrice de rotation minimale",
  "## Declencheurs",
  "## Procedure",
  "## SLA",
  "## Check-list minimale post-rotation",
];

const requiredScopeSnippets = [
  "Secrets OIDC",
  "Tokens internes services",
  "Clés webhook et signatures tierces",
  "Clés API externes",
  "Clé HMAC",
  ".git/gate-signing.key",
];

const requiredReferences = [
  "docs/deployment/runtime-secrets-inventory.json",
  "docs/deployment/environment-secrets-owners-matrix.md",
  "~/.praedixa/release-manifest.key",
  ".git/gate-signing.key",
  "node scripts/validate-secret-rotation-runbook.mjs",
  "node scripts/validate-runtime-secret-inventory.mjs",
];

const requiredMatrixHeaders = [
  "Systeme",
  "Secrets couverts",
  "Owner principal",
  "Co-review minimum",
  "Cadence max",
  "Preuves minimales de cloture",
];

const runtimeEvidenceVerificationKeywords = [
  "smoke",
  "preflight",
  "login",
  "validation",
  "healthcheck",
  "mfa",
];

function normalizeForComparison(value) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function collapseWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function stripInlineCode(value) {
  return collapseWhitespace(value.replace(/`([^`]+)`/g, "$1"));
}

function extractInlineCodeValues(value) {
  return Array.from(value.matchAll(/`([^`]+)`/g), (match) => match[1].trim());
}

function extractSection(markdown, heading) {
  const normalizedHeading = normalizeForComparison(heading);
  const lines = markdown.split("\n");
  const startIndex = lines.findIndex(
    (line) => normalizeForComparison(line.trim()) === normalizedHeading,
  );
  if (startIndex === -1) {
    return "";
  }

  const sectionLines = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.startsWith("## ")) {
      break;
    }
    sectionLines.push(line);
  }
  return sectionLines.join("\n");
}

function isMarkdownTableSeparator(line) {
  const cells = line
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
  return (
    cells.length > 0 &&
    cells.every((cell) => cell.length > 0 && /^:?-{3,}:?$/.test(cell))
  );
}

function parseMarkdownTable(section) {
  const lines = section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|"));

  if (lines.length < 2) {
    return { headers: [], rows: [] };
  }

  const [headerLine, ...otherLines] = lines;
  const headers = headerLine
    .split("|")
    .slice(1, -1)
    .map((cell) => stripInlineCode(cell));
  const rows = [];

  for (const line of otherLines) {
    if (isMarkdownTableSeparator(line)) {
      continue;
    }
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => collapseWhitespace(cell));
    if (cells.length !== headers.length) {
      continue;
    }
    rows.push(
      Object.fromEntries(
        headers.map((header, index) => [header, cells[index]]),
      ),
    );
  }

  return { headers, rows };
}

function parseCadenceDays(value) {
  const match = value.match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function hasVerificationKeyword(value) {
  const normalizedValue = normalizeForComparison(value);
  return runtimeEvidenceVerificationKeywords.some((keyword) =>
    normalizedValue.includes(keyword),
  );
}

function collectInventoryServices(inventory) {
  return new Map(
    inventory.services.map((service) => [service.service_id, service]),
  );
}

function validateRotationMatrix(runbook, inventory, errors) {
  const section = extractSection(runbook, "## Matrice de rotation minimale");
  const { headers, rows } = parseMarkdownTable(section);

  for (const header of requiredMatrixHeaders) {
    if (
      !headers.some(
        (candidate) =>
          normalizeForComparison(candidate) === normalizeForComparison(header),
      )
    ) {
      errors.push(`rotation matrix is missing column ${header}`);
    }
  }

  if (rows.length === 0) {
    errors.push("rotation matrix must contain at least one data row");
    return;
  }

  const rowsBySystem = new Map();
  for (const row of rows) {
    const systemIds = extractInlineCodeValues(row.Systeme ?? "");
    if (systemIds.length !== 1) {
      errors.push(
        "rotation matrix rows must declare exactly one system identifier in backticks",
      );
      continue;
    }

    const [systemId] = systemIds;
    if (rowsBySystem.has(systemId)) {
      errors.push(`rotation matrix has duplicate row for system ${systemId}`);
      continue;
    }

    const owner = collapseWhitespace(row["Owner principal"] ?? "");
    const reviewers = collapseWhitespace(row["Co-review minimum"] ?? "");
    const cadence = collapseWhitespace(row["Cadence max"] ?? "");
    const evidence = collapseWhitespace(
      row["Preuves minimales de cloture"] ?? "",
    );
    const secretCodes = new Set(
      extractInlineCodeValues(row["Secrets couverts"] ?? ""),
    );
    const cadenceDays = parseCadenceDays(cadence);

    if (owner.length === 0) {
      errors.push(`rotation matrix row ${systemId} is missing Owner principal`);
    }
    if (reviewers.length === 0) {
      errors.push(
        `rotation matrix row ${systemId} is missing Co-review minimum`,
      );
    }
    if (cadenceDays === null) {
      errors.push(
        `rotation matrix row ${systemId} is missing a numeric cadence`,
      );
    }
    if (evidence.length === 0) {
      errors.push(
        `rotation matrix row ${systemId} is missing Preuves minimales de cloture`,
      );
    }
    if (secretCodes.size === 0) {
      errors.push(`rotation matrix row ${systemId} is missing secret coverage`);
    }

    rowsBySystem.set(systemId, {
      owner,
      reviewers,
      cadenceDays,
      evidence,
      secretCodes,
    });
  }

  const inventoryServices = collectInventoryServices(inventory);
  for (const [serviceId, service] of inventoryServices.entries()) {
    const row = rowsBySystem.get(serviceId);
    if (!row) {
      errors.push(`rotation matrix is missing row for system ${serviceId}`);
      continue;
    }

    if (
      normalizeForComparison(row.owner) !==
      normalizeForComparison(service.owner)
    ) {
      errors.push(
        `rotation matrix row ${serviceId} owner must equal ${service.owner}`,
      );
    }

    const normalizedReviewers = normalizeForComparison(row.reviewers);
    for (const reviewer of service.reviewers) {
      if (!normalizedReviewers.includes(normalizeForComparison(reviewer))) {
        errors.push(
          `rotation matrix row ${serviceId} reviewer list is missing ${reviewer}`,
        );
      }
    }

    if (
      row.cadenceDays === null ||
      row.cadenceDays > Number(service.rotation_sla_days)
    ) {
      errors.push(
        `rotation matrix row ${serviceId} cadence must be <= ${service.rotation_sla_days} jours`,
      );
    }

    const expectedSecretKeys = new Set(
      service.secret_groups.flatMap((group) => group.keys),
    );
    for (const key of expectedSecretKeys) {
      if (!row.secretCodes.has(key)) {
        errors.push(
          `rotation matrix row ${serviceId} is missing secret ${key}`,
        );
      }
    }

    const normalizedEvidence = normalizeForComparison(row.evidence);
    if (
      !normalizedEvidence.includes(
        normalizeForComparison(service.secret_path_prefix),
      )
    ) {
      errors.push(
        `rotation matrix row ${serviceId} evidence must reference ${service.secret_path_prefix}`,
      );
    }
    if (
      !normalizedEvidence.includes("revocation") &&
      !normalizedEvidence.includes("retrait")
    ) {
      errors.push(
        `rotation matrix row ${serviceId} evidence must mention revocation or retrait`,
      );
    }
    if (!hasVerificationKeyword(row.evidence)) {
      errors.push(
        `rotation matrix row ${serviceId} evidence must mention a runnable verification step`,
      );
    }
  }

  const releaseRow = rowsBySystem.get("release-signing-runner");
  if (!releaseRow) {
    errors.push(
      "rotation matrix is missing row for system release-signing-runner",
    );
  } else {
    if (
      normalizeForComparison(releaseRow.owner) !==
      normalizeForComparison("Infra/DevOps")
    ) {
      errors.push(
        "rotation matrix row release-signing-runner owner must equal Infra/DevOps",
      );
    }
    if (
      !normalizeForComparison(releaseRow.reviewers).includes(
        normalizeForComparison("Security review"),
      )
    ) {
      errors.push(
        "rotation matrix row release-signing-runner reviewer list must include Security review",
      );
    }
    if (releaseRow.cadenceDays === null || releaseRow.cadenceDays > 90) {
      errors.push(
        "rotation matrix row release-signing-runner cadence must be <= 90 jours",
      );
    }
    if (!releaseRow.secretCodes.has("~/.praedixa/release-manifest.key")) {
      errors.push(
        "rotation matrix row release-signing-runner must cover ~/.praedixa/release-manifest.key",
      );
    }
    const normalizedEvidence = normalizeForComparison(releaseRow.evidence);
    if (
      !normalizedEvidence.includes(
        normalizeForComparison("~/.praedixa/release-manifest.key"),
      )
    ) {
      errors.push(
        "rotation matrix row release-signing-runner evidence must reference ~/.praedixa/release-manifest.key",
      );
    }
    if (
      !normalizedEvidence.includes("revocation") &&
      !normalizedEvidence.includes("retrait")
    ) {
      errors.push(
        "rotation matrix row release-signing-runner evidence must mention revocation or retrait",
      );
    }
    if (
      !normalizedEvidence.includes(
        normalizeForComparison(
          "node scripts/validate-secret-rotation-runbook.mjs",
        ),
      )
    ) {
      errors.push(
        "rotation matrix row release-signing-runner evidence must mention node scripts/validate-secret-rotation-runbook.mjs",
      );
    }
  }

  const localGateRow = rowsBySystem.get("local-gate-signing");
  if (!localGateRow) {
    errors.push("rotation matrix is missing row for system local-gate-signing");
  } else {
    if (
      normalizeForComparison(localGateRow.owner) !==
      normalizeForComparison("Infra/DevOps")
    ) {
      errors.push(
        "rotation matrix row local-gate-signing owner must equal Infra/DevOps",
      );
    }
    if (
      !normalizeForComparison(localGateRow.reviewers).includes(
        normalizeForComparison("Security review"),
      )
    ) {
      errors.push(
        "rotation matrix row local-gate-signing reviewer list must include Security review",
      );
    }
    if (localGateRow.cadenceDays === null || localGateRow.cadenceDays > 90) {
      errors.push(
        "rotation matrix row local-gate-signing cadence must be <= 90 jours",
      );
    }
    if (!localGateRow.secretCodes.has(".git/gate-signing.key")) {
      errors.push(
        "rotation matrix row local-gate-signing must cover .git/gate-signing.key",
      );
    }
    const normalizedEvidence = normalizeForComparison(localGateRow.evidence);
    if (
      !normalizedEvidence.includes(
        normalizeForComparison(".git/gate-signing.key"),
      )
    ) {
      errors.push(
        "rotation matrix row local-gate-signing evidence must reference .git/gate-signing.key",
      );
    }
    if (
      !normalizedEvidence.includes("revocation") &&
      !normalizedEvidence.includes("retrait")
    ) {
      errors.push(
        "rotation matrix row local-gate-signing evidence must mention revocation or retrait",
      );
    }
    if (
      !normalizedEvidence.includes(normalizeForComparison("pnpm gate:verify"))
    ) {
      errors.push(
        "rotation matrix row local-gate-signing evidence must mention pnpm gate:verify",
      );
    }
  }

  for (const systemId of rowsBySystem.keys()) {
    if (
      systemId !== "release-signing-runner" &&
      systemId !== "local-gate-signing" &&
      !inventoryServices.has(systemId)
    ) {
      errors.push(`rotation matrix contains unknown system ${systemId}`);
    }
  }
}

export function validateSecretRotationRunbook(options = {}) {
  const runbookPath = options.runbookPath ?? defaultRunbookPath;
  const inventoryPath = options.inventoryPath ?? defaultInventoryPath;
  const matrixPath = options.matrixPath ?? defaultMatrixPath;
  const runbook = readFileSync(runbookPath, "utf8");
  const inventory = loadRuntimeSecretInventory(inventoryPath);
  const matrixMarkdown = readFileSync(matrixPath, "utf8");
  const errors = [];

  const normalizedRunbook = normalizeForComparison(runbook);

  for (const heading of requiredHeadings) {
    if (!normalizedRunbook.includes(normalizeForComparison(heading))) {
      errors.push(`runbook is missing heading ${heading}`);
    }
  }

  for (const snippet of requiredScopeSnippets) {
    if (!runbook.includes(snippet)) {
      errors.push(`runbook scope is missing ${snippet}`);
    }
  }

  for (const reference of requiredReferences) {
    if (!runbook.includes(reference)) {
      errors.push(`runbook is missing reference ${reference}`);
    }
  }

  validateRotationMatrix(runbook, inventory, errors);

  for (const error of validateRuntimeSecretInventory(inventory, {
    matrixMarkdown,
  })) {
    errors.push(`runtime inventory: ${error}`);
  }

  return errors;
}

function main() {
  const errors = validateSecretRotationRunbook();
  if (errors.length > 0) {
    for (const error of errors) {
      console.error(error);
    }
    process.exit(1);
  }
}

main();
