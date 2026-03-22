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

function runScript(scriptPath, args, extraEnv = {}) {
  return spawnSync("bash", [scriptPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      ...extraEnv,
    },
  });
}

function parseJsonLines(stderr) {
  return stderr
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

test("release manifest scripts emit correlated structured JSON logs", () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "manifest-logging-"));

  try {
    const gateReportPath = path.join(tempRoot, "gate-report.json");
    const manifestPath = path.join(tempRoot, "manifest.json");
    const keyPath = path.join(tempRoot, "release.key");

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
    assert.equal(createResult.stdout.trim(), manifestPath);

    const createLogs = parseJsonLines(createResult.stderr);
    assert.deepEqual(
      createLogs.map((payload) => payload.event),
      [
        "release_manifest_create.started",
        "release_manifest_sign.started",
        "release_manifest_sign.completed",
        "release_manifest_create.completed",
      ],
    );
    assert.deepEqual(
      createLogs.map((payload) => payload.status),
      ["started", "started", "completed", "completed"],
    );

    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const createReleaseIds = new Set(
      createLogs.map((payload) => payload.release_id),
    );
    assert.deepEqual([...createReleaseIds], [manifest.release_id]);
    createLogs.forEach((payload) => {
      assert.equal(payload.service, "release-manifest");
      assert.equal(typeof payload.timestamp, "string");
    });

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

    const verifyLogs = parseJsonLines(verifyResult.stderr);
    assert.deepEqual(
      verifyLogs.map((payload) => payload.event),
      ["release_manifest_verify.started", "release_manifest_verify.completed"],
    );
    assert.deepEqual(
      verifyLogs.map((payload) => payload.status),
      ["started", "completed"],
    );
    verifyLogs.forEach((payload) => {
      assert.equal(payload.service, "release-manifest");
      assert.equal(payload.release_id, manifest.release_id);
    });
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
