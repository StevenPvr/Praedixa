import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import test from "node:test";

const repoRoot = process.cwd();
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

function writeGateReport(reportPath, status, blockingFailedChecks = 0) {
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        schema_version: "2",
        commit_sha: "placeholder",
        timestamp_epoch: Math.floor(Date.now() / 1000),
        dry_run: false,
        summary: {
          status,
          blocking_failed_checks: blockingFailedChecks,
          low_failed_checks: 0,
        },
      },
      null,
      2,
    ),
  );
}

test("release manifest verification rejects a red gate report even when its digest matches", () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "manifest-gate-red-"));

  try {
    const manifestPath = path.join(tempRoot, "manifest.json");
    const gateReportPath = path.join(tempRoot, "gate-report.json");
    const keyPath = path.join(tempRoot, "release.key");

    writeGateReport(gateReportPath, "fail", 1);
    writeFileSync(keyPath, "release-test-key\n");

    const createResult = runScript(createScriptPath, [
      "--ref",
      "HEAD",
      "--gate-report",
      gateReportPath,
      "--output",
      manifestPath,
      "--image",
      "api=registry.example.com/praedixa/api@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "--key-file",
      keyPath,
    ]);
    assert.equal(
      createResult.status,
      0,
      createResult.stderr || createResult.stdout,
    );

    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    assert.equal(manifest.gate_report.path, gateReportPath);

    const verifyResult = runScript(verifyScriptPath, [
      "--manifest",
      manifestPath,
      "--key-file",
      keyPath,
    ]);
    assert.equal(verifyResult.status, 1);
    assert.match(
      verifyResult.stderr,
      /Gate report status must be pass|blocking_failed_checks must be 0/,
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
