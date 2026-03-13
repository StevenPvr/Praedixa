import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import test from "node:test";

const repoRoot = process.cwd();
const helperPath = path.join(repoRoot, "scripts", "lib", "json-log.sh");

function runHelper(scriptLines) {
  return spawnSync("bash", ["-lc", scriptLines.join("\n")], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

test("json-log helper emits canonical JSON on stderr", () => {
  const result = runHelper([
    `source "${helperPath}"`,
    "SCRIPT_NAME=test-json-log.sh",
    "SCRIPT_SERVICE=release",
    "REQUEST_ID=req-123",
    "RUN_ID=run-456",
    "TRACE_ID=trace-789",
    "json_log::emit info release.test 'Helper emitted log' manifest_path=/tmp/manifest.json",
  ]);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.stdout.trim(), "");

  const payload = JSON.parse(result.stderr.trim());
  assert.equal(payload.level, "info");
  assert.equal(payload.event, "release.test");
  assert.equal(payload.message, "Helper emitted log");
  assert.equal(payload.script, "test-json-log.sh");
  assert.equal(payload.service, "release");
  assert.equal(payload.request_id, "req-123");
  assert.equal(payload.run_id, "run-456");
  assert.equal(payload.trace_id, "trace-789");
  assert.equal(payload.connector_run_id, null);
  assert.equal(payload.action_id, null);
  assert.equal(payload.contract_version, null);
  assert.equal(payload.manifest_path, "/tmp/manifest.json");
  assert.equal(typeof payload.timestamp, "string");
});

test("json-log helper rejects malformed correlation context", () => {
  const result = runHelper([
    `source "${helperPath}"`,
    "SCRIPT_NAME=test-json-log.sh",
    "SCRIPT_SERVICE=release",
    "REQUEST_ID='req bad'",
    "json_log::emit info release.test 'Helper emitted log'",
  ]);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /malformed request_id/);
});

test("json-log helper rejects extra keys that collide with the canonical schema", () => {
  const result = runHelper([
    `source "${helperPath}"`,
    "SCRIPT_NAME=test-json-log.sh",
    "SCRIPT_SERVICE=release",
    "json_log::emit info release.test 'Helper emitted log' release_id=dup",
  ]);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /collides with the canonical schema/);
});
