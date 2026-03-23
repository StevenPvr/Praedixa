import assert from "node:assert/strict";
import test from "node:test";

import {
  loadBuildReadyStatus,
  validateBuildReadyStatus,
} from "../validate-build-ready-status.mjs";

test("build-ready status validates on committed baseline", () => {
  const status = loadBuildReadyStatus();
  assert.deepEqual(validateBuildReadyStatus(status), []);
});

test("build-ready status rejects ready clusters that still own blockers", () => {
  const status = loadBuildReadyStatus();
  status.clusters = status.clusters.map((cluster) =>
    cluster.id === "product-core" ? { ...cluster, status: "ready" } : cluster,
  );

  assert.match(
    validateBuildReadyStatus(status).join("\n"),
    /cannot be ready while blockers still reference it/i,
  );
});

test('build-ready status rejects verdict "go" with blockers still open', () => {
  const status = loadBuildReadyStatus();
  status.current_verdict = "go";

  assert.match(
    validateBuildReadyStatus(status).join("\n"),
    /cannot be "go" while open_blockers is non-empty/i,
  );
});
