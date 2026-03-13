import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  extractMarkedJsonBlock,
  loadPerformanceBudgetBaselines,
  validatePerformanceBudgetBaselines,
} from "../validate-performance-budgets.mjs";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "../..");
const budgetsPath = path.join(
  repoRoot,
  "docs/performance/build-ready-budgets.md",
);
const capacityPath = path.join(
  repoRoot,
  "docs/performance/capacity-envelopes.md",
);

test("performance budget baselines validate cleanly", () => {
  const baselines = loadPerformanceBudgetBaselines(budgetsPath, capacityPath);
  assert.deepEqual(validatePerformanceBudgetBaselines(baselines), []);
});

test("extractMarkedJsonBlock rejects missing markers", () => {
  assert.throws(
    () =>
      extractMarkedJsonBlock(
        "# no baseline here",
        "performance-budget-baseline",
      ),
    /missing json block/i,
  );
});

test("validator rejects duplicate api budget ids", () => {
  const baselines = loadPerformanceBudgetBaselines(budgetsPath, capacityPath);
  baselines.budgets.api_budgets.push({ ...baselines.budgets.api_budgets[0] });

  assert.match(
    validatePerformanceBudgetBaselines(baselines).join("\n"),
    /duplicate id/i,
  );
});

test("validator rejects cross-doc load class drift", () => {
  const baselines = loadPerformanceBudgetBaselines(budgetsPath, capacityPath);
  baselines.capacity.load_classes.T2.canonical_rows_per_day_max = 3000000;

  assert.match(
    validatePerformanceBudgetBaselines(baselines).join("\n"),
    /load_classes must stay identical/i,
  );
});

test("validator rejects reversed min-direction capacity ordering", () => {
  const baselines = loadPerformanceBudgetBaselines(budgetsPath, capacityPath);
  const syncInterval = baselines.capacity.connector_limits.find(
    (entry) => entry.id === "default_sync_interval_minutes",
  );
  syncInterval.soft = 45;

  assert.match(
    validatePerformanceBudgetBaselines(baselines).join("\n"),
    /must respect min ordering/i,
  );
});

test("validator works against explicit temporary markdown inputs", async () => {
  const tempDir = await mkdtemp(
    path.join(tmpdir(), "praedixa-performance-budgets-"),
  );

  try {
    const tempBudgetsPath = path.join(tempDir, "build-ready-budgets.md");
    const tempCapacityPath = path.join(tempDir, "capacity-envelopes.md");

    await writeFile(
      tempBudgetsPath,
      await readFile(budgetsPath, "utf8"),
      "utf8",
    );
    await writeFile(
      tempCapacityPath,
      await readFile(capacityPath, "utf8"),
      "utf8",
    );

    const baselines = loadPerformanceBudgetBaselines(
      tempBudgetsPath,
      tempCapacityPath,
    );

    assert.deepEqual(validatePerformanceBudgetBaselines(baselines), []);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
