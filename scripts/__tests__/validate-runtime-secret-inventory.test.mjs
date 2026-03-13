import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import test from "node:test";

import {
  loadRuntimeSecretInventory,
  parseRuntimeSecretDocRefs,
  validateRuntimeSecretInventory,
} from "../validate-runtime-secret-inventory.mjs";

const repoRoot = process.cwd();
const inventoryPath = path.join(
  repoRoot,
  "docs/deployment/runtime-secrets-inventory.json",
);
const matrixPath = path.join(
  repoRoot,
  "docs/deployment/environment-secrets-owners-matrix.md",
);

test("runtime secret inventory validates the committed baseline", () => {
  const inventory = loadRuntimeSecretInventory(inventoryPath);
  const matrixMarkdown = readFileSync(matrixPath, "utf8");

  assert.deepEqual(
    validateRuntimeSecretInventory(inventory, { matrixMarkdown }),
    [],
  );
});

test("runtime secret inventory rejects path prefix drift", () => {
  const inventory = loadRuntimeSecretInventory(inventoryPath);
  inventory.services[0].secret_path_prefix = "/praedixa/staging/wrong/runtime";

  assert.match(
    validateRuntimeSecretInventory(inventory, {
      matrixMarkdown: readFileSync(matrixPath, "utf8"),
    }).join("\n"),
    /secret_path_prefix must equal/,
  );
});

test("runtime secret inventory structure-only mode does not depend on markdown parsing", () => {
  const inventory = loadRuntimeSecretInventory(inventoryPath);

  assert.deepEqual(
    validateRuntimeSecretInventory(inventory, {
      checkMatrixSync: false,
      matrixMarkdown: "not-a-table",
    }),
    [],
  );
});

test("runtime secret inventory rejects invalid frontend public origin metadata", () => {
  const inventory = loadRuntimeSecretInventory(inventoryPath);
  inventory.services[2].public_origin = {
    required_in_preflight: true,
    env_keys: ["NEXT_PUBLIC_APP_ORIGIN"],
    expected_origin: "http://staging-app.praedixa.com/login",
    purpose: "broken frontend public origin",
  };

  assert.match(
    validateRuntimeSecretInventory(inventory, {
      matrixMarkdown: readFileSync(matrixPath, "utf8"),
    }).join("\n"),
    /public_origin\.env_keys must include AUTH_APP_ORIGIN|public_origin\.expected_origin must use https|public_origin\.expected_origin must not include a path/,
  );
});

test("runtime secret doc refs stay parseable", () => {
  const refs = parseRuntimeSecretDocRefs(readFileSync(matrixPath, "utf8"));
  assert.equal(refs.length, 9);
  assert.deepEqual(refs[0], {
    serviceId: "landing-staging",
    containerName: "landing-staging",
    secretPathPrefix: "/praedixa/staging/landing-staging/runtime",
  });
  assert.deepEqual(refs.at(-1), {
    serviceId: "auth-prod",
    containerName: "auth-prod",
    secretPathPrefix: "/praedixa/prod/auth-prod/runtime",
  });
});
