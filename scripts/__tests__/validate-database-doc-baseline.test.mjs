import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import test from "node:test";

import {
  collectMigrationInventory,
  collectModelInventory,
  validateDatabaseDocBaseline,
} from "../validate-database-doc-baseline.mjs";

const repoRoot = process.cwd();
const databaseDocPath = path.join(repoRoot, "docs/DATABASE.md");

test("database doc baseline validates the committed documentation", () => {
  const databaseMarkdown = readFileSync(databaseDocPath, "utf8");

  assert.deepEqual(
    validateDatabaseDocBaseline({
      databaseMarkdown,
      modelInventory: collectModelInventory(),
      migrationInventory: collectMigrationInventory(),
    }),
    [],
  );
});

test("database doc baseline rejects missing critical table mention", () => {
  const databaseMarkdown = readFileSync(databaseDocPath, "utf8").replaceAll(
    "`organizations`",
    "`organizations_removed`",
  );

  assert.match(
    validateDatabaseDocBaseline({
      databaseMarkdown,
      modelInventory: collectModelInventory(),
      migrationInventory: collectMigrationInventory(),
    }).join("\n"),
    /critical table `organizations`/,
  );
});

test("database doc baseline rejects missing integration section", () => {
  const databaseMarkdown = readFileSync(databaseDocPath, "utf8").replace(
    "## Plateforme d'integration",
    "## Integration supprimée",
  );

  assert.match(
    validateDatabaseDocBaseline({
      databaseMarkdown,
      modelInventory: collectModelInventory(),
      migrationInventory: collectMigrationInventory(),
    }).join("\n"),
    /Plateforme d'integration/,
  );
});
