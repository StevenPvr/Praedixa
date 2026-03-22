import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

import {
  findRequiredAction,
  loadRealmExport,
} from "../verify-admin-mfa-readiness-lib.mjs";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "../..");
const realmPath = path.join(repoRoot, "infra/auth/realm-praedixa.json");

test("realm export keeps UPDATE_PASSWORD required action enabled for client invitations", () => {
  const realmExport = loadRealmExport(realmPath);
  const action = findRequiredAction(realmExport, "UPDATE_PASSWORD");

  assert.ok(action, "UPDATE_PASSWORD must stay registered in realm export");
  assert.equal(action.providerId, "UPDATE_PASSWORD");
  assert.equal(action.enabled, true);
});
