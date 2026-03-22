import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();

const parityManifest = [
  {
    contractPath: "contracts/decisionops/decision-contract.schema.json",
    tsPath: "packages/shared-types/src/domain/decision-contract.ts",
    checks: [
      { type: "jsonConst", jsonPath: ["properties", "kind", "const"], expectedInTs: 'kind: "DecisionContract"' },
      { type: "jsonConst", jsonPath: ["properties", "schema_version", "const"], expectedInTs: 'schemaVersion: "1.0.0"' },
      { type: "jsonEnum", jsonPath: ["properties", "status", "enum"], expectedValuesInTs: ["draft", "testing", "approved", "published", "archived"] },
    ],
  },
  {
    contractPath: "contracts/decisionops/decision-graph.schema.json",
    tsPath: "packages/shared-types/src/domain/decision-graph.ts",
    checks: [
      { type: "jsonConst", jsonPath: ["properties", "kind", "const"], expectedInTs: 'kind: "DecisionGraph"' },
      { type: "jsonConst", jsonPath: ["properties", "schema_version", "const"], expectedInTs: 'schemaVersion: "1.0.0"' },
    ],
  },
  {
    contractPath: "contracts/decisionops/approval.schema.json",
    tsPath: "packages/shared-types/src/domain/approval.ts",
    checks: [
      { type: "jsonConst", jsonPath: ["properties", "kind", "const"], expectedInTs: 'kind: "Approval"' },
      { type: "jsonConst", jsonPath: ["properties", "schema_version", "const"], expectedInTs: 'schemaVersion: "1.0.0"' },
      { type: "jsonEnum", jsonPath: ["properties", "status", "enum"], expectedValuesInTs: ["requested", "granted", "rejected", "expired", "canceled"] },
    ],
  },
  {
    contractPath: "contracts/decisionops/action-dispatch.schema.json",
    tsPath: "packages/shared-types/src/domain/action-dispatch.ts",
    checks: [
      { type: "jsonConst", jsonPath: ["properties", "kind", "const"], expectedInTs: 'kind: "ActionDispatch"' },
      { type: "jsonConst", jsonPath: ["properties", "schema_version", "const"], expectedInTs: 'schemaVersion: "1.0.0"' },
      { type: "jsonEnum", jsonPath: ["properties", "dispatch_mode", "enum"], expectedValuesInTs: ["dry_run", "live", "sandbox"] },
    ],
  },
  {
    contractPath: "contracts/decisionops/ledger-entry.schema.json",
    tsPath: "packages/shared-types/src/domain/ledger.ts",
    checks: [
      { type: "jsonConst", jsonPath: ["properties", "kind", "const"], expectedInTs: 'kind: "LedgerEntry"' },
      { type: "jsonConst", jsonPath: ["properties", "schema_version", "const"], expectedInTs: 'schemaVersion: "1.0.0"' },
      { type: "jsonEnum", jsonPath: ["properties", "status", "enum"], expectedValuesInTs: ["open", "measuring", "closed", "recalculated", "disputed"] },
    ],
  },
  {
    contractPath: "contracts/admin/permission-taxonomy.v1.json",
    tsPath: "packages/shared-types/src/admin-permissions.ts",
    checks: [{ type: "adminPermissions" }],
  },
  {
    contractPath: "contracts/openapi/public.yaml",
    tsPath: "packages/shared-types/src/api/public-contract/index.ts",
    checks: [{ type: "plainIncludes", expectedInTs: 'export * from "./response-schemas.js";' }],
  },
];

function getByJsonPath(value, jsonPath) {
  return jsonPath.reduce((current, segment) => current?.[segment], value);
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(repoRoot, relativePath), "utf8"));
}

function readText(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function checkAdminPermissions(contractJson, tsSource, errors, contractPath, tsPath) {
  const permissionKeys = Array.isArray(contractJson.permissions)
    ? contractJson.permissions
        .map((permission) => permission?.name)
        .filter((value) => typeof value === "string")
    : [];
  for (const key of permissionKeys) {
    if (!tsSource.includes(`"${key}"`)) {
      errors.push(`${tsPath} must include admin permission "${key}" mirrored from ${contractPath}`);
    }
  }
}

export function validateContractTsParity(manifest = parityManifest) {
  const errors = [];

  for (const entry of manifest) {
    const contractFullPath = path.join(repoRoot, entry.contractPath);
    const tsFullPath = path.join(repoRoot, entry.tsPath);

    if (!existsSync(contractFullPath)) {
      errors.push(`missing contract file: ${entry.contractPath}`);
      continue;
    }
    if (!existsSync(tsFullPath)) {
      errors.push(`missing TypeScript mirror: ${entry.tsPath}`);
      continue;
    }

    const tsSource = readText(entry.tsPath);
    const isJson = entry.contractPath.endsWith(".json");
    const contractJson = isJson ? readJson(entry.contractPath) : null;

    for (const check of entry.checks) {
      if (check.type === "plainIncludes") {
        if (!tsSource.includes(check.expectedInTs)) {
          errors.push(`${entry.tsPath} must include "${check.expectedInTs}" for ${entry.contractPath}`);
        }
        continue;
      }

      if (check.type === "adminPermissions") {
        checkAdminPermissions(contractJson, tsSource, errors, entry.contractPath, entry.tsPath);
        continue;
      }

      if (contractJson == null) {
        errors.push(`cannot run JSON parity check on non-JSON contract ${entry.contractPath}`);
        continue;
      }

      if (check.type === "jsonConst") {
        const value = getByJsonPath(contractJson, check.jsonPath);
        if (value == null) {
          errors.push(`${entry.contractPath} missing JSON path ${check.jsonPath.join(".")}`);
          continue;
        }
        if (!tsSource.includes(check.expectedInTs)) {
          errors.push(`${entry.tsPath} must include ${check.expectedInTs} mirrored from ${entry.contractPath}`);
        }
        continue;
      }

      if (check.type === "jsonEnum") {
        const values = getByJsonPath(contractJson, check.jsonPath);
        if (!Array.isArray(values)) {
          errors.push(`${entry.contractPath} missing enum at ${check.jsonPath.join(".")}`);
          continue;
        }
        for (const expectedValue of check.expectedValuesInTs) {
          if (!values.includes(expectedValue)) {
            errors.push(`${entry.contractPath} enum ${check.jsonPath.join(".")} must include "${expectedValue}"`);
          }
          if (!tsSource.includes(`"${expectedValue}"`)) {
            errors.push(`${entry.tsPath} must include "${expectedValue}" mirrored from ${entry.contractPath}`);
          }
        }
      }
    }
  }

  return errors;
}

export function runCli() {
  const errors = validateContractTsParity();
  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`[contract-ts-parity] ${error}`);
    }
    return 1;
  }
  console.log(`[contract-ts-parity] OK: ${parityManifest.length} mirrored contract(s) aligned with TypeScript`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = runCli();
}
