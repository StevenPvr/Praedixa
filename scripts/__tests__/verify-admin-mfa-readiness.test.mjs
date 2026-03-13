import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

import {
  loadBrowserFlowPolicy,
  loadRealmExport,
  validateAdminMfaReadiness,
  validateLiveBrowserFlowExecutions,
} from "../verify-admin-mfa-readiness-lib.mjs";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "../..");
const realmPath = path.join(repoRoot, "infra/auth/realm-praedixa.json");
const policyPath = path.join(
  repoRoot,
  "infra/auth/admin-mfa-browser-flow-policy.json",
);

function createBrowserFlowSnapshot() {
  return [
    {
      displayName: "Cookie",
      requirement: "ALTERNATIVE",
      level: 0,
      authenticationFlow: false,
    },
    {
      displayName: "Forms",
      requirement: "ALTERNATIVE",
      level: 0,
      authenticationFlow: true,
    },
    {
      displayName: "Username Password Form",
      requirement: "REQUIRED",
      level: 1,
      authenticationFlow: false,
    },
    {
      displayName: "Browser - Conditional 2FA",
      requirement: "CONDITIONAL",
      level: 1,
      authenticationFlow: true,
    },
    {
      displayName: "Condition - User Configured",
      requirement: "REQUIRED",
      level: 2,
      authenticationFlow: false,
    },
    {
      displayName: "OTP Form",
      requirement: "ALTERNATIVE",
      level: 2,
      authenticationFlow: false,
    },
  ];
}

test("admin MFA readiness validates the versioned realm export", () => {
  const realmExport = loadRealmExport(realmPath);
  const policy = loadBrowserFlowPolicy(policyPath);
  assert.deepEqual(validateAdminMfaReadiness(realmExport, policy), []);
});

test("admin MFA readiness rejects realm exports without CONFIGURE_TOTP", () => {
  const realmExport = loadRealmExport(realmPath);
  const policy = loadBrowserFlowPolicy(policyPath);
  realmExport.requiredActions = [];
  assert.match(
    validateAdminMfaReadiness(realmExport, policy).join("\n"),
    /CONFIGURE_TOTP/,
  );
});

test("admin MFA readiness rejects weakened OTP policy", () => {
  const realmExport = loadRealmExport(realmPath);
  const policy = loadBrowserFlowPolicy(policyPath);
  realmExport.otpPolicyDigits = 8;
  realmExport.otpPolicyCodeReusable = true;
  const output = validateAdminMfaReadiness(realmExport, policy).join("\n");
  assert.match(output, /otpPolicyDigits/);
  assert.match(output, /otpPolicyCodeReusable/);
});

test("admin MFA readiness rejects browser flow alias drift in realm export", () => {
  const realmExport = loadRealmExport(realmPath);
  const policy = loadBrowserFlowPolicy(policyPath);
  realmExport.browserFlow = "legacy-browser";
  assert.match(
    validateAdminMfaReadiness(realmExport, policy).join("\n"),
    /browserFlow must stay bound to browser/,
  );
});

test("admin MFA readiness validates a live browser flow snapshot", () => {
  const realmExport = loadRealmExport(realmPath);
  const policy = loadBrowserFlowPolicy(policyPath);
  assert.deepEqual(
    validateLiveBrowserFlowExecutions(
      createBrowserFlowSnapshot(),
      policy,
      realmExport,
    ),
    [],
  );
});

test("admin MFA readiness rejects a live browser flow snapshot missing OTP form", () => {
  const realmExport = loadRealmExport(realmPath);
  const policy = loadBrowserFlowPolicy(policyPath);
  const snapshot = createBrowserFlowSnapshot().filter(
    (entry) => entry.displayName !== "OTP Form",
  );

  assert.match(
    validateLiveBrowserFlowExecutions(snapshot, policy, realmExport).join("\n"),
    /OTP Form/,
  );
});
