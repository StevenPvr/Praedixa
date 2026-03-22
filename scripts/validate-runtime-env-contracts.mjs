#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";

import {
  defaultOutputPath,
  deriveRuntimeEnvContracts,
  stringifyRuntimeEnvContracts,
} from "./runtime-env-contracts.mjs";

const expected = stringifyRuntimeEnvContracts(deriveRuntimeEnvContracts());

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
