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

test("runtime env contracts stay in sync with committed generated output", () => {
  const expected = stringifyRuntimeEnvContracts(deriveRuntimeEnvContracts());
  const committed = readFileSync(generatedPath, "utf8");

  assert.equal(committed, expected);
});

test("runtime env contracts include topology metadata for API runtime", () => {
  const payload = deriveRuntimeEnvContracts();
  const apiProd = payload.services.find((service) => service.service_id === "api-prod");

  assert.ok(apiProd);
  assert.equal(apiProd.topology.container_name, "api-prod");
  assert.equal(apiProd.topology.private_network_name, "praedixa-prd-pn");
  assert.equal(apiProd.topology.rdb_instance_name, "praedixa-api-prod");
  assert.deepEqual(apiProd.runtime_contract.required_secret_keys, [
    "CONTACT_API_INGEST_TOKEN",
    "DATABASE_URL",
    "KEYCLOAK_ADMIN_PASSWORD",
    "RATE_LIMIT_STORAGE_URI",
    "RESEND_WEBHOOK_SECRET",
    "SCW_SECRET_KEY",
  ]);
});
