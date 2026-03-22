#!/usr/bin/env node

import { writeFileSync } from "node:fs";

import {
  defaultOutputPath,
  deriveRuntimeEnvContracts,
  stringifyRuntimeEnvContracts,
} from "./runtime-env-contracts.mjs";

const payload = deriveRuntimeEnvContracts();
writeFileSync(defaultOutputPath, stringifyRuntimeEnvContracts(payload), "utf8");
console.log(`[runtime-env-contracts] wrote ${defaultOutputPath}`);
