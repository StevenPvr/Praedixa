#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  loadBrowserFlowPolicy,
  loadRealmExport,
  validateAdminMfaReadiness,
  validateLiveBrowserFlowExecutions,
} from "./verify-admin-mfa-readiness-lib.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const defaultRealmPath = path.join(
  repoRoot,
  "infra",
  "auth",
  "realm-praedixa.json",
);
const defaultPolicyPath = path.join(
  repoRoot,
  "infra",
  "auth",
  "admin-mfa-browser-flow-policy.json",
);

function parseArgs(argv) {
  const options = {
    realmPath: defaultRealmPath,
    policyPath: defaultPolicyPath,
    liveFlowPath: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg.startsWith("--") && index === 0) {
      options.realmPath = arg;
      continue;
    }

    switch (arg) {
      case "--realm-export":
        if (!argv[index + 1]) {
          throw new Error("--realm-export requires a path");
        }
        options.realmPath = argv[index + 1];
        index += 1;
        break;
      case "--policy":
        if (!argv[index + 1]) {
          throw new Error("--policy requires a path");
        }
        options.policyPath = argv[index + 1];
        index += 1;
        break;
      case "--live-flow-json":
        if (!argv[index + 1]) {
          throw new Error("--live-flow-json requires a path");
        }
        options.liveFlowPath = argv[index + 1];
        index += 1;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

let options;
try {
  options = parseArgs(process.argv.slice(2));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[mfa-readiness] ${message}`);
  process.exit(1);
}

const realmExport = loadRealmExport(options.realmPath);
const policy = loadBrowserFlowPolicy(options.policyPath);
const errors = validateAdminMfaReadiness(realmExport, policy);

if (options.liveFlowPath) {
  errors.push(
    ...validateLiveBrowserFlowExecutions(
      loadRealmExport(options.liveFlowPath),
      policy,
      realmExport,
    ),
  );
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`[mfa-readiness] ${error}`);
  }
  process.exit(1);
}

console.log(
  `[mfa-readiness] OK realm=${options.realmPath} policy=${options.policyPath}${options.liveFlowPath ? ` live=${options.liveFlowPath}` : ""}`,
);
