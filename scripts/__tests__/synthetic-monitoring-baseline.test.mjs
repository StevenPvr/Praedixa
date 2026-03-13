import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import test from "node:test";

import {
  loadSyntheticMonitoringBaseline,
  validateSyntheticMonitoringBaseline,
} from "../validate-synthetic-monitoring-baseline-lib.mjs";

const repoRoot = process.cwd();
const baselinePath = path.join(
  repoRoot,
  "docs/runbooks/synthetic-monitoring-baseline.json",
);

function loadBaseline() {
  return loadSyntheticMonitoringBaseline(baselinePath);
}

test("synthetic baseline validates cleanly", () => {
  assert.deepEqual(validateSyntheticMonitoringBaseline(loadBaseline()), []);
});

test("synthetic baseline rejects duplicate ids", () => {
  const baseline = loadBaseline();
  baseline.checks.push({ ...baseline.checks[0] });

  assert.match(
    validateSyntheticMonitoringBaseline(baseline).join("\n"),
    /duplicate check id/i,
  );
});

test("explicit targets must not keep a canonical URL", () => {
  const baseline = loadBaseline();
  baseline.checks.find(
    (check) => check.id === "landing-home-fr",
  ).targets.staging = {
    hostMode: "explicit",
    baseUrl: "https://staging-landing.praedixa.com",
    path: "/fr",
  };

  assert.match(
    validateSyntheticMonitoringBaseline(baseline).join("\n"),
    /explicit targets must keep baseUrl null/i,
  );
});

test("synthetic baseline rejects missing service coverage", () => {
  const baseline = loadBaseline();
  baseline.checks = baseline.checks.filter(
    (check) => check.service !== "connectors",
  );

  assert.match(
    validateSyntheticMonitoringBaseline(baseline).join("\n"),
    /service connectors must define at least 1 synthetic checks/i,
  );
});

test("synthetic baseline rejects missing required probe intent", () => {
  const baseline = loadBaseline();
  const apiUnauthorizedCheck = baseline.checks.find(
    (check) => check.id === "api-protected-route-unauthorized",
  );
  apiUnauthorizedCheck.probe.intent = "health";

  assert.match(
    validateSyntheticMonitoringBaseline(baseline).join("\n"),
    /service api is missing probe intent anonymous_rejection/i,
  );
});

test("synthetic baseline rejects missing required metadata", () => {
  const baseline = loadBaseline();
  delete baseline.checks[0].metadata.runbook;

  assert.match(
    validateSyntheticMonitoringBaseline(baseline).join("\n"),
    /metadata\.runbook must be a non-empty string/i,
  );
});

test("synthetic baseline rejects host mode drift for explicit staging services", () => {
  const baseline = loadBaseline();
  baseline.checks.find(
    (check) => check.id === "auth-oidc-well-known",
  ).targets.staging = {
    hostMode: "canonical",
    baseUrl: "https://staging-auth.praedixa.com",
    path: "/realms/praedixa/.well-known/openid-configuration",
  };

  assert.match(
    validateSyntheticMonitoringBaseline(baseline).join("\n"),
    /hostMode must stay explicit for auth/i,
  );
});
