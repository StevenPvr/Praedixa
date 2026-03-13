import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import test from "node:test";

const repoRoot = process.cwd();
const signScriptPath = path.join(repoRoot, "scripts", "gate-report-sign.sh");
const verifyScriptPath = path.join(
  repoRoot,
  "scripts",
  "verify-gate-report.sh",
);

function runScript(scriptPath, args) {
  return spawnSync("bash", [scriptPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

test("gate report signing requires a pre-provisioned key", () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "gate-sign-key-"));

  try {
    const unsignedPath = path.join(tempRoot, "unsigned.json");
    const outputPath = path.join(tempRoot, "signed.json");
    const missingKeyPath = path.join(tempRoot, "missing.key");

    writeFileSync(
      unsignedPath,
      JSON.stringify({ schema_version: "2", commit_sha: "abc" }, null, 2),
    );

    const result = runScript(signScriptPath, [
      "--unsigned",
      unsignedPath,
      "--output",
      outputPath,
      "--key-file",
      missingKeyPath,
    ]);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Missing gate signing key/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("gate report verification rejects a tampered signed report", () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "gate-signature-"));

  try {
    const reportPath = path.join(tempRoot, "report.json");
    const keyPath = path.join(tempRoot, "gate-signing.key");
    const commitSha = spawnSync("git", ["rev-parse", "HEAD"], {
      cwd: repoRoot,
      encoding: "utf8",
    }).stdout.trim();

    writeFileSync(keyPath, "gate-report-test-key\n");
    writeFileSync(
      reportPath,
      JSON.stringify(
        {
          schema_version: "2",
          commit_sha: commitSha,
          timestamp_epoch: Math.floor(Date.now() / 1000),
          dry_run: false,
          summary: {
            status: "pass",
            blocking_failed_checks: 0,
          },
          policy: {
            version: "test",
          },
          residual_risk_notice: "none",
        },
        null,
        2,
      ),
    );

    const signResult = runScript(signScriptPath, [
      "--unsigned",
      reportPath,
      "--output",
      reportPath,
      "--key-file",
      keyPath,
    ]);
    assert.equal(signResult.status, 0, signResult.stderr || signResult.stdout);

    const verifyOk = runScript(verifyScriptPath, [
      "--report-path",
      reportPath,
      "--key-file",
      keyPath,
    ]);
    assert.equal(verifyOk.status, 0, verifyOk.stderr || verifyOk.stdout);

    const signedReport = JSON.parse(readFileSync(reportPath, "utf8"));
    writeFileSync(
      reportPath,
      JSON.stringify(
        {
          ...signedReport,
          residual_risk_notice: "tampered-after-signature",
        },
        null,
        2,
      ),
    );

    const tamperedVerify = runScript(verifyScriptPath, [
      "--report-path",
      reportPath,
      "--key-file",
      keyPath,
    ]);
    assert.equal(tamperedVerify.status, 1);
    assert.match(tamperedVerify.stderr, /Invalid signature/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
