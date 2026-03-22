import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import test from "node:test";

const repoRoot = process.cwd();
const helperPath = path.join(repoRoot, "scripts", "lib", "local-env.sh");

function runHelper(scriptLines, env = {}) {
  return spawnSync("bash", ["-lc", scriptLines.join("\n")], {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      ...env,
    },
  });
}

test("reconcile_api_auth_runtime_from_local_env derives local issuer from frontend OIDC env and overrides stale shell exports", () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "local-env-auth-"));
  const adminDir = path.join(tempRoot, "app-admin");

  mkdirSync(adminDir, { recursive: true });
  writeFileSync(
    path.join(adminDir, ".env.local"),
    "AUTH_OIDC_ISSUER_URL=http://localhost:8081/realms/praedixa\n",
  );

  const result = runHelper(
    [
      `source "${helperPath}"`,
      'reconcile_api_auth_runtime_from_local_env "$TEST_REPO_ROOT" >/dev/null',
      'printf "issuer=%s\\n" "$AUTH_ISSUER_URL"',
      'printf "jwks=%s\\n" "$AUTH_JWKS_URL"',
      'printf "audience=%s\\n" "$AUTH_AUDIENCE"',
    ],
    {
      TEST_REPO_ROOT: tempRoot,
      AUTH_ISSUER_URL: "https://auth.praedixa.com/realms/praedixa",
      AUTH_JWKS_URL:
        "https://authprodl1b8gj6t-auth-prod.functions.fnc.fr-par.scw.cloud/realms/praedixa/protocol/openid-connect/certs",
      AUTH_AUDIENCE: "wrong-audience",
    },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /issuer=http:\/\/localhost:8081\/realms\/praedixa/);
  assert.match(
    result.stdout,
    /jwks=http:\/\/localhost:8081\/realms\/praedixa\/protocol\/openid-connect\/certs/,
  );
  assert.match(result.stdout, /audience=praedixa-api/);

  rmSync(tempRoot, { recursive: true, force: true });
});

test("reconcile_api_auth_runtime_from_local_env prefers API auth env files over frontend defaults", () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "local-env-auth-"));
  const apiDir = path.join(tempRoot, "app-api");
  const adminDir = path.join(tempRoot, "app-admin");

  mkdirSync(apiDir, { recursive: true });
  mkdirSync(adminDir, { recursive: true });

  writeFileSync(
    path.join(apiDir, ".env.local"),
    [
      "AUTH_ISSUER_URL=http://127.0.0.1:8181/realms/praedixa-api",
      "AUTH_AUDIENCE=praedixa-api-local",
      "",
    ].join("\n"),
  );
  writeFileSync(
    path.join(adminDir, ".env.local"),
    "AUTH_OIDC_ISSUER_URL=http://localhost:8081/realms/praedixa\n",
  );

  const result = runHelper(
    [
      `source "${helperPath}"`,
      'reconcile_api_auth_runtime_from_local_env "$TEST_REPO_ROOT" >/dev/null',
      'printf "issuer=%s\\n" "$AUTH_ISSUER_URL"',
      'printf "jwks=%s\\n" "$AUTH_JWKS_URL"',
      'printf "audience=%s\\n" "$AUTH_AUDIENCE"',
    ],
    {
      TEST_REPO_ROOT: tempRoot,
    },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /issuer=http:\/\/127.0.0.1:8181\/realms\/praedixa-api/);
  assert.match(
    result.stdout,
    /jwks=http:\/\/127.0.0.1:8181\/realms\/praedixa-api\/protocol\/openid-connect\/certs/,
  );
  assert.match(result.stdout, /audience=praedixa-api-local/);

  rmSync(tempRoot, { recursive: true, force: true });
});

test("reconcile_api_auth_runtime_from_local_env prefers active frontend local auth over legacy app-api/.env", () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "local-env-auth-"));
  const apiDir = path.join(tempRoot, "app-api");
  const adminDir = path.join(tempRoot, "app-admin");

  mkdirSync(apiDir, { recursive: true });
  mkdirSync(adminDir, { recursive: true });

  writeFileSync(
    path.join(apiDir, ".env"),
    [
      "AUTH_ISSUER_URL=https://auth.praedixa.com/realms/praedixa",
      "AUTH_AUDIENCE=praedixa-api",
      "",
    ].join("\n"),
  );
  writeFileSync(
    path.join(adminDir, ".env.local"),
    "AUTH_OIDC_ISSUER_URL=http://localhost:8081/realms/praedixa\n",
  );

  const result = runHelper(
    [
      `source "${helperPath}"`,
      'reconcile_api_auth_runtime_from_local_env "$TEST_REPO_ROOT" >/dev/null',
      'printf "issuer=%s\\n" "$AUTH_ISSUER_URL"',
      'printf "jwks=%s\\n" "$AUTH_JWKS_URL"',
      'printf "audience=%s\\n" "$AUTH_AUDIENCE"',
    ],
    {
      TEST_REPO_ROOT: tempRoot,
    },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /issuer=http:\/\/localhost:8081\/realms\/praedixa/);
  assert.match(
    result.stdout,
    /jwks=http:\/\/localhost:8081\/realms\/praedixa\/protocol\/openid-connect\/certs/,
  );
  assert.match(result.stdout, /audience=praedixa-api/);

  rmSync(tempRoot, { recursive: true, force: true });
});

