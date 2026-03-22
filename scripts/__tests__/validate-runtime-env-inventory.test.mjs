import assert from "node:assert/strict";
import test from "node:test";

import {
  loadRuntimeEnvInventory,
  validateRuntimeEnvInventory,
} from "../runtime-env-inventory.mjs";

test("runtime env inventory stays valid", () => {
  const inventory = loadRuntimeEnvInventory();
  const errors = validateRuntimeEnvInventory(inventory);

  assert.deepEqual(errors, []);
});

test("runtime env inventory rejects missing frontend runtime keys", () => {
  const inventory = loadRuntimeEnvInventory();
  const webappProd = inventory.services.find(
    (service) => service.service_id === "webapp-prod",
  );

  assert.ok(webappProd);
  webappProd.env_groups[0].keys = ["NEXT_PUBLIC_API_URL"];

  const errors = validateRuntimeEnvInventory(inventory);

  assert.ok(
    errors.some((error) => error.includes("AUTH_OIDC_ISSUER_URL")),
    errors.join("\n"),
  );
});

test("runtime env inventory rejects public origin keys duplicated in env_groups", () => {
  const inventory = loadRuntimeEnvInventory();
  const adminProd = inventory.services.find(
    (service) => service.service_id === "admin-prod",
  );

  assert.ok(adminProd);
  adminProd.env_groups[1].keys.push("AUTH_APP_ORIGIN");

  const errors = validateRuntimeEnvInventory(inventory);

  assert.ok(
    errors.some((error) => error.includes("must not redeclare public_origin env key AUTH_APP_ORIGIN")),
    errors.join("\n"),
  );
});
