import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";
import test from "node:test";

import {
  loadControlPlaneInventory,
  validateBackupEvidenceSummary,
  validateControlPlaneInventory,
  validateRestoreEvidenceSummary,
} from "../validate-control-plane-restore-evidence.mjs";

const repoRoot = process.cwd();
const inventoryPath = path.join(
  repoRoot,
  "docs/security/control-plane-metadata-inventory.json",
);
const createScriptPath = path.join(
  repoRoot,
  "scripts",
  "scw",
  "scw-release-manifest-create.sh",
);
const verifyScriptPath = path.join(
  repoRoot,
  "scripts",
  "release-manifest-verify.sh",
);

function runScript(scriptPath, args) {
  return spawnSync("bash", [scriptPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

function sha256(filePath) {
  const result = spawnSync("openssl", ["dgst", "-sha256", filePath], {
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const match = result.stdout.match(/=\s*([0-9a-f]+)\s*$/i);
  assert.ok(match);
  return match[1];
}

function createDatabaseEvidence(tempRoot) {
  const inventory = loadControlPlaneInventory(inventoryPath);
  const backupSummaryPath = path.join(tempRoot, "backup-summary.json");
  const restoreSummaryPath = path.join(tempRoot, "restore-summary.json");
  const evidenceDir = path.join(tempRoot, "restore-evidence");
  mkdirSync(evidenceDir, { recursive: true });

  const restoreChecks = inventory.required_restore_checks.map((check) => {
    const evidencePath = path.join(evidenceDir, `${check.check_id}.json`);
    writeFileSync(
      evidencePath,
      JSON.stringify(
        {
          check_id: check.check_id,
          target: check.target,
          result: "pass",
        },
        null,
        2,
      ),
    );

    return {
      check_id: check.check_id,
      status: "pass",
      evidence: {
        path: evidencePath,
        sha256: sha256(evidencePath),
      },
    };
  });
  const visibilityEvidencePath = path.join(
    evidenceDir,
    "restored-database-visible.json",
  );
  writeFileSync(
    visibilityEvidencePath,
    JSON.stringify(
      { database: "praedixa_prod_restore", visible: true },
      null,
      2,
    ),
  );

  writeFileSync(
    backupSummaryPath,
    JSON.stringify(
      {
        summary_type: "database-backup-evidence",
        schema_version: "1",
        inventory_version: inventory.inventory_version,
        status: "pass",
        recorded_at: "2026-03-12T10:00:00Z",
        instance_id: "rdb-prod-1",
        region: "fr-par",
        database_name: "praedixa_prod",
        backup_count: 3,
        latest_backup_id: "backup-123",
        latest_backup_created_at: "2026-03-12T09:30:00Z",
        manual_backup_id: null,
        checks: [
          {
            check_id: "instance_snapshot_recorded",
            status: "pass",
          },
          {
            check_id: "latest_backup_identified",
            status: "pass",
          },
          {
            check_id: "manual_backup_requested_or_not_required",
            status: "not_applicable",
          },
        ],
      },
      null,
      2,
    ),
  );

  writeFileSync(
    restoreSummaryPath,
    JSON.stringify(
      {
        summary_type: "database-restore-evidence",
        schema_version: "1",
        inventory_version: inventory.inventory_version,
        status: "pass",
        started_at: "2026-03-12T10:00:00Z",
        ended_at: "2026-03-12T10:05:00Z",
        instance_id: "rdb-prod-1",
        backup_id: "backup-123",
        region: "fr-par",
        source_database_name: "praedixa_prod",
        restored_database_name: "praedixa_prod_restore",
        rto_seconds: 300,
        verified_database_presence: true,
        checks: [
          {
            check_id: "restored_database_visible",
            status: "pass",
            evidence: {
              path: visibilityEvidencePath,
              sha256: sha256(visibilityEvidencePath),
            },
          },
          ...restoreChecks,
        ],
      },
      null,
      2,
    ),
  );

  return { backupSummaryPath, restoreSummaryPath };
}

test("committed control-plane inventory stays valid", () => {
  const inventory = loadControlPlaneInventory(inventoryPath);
  assert.deepEqual(validateControlPlaneInventory(inventory), []);
});

test("backup and restore summaries validate against the committed inventory", () => {
  const inventory = loadControlPlaneInventory(inventoryPath);
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "control-plane-"));

  try {
    const { backupSummaryPath, restoreSummaryPath } =
      createDatabaseEvidence(tempRoot);

    assert.deepEqual(
      validateBackupEvidenceSummary(
        JSON.parse(readFileSync(backupSummaryPath, "utf8")),
        inventory,
      ),
      [],
    );
    assert.deepEqual(
      validateRestoreEvidenceSummary(
        JSON.parse(readFileSync(restoreSummaryPath, "utf8")),
        inventory,
      ),
      [],
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("release manifest verification enforces typed restore evidence", () => {
  const tempRoot = mkdtempSync(
    path.join(os.tmpdir(), "manifest-control-plane-"),
  );

  try {
    const manifestPath = path.join(tempRoot, "manifest.json");
    const gateReportPath = path.join(tempRoot, "gate-report.json");
    const keyPath = path.join(tempRoot, "release.key");
    const { backupSummaryPath, restoreSummaryPath } =
      createDatabaseEvidence(tempRoot);
    writeFileSync(keyPath, "restore-test-key\n");

    writeFileSync(
      gateReportPath,
      JSON.stringify(
        {
          schema_version: "2",
          commit_sha: "placeholder",
          timestamp_epoch: Math.floor(Date.now() / 1000),
          dry_run: false,
          summary: {
            status: "pass",
            blocking_failed_checks: 0,
            low_failed_checks: 0,
          },
        },
        null,
        2,
      ),
    );

    const createResult = runScript(createScriptPath, [
      "--ref",
      "HEAD",
      "--gate-report",
      gateReportPath,
      "--output",
      manifestPath,
      "--image",
      "api=registry.example.com/praedixa/api@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "--database-impact",
      "--backup-evidence",
      backupSummaryPath,
      "--restore-evidence",
      restoreSummaryPath,
      "--key-file",
      keyPath,
    ]);
    assert.equal(
      createResult.status,
      0,
      createResult.stderr || createResult.stdout,
    );

    const verifyResult = runScript(verifyScriptPath, [
      "--manifest",
      manifestPath,
      "--key-file",
      keyPath,
    ]);
    assert.equal(
      verifyResult.status,
      0,
      verifyResult.stderr || verifyResult.stdout,
    );

    const restoreSummaryBeforeTamper = JSON.parse(
      readFileSync(restoreSummaryPath, "utf8"),
    );
    const tamperedEvidencePath =
      restoreSummaryBeforeTamper.checks.find(
        (check) => check.check_id === "rbac_assignments_restored",
      )?.evidence?.path ?? "";
    writeFileSync(
      tamperedEvidencePath,
      JSON.stringify({ target: "rbac_links", result: "tampered" }, null, 2),
    );

    const tamperedEvidenceVerify = runScript(verifyScriptPath, [
      "--manifest",
      manifestPath,
      "--key-file",
      keyPath,
    ]);
    assert.equal(tamperedEvidenceVerify.status, 1);
    assert.match(tamperedEvidenceVerify.stderr, /evidence digest mismatch/);

    const restoreSummaryCurrent = JSON.parse(
      readFileSync(restoreSummaryPath, "utf8"),
    );
    const evidenceToRepair = restoreSummaryCurrent.checks.find(
      (check) => check.check_id === "rbac_assignments_restored",
    );
    evidenceToRepair.evidence.sha256 = sha256(tamperedEvidencePath);
    writeFileSync(
      restoreSummaryPath,
      JSON.stringify(restoreSummaryCurrent, null, 2),
    );

    const restoreSummary = JSON.parse(readFileSync(restoreSummaryPath, "utf8"));
    restoreSummary.checks = restoreSummary.checks.filter(
      (check) => check.check_id !== "rbac_assignments_restored",
    );
    writeFileSync(restoreSummaryPath, JSON.stringify(restoreSummary, null, 2));

    const recreateResult = runScript(createScriptPath, [
      "--ref",
      "HEAD",
      "--gate-report",
      gateReportPath,
      "--output",
      manifestPath,
      "--image",
      "api=registry.example.com/praedixa/api@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "--database-impact",
      "--backup-evidence",
      backupSummaryPath,
      "--restore-evidence",
      restoreSummaryPath,
      "--key-file",
      keyPath,
    ]);
    assert.equal(
      recreateResult.status,
      0,
      recreateResult.stderr || recreateResult.stdout,
    );

    const failedVerify = runScript(verifyScriptPath, [
      "--manifest",
      manifestPath,
      "--key-file",
      keyPath,
    ]);
    assert.equal(failedVerify.status, 1);
    assert.match(
      failedVerify.stderr,
      /restore evidence missing check rbac_assignments_restored/,
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
