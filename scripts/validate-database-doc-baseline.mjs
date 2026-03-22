import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const modelDir = path.join(repoRoot, "app-api/app/models");
const migrationDir = path.join(repoRoot, "app-api/alembic/versions");
const databaseDocPath = path.join(repoRoot, "docs/DATABASE.md");

const requiredCriticalTables = [
  "organizations",
  "sites",
  "users",
  "client_datasets",
  "dataset_columns",
  "ingestion_log",
  "canonical_records",
  "coverage_alerts",
  "operational_decisions",
  "proof_records",
  "decision_approvals",
  "action_dispatches",
  "decision_ledger_entries",
  "onboarding_cases",
  "onboarding_case_tasks",
  "integration_connections",
  "integration_sync_runs",
  "integration_raw_events",
];

const requiredCriticalMigrations = [
  "019_remove_orphan_models.py",
  "026_integration_platform_foundation.py",
  "027_decisionops_runtime_persistence.py",
  "028_onboarding_bpm_foundation.py",
];

function listFiles(dirPath) {
  return readdirSync(dirPath)
    .filter((entry) => {
      const fullPath = path.join(dirPath, entry);
      return statSync(fullPath).isFile();
    })
    .sort();
}

export function collectModelInventory(dirPath = modelDir) {
  const inventory = [];

  for (const entry of listFiles(dirPath)) {
    if (!entry.endsWith(".py") || entry === "__init__.py") {
      continue;
    }

    const fullPath = path.join(dirPath, entry);
    const source = readFileSync(fullPath, "utf8");
    const tableNames = [...source.matchAll(/__tablename__\s*=\s*["']([^"']+)["']/g)]
      .map((match) => match[1])
      .sort();

    inventory.push({
      file: path.relative(repoRoot, fullPath),
      tableNames,
    });
  }

  return inventory;
}

export function collectMigrationInventory(dirPath = migrationDir) {
  return listFiles(dirPath).filter((entry) => entry.endsWith(".py"));
}

export function validateDatabaseDocBaseline({
  databaseMarkdown,
  modelInventory,
  migrationInventory,
}) {
  const errors = [];

  for (const tableName of requiredCriticalTables) {
    if (!databaseMarkdown.includes(`\`${tableName}\``)) {
      errors.push(`docs/DATABASE.md must mention critical table \`${tableName}\``);
    }
  }

  for (const migrationFile of requiredCriticalMigrations) {
    if (!migrationInventory.includes(migrationFile)) {
      errors.push(`required migration missing from inventory: ${migrationFile}`);
      continue;
    }
    if (!databaseMarkdown.includes(`\`${migrationFile}\``)) {
      errors.push(
        `docs/DATABASE.md must mention critical migration \`${migrationFile}\``,
      );
    }
  }

  const modelTables = new Set(
    modelInventory.flatMap((entry) => entry.tableNames).filter(Boolean),
  );

  for (const tableName of requiredCriticalTables) {
    if (!modelTables.has(tableName)) {
      errors.push(`critical table not found in model inventory: ${tableName}`);
    }
  }

  if (!databaseMarkdown.includes("## Plateforme d'integration")) {
    errors.push("docs/DATABASE.md must contain the 'Plateforme d'integration' section");
  }

  for (const runtimeTable of ["connector_runtime_snapshots", "connector_secret_records"]) {
    if (!databaseMarkdown.includes(`\`${runtimeTable}\``)) {
      errors.push(
        `docs/DATABASE.md must mention connectors runtime store \`${runtimeTable}\``,
      );
    }
  }

  return errors;
}

function parseArgs(argv) {
  return {
    printJson: argv.includes("--print-json"),
  };
}

function buildInventorySnapshot() {
  return {
    modelInventory: collectModelInventory(),
    migrationInventory: collectMigrationInventory(),
  };
}

export function runCli(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const databaseMarkdown = readFileSync(databaseDocPath, "utf8");
  const inventory = buildInventorySnapshot();
  const errors = validateDatabaseDocBaseline({
    databaseMarkdown,
    modelInventory: inventory.modelInventory,
    migrationInventory: inventory.migrationInventory,
  });

  if (options.printJson) {
    console.log(
      JSON.stringify(
        {
          ok: errors.length === 0,
          ...inventory,
          errors,
        },
        null,
        2,
      ),
    );
    return errors.length === 0 ? 0 : 1;
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`[database-doc-baseline] ${error}`);
    }
    return 1;
  }

  console.log(
    `[database-doc-baseline] OK: ${inventory.modelInventory.length} model files, ${inventory.migrationInventory.length} migrations, critical database doc baseline aligned`,
  );
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = runCli();
}
