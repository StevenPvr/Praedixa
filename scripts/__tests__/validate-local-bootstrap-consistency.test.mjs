import assert from "node:assert/strict";
import test from "node:test";

import {
  bootstrapFiles,
  expectedLocalDatabasePassword,
  expectedLocalOidcIssuer,
  validateLocalBootstrapConsistency,
} from "../validate-local-bootstrap-consistency.mjs";

test("local bootstrap consistency passes on the committed baseline", () => {
  assert.deepEqual(validateLocalBootstrapConsistency(), []);
});

test("local bootstrap consistency rejects stale env examples", () => {
  const fixtures = new Map([
    [bootstrapFiles.dockerCompose, `POSTGRES_PASSWORD: ${expectedLocalDatabasePassword}\n`],
    [
      bootstrapFiles.readme,
      `Local DB: \`${expectedLocalDatabasePassword}\`\nOIDC: ${expectedLocalOidcIssuer}\n`,
    ],
    [
      bootstrapFiles.adminEnvExample,
      [
        "NEXT_PUBLIC_API_URL=http://localhost:8000",
        "AUTH_APP_ORIGIN=http://localhost:3002",
        "AUTH_OIDC_ISSUER_URL=https://auth.praedixa.com/realms/praedixa",
      ].join("\n"),
    ],
    [
      bootstrapFiles.webappEnvExample,
      [
        "NEXT_PUBLIC_API_URL=http://localhost:8000",
        "AUTH_APP_ORIGIN=http://localhost:3001",
        `AUTH_OIDC_ISSUER_URL=${expectedLocalOidcIssuer}`,
      ].join("\n"),
    ],
    [bootstrapFiles.adminReadme, expectedLocalOidcIssuer],
    [bootstrapFiles.webappReadme, expectedLocalOidcIssuer],
  ]);

  const errors = validateLocalBootstrapConsistency({
    read(filePath) {
      return fixtures.get(filePath) ?? "";
    },
  });

  assert.ok(
    errors.some((error) => error.includes("app-admin/.env.local.example")),
    errors.join("\n"),
  );
});

test("local bootstrap consistency rejects stale README database password", () => {
  const fixtures = new Map([
    [bootstrapFiles.dockerCompose, `POSTGRES_PASSWORD: ${expectedLocalDatabasePassword}\n`],
    [
      bootstrapFiles.readme,
      "PostgreSQL 16 demarre sur localhost:5433 (credentials : `praedixa` / `changeme` / db `praedixa`).",
    ],
    [
      bootstrapFiles.adminEnvExample,
      [
        "NEXT_PUBLIC_API_URL=http://localhost:8000",
        "AUTH_APP_ORIGIN=http://localhost:3002",
        `AUTH_OIDC_ISSUER_URL=${expectedLocalOidcIssuer}`,
      ].join("\n"),
    ],
    [
      bootstrapFiles.webappEnvExample,
      [
        "NEXT_PUBLIC_API_URL=http://localhost:8000",
        "AUTH_APP_ORIGIN=http://localhost:3001",
        `AUTH_OIDC_ISSUER_URL=${expectedLocalOidcIssuer}`,
      ].join("\n"),
    ],
    [bootstrapFiles.adminReadme, expectedLocalOidcIssuer],
    [bootstrapFiles.webappReadme, expectedLocalOidcIssuer],
  ]);

  const errors = validateLocalBootstrapConsistency({
    read(filePath) {
      return fixtures.get(filePath) ?? "";
    },
  });

  assert.ok(
    errors.some((error) => error.includes("README.md must not document the stale local PostgreSQL password changeme")),
    errors.join("\n"),
  );
});
