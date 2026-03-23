import assert from "node:assert/strict";
import test from "node:test";

import {
  extractReferencedEnvFiles,
  loadTurboConfig,
  validateTurboEnvCoverage,
} from "../validate-turbo-env-coverage.mjs";

test("turbo env coverage validates on committed baseline", () => {
  assert.deepEqual(validateTurboEnvCoverage(), []);
});

test("turbo env coverage rejects missing env invalidation patterns", () => {
  const turboConfig = loadTurboConfig();
  turboConfig.globalDependencies = turboConfig.globalDependencies.filter(
    (pattern) => pattern !== "app-*/.env.local",
  );

  assert.match(
    validateTurboEnvCoverage({ turboConfig }).join("\n"),
    /app-\*\/\.env\.local|app-api-ts\/.env.local/i,
  );
});

test("turbo env coverage rejects missing global env keys", () => {
  const turboConfig = loadTurboConfig();
  turboConfig.globalEnv = turboConfig.globalEnv.filter(
    (name) => name !== "DATABASE_URL",
  );

  assert.match(
    validateTurboEnvCoverage({ turboConfig }).join("\n"),
    /globalEnv entry DATABASE_URL/i,
  );
});

test("extractReferencedEnvFiles captures repo-owned env paths from local-env helpers", () => {
  const envFiles = extractReferencedEnvFiles(`
    "$repo_root/app-api-ts/.env.local"
    "$repo_root/app-api/.env"
    "$repo_root/app-admin/.env.local"
  `);

  assert.deepEqual(envFiles, [
    "app-admin/.env.local",
    "app-api-ts/.env.local",
    "app-api/.env",
  ]);
});
