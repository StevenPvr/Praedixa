#!/usr/bin/env node

import process from "node:process";

import {
  defaultInventoryPath,
  loadRuntimeEnvInventory,
  validateRuntimeEnvInventory,
} from "./runtime-env-inventory.mjs";

const inventory = loadRuntimeEnvInventory();
const errors = validateRuntimeEnvInventory(inventory);

if (errors.length > 0) {
  console.error(
    [
      `[runtime-env-inventory] FAIL (${defaultInventoryPath})`,
      ...errors.map((error) => `- ${error}`),
    ].join("\n"),
  );
  process.exit(1);
}

console.log(`[runtime-env-inventory] OK (${defaultInventoryPath})`);
