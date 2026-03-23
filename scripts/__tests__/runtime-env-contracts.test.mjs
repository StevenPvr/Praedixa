import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import test from "node:test";

import {
  deriveRuntimeEnvContracts,
  stringifyRuntimeEnvContracts,
} from "../runtime-env-contracts.mjs";

const repoRoot = process.cwd();
const generatedPath = path.join(
  repoRoot,
  "docs",
  "deployment",
  "runtime-env-contracts.generated.json",
);

test("runtime env contracts stay in sync with committed generated output", async () => {
  const expected = await stringifyRuntimeEnvContracts(
    deriveRuntimeEnvContracts(),
  );
  const committed = readFileSync(generatedPath, "utf8");

  assert.equal(committed, expected);
});

test("runtime env contracts include topology metadata for API runtime", () => {
  const payload = deriveRuntimeEnvContracts();
  const apiProd = payload.services.find((service) => service.service_id === "api-prod");

  assert.ok(apiProd);
  assert.equal(payload.schema_version, "2");
  assert.equal(apiProd.topology.container_name, "api-prod");
  assert.equal(apiProd.topology.private_network_name, "praedixa-prd-pn");
  assert.equal(apiProd.topology.rdb_instance_name, "praedixa-api-prod");
  assert.deepEqual(apiProd.runtime_contract.required_env_groups, [
    {
      mode: "all_of",
      keys: [
        "AUTH_ALLOWED_JWKS_HOSTS",
        "AUTH_AUDIENCE",
        "AUTH_ISSUER_URL",
        "AUTH_JWKS_URL",
        "CORS_ORIGINS",
        "ENVIRONMENT",
        "KEY_PROVIDER",
        "KEYCLOAK_ADMIN_AUTH_MODE",
        "LOG_LEVEL",
        "SCW_DEFAULT_PROJECT_ID",
      ],
      purpose: "api auth, CORS, key provider and provisioning principal bootstrap",
    },
  ]);
  assert.deepEqual(apiProd.runtime_contract.required_secret_groups, [
    {
      mode: "all_of",
      keys: ["DATABASE_URL"],
      purpose: "API primary database access",
    },
    {
      mode: "all_of",
      keys: ["RATE_LIMIT_STORAGE_URI"],
      purpose: "API distributed rate limit storage",
    },
    {
      mode: "all_of",
      keys: ["CONTACT_API_INGEST_TOKEN"],
      purpose: "contact ingest authentication",
    },
    {
      mode: "all_of",
      keys: ["RESEND_WEBHOOK_SECRET"],
      purpose: "provider-signed invitation delivery proof webhooks",
    },
    {
      mode: "any_of",
      keys: ["KEYCLOAK_ADMIN_CLIENT_SECRET", "KEYCLOAK_ADMIN_PASSWORD"],
      purpose: "API runtime provisioning access to the Keycloak admin API via password grant or dedicated service account",
    },
    {
      mode: "all_of",
      keys: ["SCW_SECRET_KEY"],
      purpose: "Scaleway key provider runtime access",
    },
  ]);
  assert.ok(!("required_runtime_keys" in apiProd.runtime_contract));
});

test("runtime env contracts include required non-secret frontend env keys", () => {
  const payload = deriveRuntimeEnvContracts();
  const adminProd = payload.services.find((service) => service.service_id === "admin-prod");

  assert.ok(adminProd);
  assert.equal(adminProd.runtime_contract.public_origin.expected_origin, "https://admin.praedixa.com");
  assert.deepEqual(adminProd.runtime_contract.required_env_groups, [
    {
      mode: "all_of",
      keys: [
        "AUTH_OIDC_CLIENT_ID",
        "AUTH_OIDC_ISSUER_URL",
        "AUTH_OIDC_SCOPE",
        "NEXT_PUBLIC_API_URL",
      ],
      purpose: "admin upstream API and OIDC bootstrap",
    },
  ]);
  assert.ok(
    adminProd.runtime_contract.optional_env_groups.some((group) =>
      group.keys.includes("AUTH_ADMIN_REQUIRED_AMR"),
    ),
  );
  assert.ok(
    adminProd.runtime_contract.all_runtime_keys.includes("AUTH_SESSION_SECRET"),
  );
  assert.ok(
    adminProd.runtime_contract.all_runtime_keys.includes("NEXT_PUBLIC_API_URL"),
  );
});

test("runtime env contracts preserve any_of groups without flattening them into required keys", () => {
  const payload = deriveRuntimeEnvContracts();
  const apiProd = payload.services.find((service) => service.service_id === "api-prod");

  assert.ok(apiProd);
  assert.ok(
    apiProd.runtime_contract.required_secret_groups.some(
      (group) =>
        group.mode === "any_of" &&
        group.keys.includes("KEYCLOAK_ADMIN_PASSWORD") &&
        group.keys.includes("KEYCLOAK_ADMIN_CLIENT_SECRET"),
    ),
  );
  assert.ok(
    !("required_secret_keys" in apiProd.runtime_contract),
  );
  assert.ok(
    !("required_runtime_keys" in apiProd.runtime_contract),
  );
});
