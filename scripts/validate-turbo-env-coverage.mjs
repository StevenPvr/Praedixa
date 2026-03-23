#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");

export const defaultTurboPath = path.join(repoRoot, "turbo.json");
export const defaultLocalEnvScriptPath = path.join(
  repoRoot,
  "scripts/lib/local-env.sh",
);

export const requiredGlobalDependencies = [
  ".env",
  ".env.local",
  ".env.*",
  "app-*/.env",
  "app-*/.env.local",
  "app-*/.env.*",
  "packages/*/.env",
  "packages/*/.env.local",
  "packages/*/.env.*",
  "**/.env.example",
  "**/.env.local.example",
];

export const requiredGlobalEnv = [
  "AUTH_ADMIN_REQUIRED_AMR",
  "AUTH_APP_ORIGIN",
  "AUTH_OIDC_CLIENT_ID",
  "AUTH_OIDC_ISSUER_URL",
  "AUTH_OIDC_SCOPE",
  "AUTH_SESSION_SECRET",
  "CAMUNDA_BASE_URL",
  "CAMUNDA_ENABLED",
  "CI",
  "CONNECTORS_RUNTIME_TOKEN",
  "DATABASE_URL",
  "NEXT_PUBLIC_API_URL",
  "NEXT_PUBLIC_APP_ORIGIN",
  "NODE_ENV",
  "RESEND_WEBHOOK_SECRET",
];

function readUtf8(filePath) {
  return readFileSync(filePath, "utf8");
}

export function loadTurboConfig(turboPath = defaultTurboPath) {
  return JSON.parse(readUtf8(turboPath));
}

export function extractReferencedEnvFiles(shellSource) {
  const matches = new Set();
  const regex = /"\$repo_root\/([^"]+?\.env(?:\.[^"]+)?)"/g;

  for (const match of shellSource.matchAll(regex)) {
    matches.add(match[1]);
  }

  return Array.from(matches).sort((left, right) => left.localeCompare(right));
}

function escapeRegex(value) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

export function globToRegExp(pattern) {
  const DOUBLE_STAR = "__DOUBLE_STAR__";
  const SINGLE_STAR = "__SINGLE_STAR__";
  const tokenizedPattern = pattern
    .replace(/\*\*/g, DOUBLE_STAR)
    .replace(/\*/g, SINGLE_STAR);
  return new RegExp(
    `^${escapeRegex(tokenizedPattern)
      .replaceAll(DOUBLE_STAR, ".*")
      .replaceAll(SINGLE_STAR, "[^/]*")}$`,
  );
}

export function matchesDependencyPattern(filePath, patterns) {
  return patterns.some((pattern) => globToRegExp(pattern).test(filePath));
}

export function validateTurboEnvCoverage({
  turboConfig = loadTurboConfig(),
  localEnvScript = readUtf8(defaultLocalEnvScriptPath),
} = {}) {
  const errors = [];
  const globalDependencies = Array.isArray(turboConfig.globalDependencies)
    ? turboConfig.globalDependencies
    : [];
  const globalEnv = Array.isArray(turboConfig.globalEnv)
    ? turboConfig.globalEnv
    : [];

  for (const pattern of requiredGlobalDependencies) {
    if (!globalDependencies.includes(pattern)) {
      errors.push(
        `turbo.json must include globalDependencies entry ${pattern}`,
      );
    }
  }

  for (const envName of requiredGlobalEnv) {
    if (!globalEnv.includes(envName)) {
      errors.push(`turbo.json must include globalEnv entry ${envName}`);
    }
  }

  for (const envFile of extractReferencedEnvFiles(localEnvScript)) {
    if (!matchesDependencyPattern(envFile, globalDependencies)) {
      errors.push(
        `turbo.json globalDependencies must cover local env file ${envFile}`,
      );
    }
  }

  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const errors = validateTurboEnvCoverage();
  if (errors.length > 0) {
    console.error(
      [
        "[validate-turbo-env-coverage] Turbo env/cache coverage drift detected",
        ...errors.map((error) => `- ${error}`),
      ].join("\n"),
    );
    process.exit(1);
  }

  console.log("[validate-turbo-env-coverage] OK");
}
