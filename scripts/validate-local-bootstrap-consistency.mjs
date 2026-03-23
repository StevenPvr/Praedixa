#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");

export const expectedLocalOidcIssuer =
  "http://localhost:8081/realms/praedixa";
export const expectedLocalDatabasePassword = "praedixa_local_dev_pg_2026";

export const bootstrapFiles = {
  readme: path.join(repoRoot, "README.md"),
  dockerCompose: path.join(repoRoot, "infra/docker-compose.yml"),
  adminEnvExample: path.join(repoRoot, "app-admin/.env.local.example"),
  webappEnvExample: path.join(repoRoot, "app-webapp/.env.local.example"),
  adminReadme: path.join(repoRoot, "app-admin/README.md"),
  webappReadme: path.join(repoRoot, "app-webapp/README.md"),
};

function readUtf8(filePath) {
  return readFileSync(filePath, "utf8");
}

function extractEnvValue(markdown, key) {
  const match = markdown.match(
    new RegExp(`^${key}=([^\\n\\r#]+)`, "m"),
  );
  return match ? match[1].trim() : null;
}

function extractDockerComposePostgresPassword(markdown) {
  const match = markdown.match(/POSTGRES_PASSWORD:\s*([^\s#]+)/);
  return match ? match[1].trim() : null;
}

export function validateLocalBootstrapConsistency({
  files = bootstrapFiles,
  read = readUtf8,
} = {}) {
  const errors = [];

  const dockerCompose = read(files.dockerCompose);
  const readme = read(files.readme);
  const adminEnvExample = read(files.adminEnvExample);
  const webappEnvExample = read(files.webappEnvExample);
  const adminReadme = read(files.adminReadme);
  const webappReadme = read(files.webappReadme);

  const composePassword = extractDockerComposePostgresPassword(dockerCompose);
  if (composePassword !== expectedLocalDatabasePassword) {
    errors.push(
      `${path.relative(repoRoot, files.dockerCompose)} must expose POSTGRES_PASSWORD=${expectedLocalDatabasePassword}`,
    );
  }

  if (!readme.includes(`\`${expectedLocalDatabasePassword}\``)) {
    errors.push(
      `${path.relative(repoRoot, files.readme)} must document the local PostgreSQL password ${expectedLocalDatabasePassword}`,
    );
  }

  if (readme.includes("`changeme`")) {
    errors.push(
      `${path.relative(repoRoot, files.readme)} must not document the stale local PostgreSQL password changeme`,
    );
  }

  for (const [label, filePath, content, expectedOrigin] of [
    [
      "admin env example",
      files.adminEnvExample,
      adminEnvExample,
      "http://localhost:3002",
    ],
    [
      "webapp env example",
      files.webappEnvExample,
      webappEnvExample,
      "http://localhost:3001",
    ],
  ]) {
    const issuer = extractEnvValue(content, "AUTH_OIDC_ISSUER_URL");
    const origin = extractEnvValue(content, "AUTH_APP_ORIGIN");
    const apiUrl = extractEnvValue(content, "NEXT_PUBLIC_API_URL");

    if (issuer !== expectedLocalOidcIssuer) {
      errors.push(
        `${path.relative(repoRoot, filePath)} must set AUTH_OIDC_ISSUER_URL=${expectedLocalOidcIssuer} (${label})`,
      );
    }

    if (origin !== expectedOrigin) {
      errors.push(
        `${path.relative(repoRoot, filePath)} must set AUTH_APP_ORIGIN=${expectedOrigin} (${label})`,
      );
    }

    if (apiUrl !== "http://localhost:8000") {
      errors.push(
        `${path.relative(repoRoot, filePath)} must set NEXT_PUBLIC_API_URL=http://localhost:8000 (${label})`,
      );
    }
  }

  if (!readme.includes(expectedLocalOidcIssuer)) {
    errors.push(
      `${path.relative(repoRoot, files.readme)} must document the canonical local OIDC issuer ${expectedLocalOidcIssuer}`,
    );
  }

  if (!adminReadme.includes(expectedLocalOidcIssuer)) {
    errors.push(
      `${path.relative(repoRoot, files.adminReadme)} must document the canonical local OIDC issuer ${expectedLocalOidcIssuer}`,
    );
  }

  if (!webappReadme.includes(expectedLocalOidcIssuer)) {
    errors.push(
      `${path.relative(repoRoot, files.webappReadme)} must document the canonical local OIDC issuer ${expectedLocalOidcIssuer}`,
    );
  }

  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const errors = validateLocalBootstrapConsistency();
  if (errors.length > 0) {
    console.error(
      [
        "[validate-local-bootstrap-consistency] Local bootstrap drift detected",
        ...errors.map((error) => `- ${error}`),
      ].join("\n"),
    );
    process.exit(1);
  }

  console.log("[validate-local-bootstrap-consistency] OK");
}
