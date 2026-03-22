import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  collectCriticalTestWorkspaces,
  collectWorkspaceCatalog,
  readWorkspacePolicy,
} from "../workspaces/catalog.mjs";

const repoRoot = process.cwd();
const scriptPath = path.join(repoRoot, "scripts", "check-workspace-scripts.mjs");

function runScript(args) {
  return spawnSync("node", [scriptPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

test("workspace catalog excludes generated Next.js package manifests", () => {
  const workspaces = collectWorkspaceCatalog(repoRoot);
  const workspaceDirectories = workspaces.map((workspace) => workspace.dir);

  assert.ok(workspaceDirectories.includes("app-admin"));
  assert.ok(workspaceDirectories.includes("app-webapp"));
  assert.ok(workspaceDirectories.includes("app-landing"));
  assert.ok(!workspaceDirectories.some((dir) => dir.includes(".next")));
});

test("all discovered workspaces expose build, lint and typecheck scripts", () => {
  const workspaces = collectWorkspaceCatalog(repoRoot);

  for (const workspace of workspaces) {
    assert.equal(typeof workspace.scripts.build, "string", workspace.name);
    assert.equal(typeof workspace.scripts.lint, "string", workspace.name);
    assert.equal(typeof workspace.scripts.typecheck, "string", workspace.name);
  }
});

test("critical test workspaces stay aligned with the repository catalog", () => {
  const policy = readWorkspacePolicy(repoRoot);
  const criticalWorkspaces = collectCriticalTestWorkspaces(repoRoot);

  assert.equal(
    criticalWorkspaces.length,
    policy.required_test_workspaces.length,
  );

  for (const workspace of criticalWorkspaces) {
    assert.equal(typeof workspace.scripts.test, "string", workspace.name);
  }
});

test("workspace script guard validates critical test workspaces", () => {
  const result = runScript(["--task", "test", "--scope", "critical-test"]);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /\[workspace-scripts\] OK/);
});