test("autofill_database_url_from_local_env prefers repo local files over stale shell exports", () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "local-env-db-"));
  const apiDir = path.join(tempRoot, "app-api");

  mkdirSync(apiDir, { recursive: true });
  writeFileSync(
    path.join(apiDir, ".env.local"),
    "DATABASE_URL=postgresql://praedixa:secret@127.0.0.1:5433/praedixa\n",
  );

  const result = runHelper(
    [
      `source "${helperPath}"`,
      'autofill_database_url_from_local_env "$TEST_REPO_ROOT" >/dev/null',
      'printf "database_url=%s\\n" "$DATABASE_URL"',
    ],
    {
      TEST_REPO_ROOT: tempRoot,
      DATABASE_URL:
        "postgresql+asyncpg://stale:stale@localhost:5433/should-not-win",
    },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(
    result.stdout,
    /database_url=postgresql:\/\/praedixa:secret@127\.0\.0\.1:5433\/praedixa/,
  );

  rmSync(tempRoot, { recursive: true, force: true });
});

test("reconcile_local_keycloak_smtp_runtime_from_local_env derives local SMTP runtime from RESEND env files", () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "local-env-smtp-"));
  const landingDir = path.join(tempRoot, "app-landing");

  mkdirSync(landingDir, { recursive: true });
  writeFileSync(
    path.join(landingDir, ".env.local"),
    [
      "RESEND_API_KEY=re_local_test_key",
      "RESEND_FROM_EMAIL=hello@praedixa.com",
      "RESEND_REPLY_TO_EMAIL=support@praedixa.com",
      "",
    ].join("\n"),
  );

  const result = runHelper(
    [
      `source "${helperPath}"`,
      'reconcile_local_keycloak_smtp_runtime_from_local_env "$TEST_REPO_ROOT" >/dev/null',
      'printf "smtp_password=%s\\n" "$KEYCLOAK_SMTP_PASSWORD"',
      'printf "smtp_from=%s\\n" "$KEYCLOAK_SMTP_FROM"',
      'printf "smtp_reply_to=%s\\n" "$KEYCLOAK_SMTP_REPLY_TO"',
    ],
    {
      TEST_REPO_ROOT: tempRoot,
    },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /smtp_password=re_local_test_key/);
  assert.match(result.stdout, /smtp_from=hello@praedixa.com/);
  assert.match(result.stdout, /smtp_reply_to=support@praedixa.com/);

  rmSync(tempRoot, { recursive: true, force: true });
});

test("autofill_resend_webhook_secret_from_local_env loads API webhook secret from local env files", () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "local-env-webhook-"));
  const apiDir = path.join(tempRoot, "app-api-ts");

  mkdirSync(apiDir, { recursive: true });
  writeFileSync(
    path.join(apiDir, ".env.local"),
    "RESEND_WEBHOOK_SECRET=whsec_local_delivery_proof\n",
  );

  const result = runHelper(
    [
      `source "${helperPath}"`,
      'autofill_resend_webhook_secret_from_local_env "$TEST_REPO_ROOT" >/dev/null',
      'printf "webhook=%s\\n" "$RESEND_WEBHOOK_SECRET"',
    ],
    {
      TEST_REPO_ROOT: tempRoot,
    },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /webhook=whsec_local_delivery_proof/);

  rmSync(tempRoot, { recursive: true, force: true });
});

test("autofill_connectors_runtime_token_from_local_env defaults a stable local control-plane token", () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "local-env-connectors-"));

  const result = runHelper(
    [
      `source "${helperPath}"`,
      'autofill_connectors_runtime_token_from_local_env "$TEST_REPO_ROOT" >/dev/null',
      'printf "token=%s\\n" "$CONNECTORS_RUNTIME_TOKEN"',
    ],
    {
      TEST_REPO_ROOT: tempRoot,
    },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(
    result.stdout,
    /token=local-dev-connectors-runtime-token-2026/,
  );

  rmSync(tempRoot, { recursive: true, force: true });
});

test("autofill_connectors_service_tokens_from_local_env derives a local all-org control-plane token", () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "local-env-connectors-"));

  const result = runHelper(
    [
      `source "${helperPath}"`,
      'autofill_connectors_service_tokens_from_local_env "$TEST_REPO_ROOT" >/dev/null',
      'printf "%s" "$CONNECTORS_SERVICE_TOKENS"',
    ],
    {
      TEST_REPO_ROOT: tempRoot,
    },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].name, "admin-control-plane-local");
  assert.equal(parsed[0].token, "local-dev-connectors-runtime-token-2026");
  assert.deepEqual(parsed[0].allowedOrgs, ["global:all-orgs"]);
  assert.ok(parsed[0].capabilities.includes("connections:read"));
  assert.ok(parsed[0].capabilities.includes("connections:write"));
  assert.ok(parsed[0].capabilities.includes("sync:write"));

  rmSync(tempRoot, { recursive: true, force: true });
});
