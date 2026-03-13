#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  loadSyntheticMonitoringBaseline,
  validateSyntheticMonitoringBaseline,
} from "./validate-synthetic-monitoring-baseline-lib.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultPath = path.resolve(
  scriptDir,
  "../docs/runbooks/synthetic-monitoring-baseline.json",
);
const targetPath = process.argv[2] ?? defaultPath;

const baseline = loadSyntheticMonitoringBaseline(targetPath);
const errors = validateSyntheticMonitoringBaseline(baseline);

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`[synthetics] ${error}`);
  }
  process.exit(1);
}

console.log(
  `[synthetics] OK: v${baseline.version} with ${baseline.checks.length} checks across ${Object.keys(baseline.requiredServiceCoverage ?? {}).length} services in ${targetPath}`,
);
