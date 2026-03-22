import assert from "node:assert/strict";
import test from "node:test";

import {
  runCli,
  validateSchemaDocChangeParity,
} from "../check-schema-doc-change-parity.mjs";

test("accepts changes when no schema file changed", () => {
  const result = validateSchemaDocChangeParity([
    "README.md",
    "docs/cto/README.md",
  ]);

  assert.deepEqual(result.errors, []);
  assert.equal(result.schemaFiles.length, 0);
});

test("rejects schema changes without durable docs", () => {
  const result = validateSchemaDocChangeParity([
    "app-api/app/models/integration.py",
    "app-api/alembic/versions/026_integration_platform_foundation.py",
  ]);

  assert.match(result.errors.join("\n"), /Schema files changed without durable documentation update/);
});

test("accepts schema changes when docs DATABASE or CTO are touched", () => {
  const result = validateSchemaDocChangeParity([
    "app-api/app/models/integration.py",
    "docs/DATABASE.md",
    "docs/cto/22-auth-modes-connecteurs-et-audit-integration.md",
  ]);

  assert.deepEqual(result.errors, []);
  assert.equal(result.schemaFiles.length, 1);
  assert.equal(result.docFiles.length, 2);
});

test("runCli returns non-zero when changed files violate parity", () => {
  assert.equal(
    runCli([
      "--changed-file",
      "app-api/app/models/integration.py",
      "--changed-file",
      "app-api/alembic/versions/026_integration_platform_foundation.py",
    ]),
    1,
  );
});
