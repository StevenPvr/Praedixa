#!/usr/bin/env node

import { writeFileSync } from "node:fs";

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
  throw new Error(
    [
      "runtime secret inventory is invalid",
      ...secretErrors.map((error) => `- ${error}`),
    ].join("\n"),
  );
}

const envInventory = loadRuntimeEnvInventory();
const envErrors = validateRuntimeEnvInventory(envInventory, { secretInventory });
if (envErrors.length > 0) {
  throw new Error(
    [
      "runtime env inventory is invalid",
      ...envErrors.map((error) => `- ${error}`),
    ].join("\n"),
  );
}

const payload = deriveRuntimeEnvContracts({
  inventory: secretInventory,
  envInventory,
});
writeFileSync(
  defaultOutputPath,
  await stringifyRuntimeEnvContracts(payload),
  "utf8",
);
console.log(`[runtime-env-contracts] wrote ${defaultOutputPath}`);
