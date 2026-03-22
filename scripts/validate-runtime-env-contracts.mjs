#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";

import {
  defaultOutputPath,
  deriveRuntimeEnvContracts,
  stringifyRuntimeEnvContracts,
} from "./runtime-env-contracts.mjs";
import {
  loadRuntimeEnvInventory,
  validateRuntimeEnvInventory,
} from "./runtime-env-inventory.mjs";
import {
  loadRuntimeSecretInventory,
  validateRuntimeSecretInventory,
} from "./validate-runtime-secret-inventory.mjs";

const secretInventory = loadRuntimeSecretInventory();
const secretErrors = validateRuntimeSecretInventory(secretInventory);
if (secretErrors.length > 0) {
  console.error(
    [
      "[runtime-env-contracts] Runtime secret inventory invalid",
      ...secretErrors.map((error) => `- ${error}`),
    ].join("\n"),
  );
  process.exit(1);
}

const envInventory = loadRuntimeEnvInventory();
const envErrors = validateRuntimeEnvInventory(envInventory, { secretInventory });
if (envErrors.length > 0) {
  console.error(
    [
      "[runtime-env-contracts] Runtime env inventory invalid",
      ...envErrors.map((error) => `- ${error}`),
    ].join("\n"),
  );
  process.exit(1);
}

const expected = await stringifyRuntimeEnvContracts(
  deriveRuntimeEnvContracts({ inventory: secretInventory, envInventory }),
);

if (!existsSync(defaultOutputPath)) {
  console.error(
    `[runtime-env-contracts] Missing generated contract: ${defaultOutputPath}`,
  );
  process.exit(1);
}

const actual = readFileSync(defaultOutputPath, "utf8");

if (actual !== expected) {
  console.error(
    [
      `[runtime-env-contracts] Generated contract drift detected: ${defaultOutputPath}`,
      "Re-run: node scripts/generate-runtime-env-contracts.mjs",
    ].join("\n"),
  );
  process.exit(1);
}

console.log(`[runtime-env-contracts] OK (${defaultOutputPath})`);
