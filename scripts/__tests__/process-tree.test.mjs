import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import test from "node:test";

const repoRoot = process.cwd();
const helperPath = path.join(repoRoot, "scripts", "lib", "process-tree.sh");

function runHelper(scriptLines) {
  return spawnSync("bash", ["-lc", scriptLines.join("\n")], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

test("wait_for_pid_exit treats an unreaped zombie child as exited", () => {
  const result = runHelper([
    `source "${helperPath}"`,
    "(sleep 0.1) &",
    "pid=$!",
    "sleep 0.2",
    "wait_for_pid_exit \"$pid\" 1",
    "wait \"$pid\" 2>/dev/null || true",
  ]);

  assert.equal(result.status, 0, result.stderr || result.stdout);
});
