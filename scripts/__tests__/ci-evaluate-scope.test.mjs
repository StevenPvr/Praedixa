import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import test from "node:test";

const repoRoot = process.cwd();
const scopeScriptPath = path.join(repoRoot, "scripts", "ci-evaluate-scope.sh");

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}

function initRepo() {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "ci-scope-"));
  run("git", ["init"], tempRoot);
  run("git", ["config", "user.email", "ci-scope@example.com"], tempRoot);
  run("git", ["config", "user.name", "CI Scope Test"], tempRoot);
  return tempRoot;
}

function writeRepoFile(tempRoot, relativePath, content) {
  const absolutePath = path.join(tempRoot, relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content);
}

function commitAll(tempRoot, message) {
  run("git", ["add", "."], tempRoot);
  run("git", ["commit", "-m", message], tempRoot);
  return run("git", ["rev-parse", "HEAD"], tempRoot).stdout.trim();
}

function runScope(tempRoot, workflow, baseSha, headSha) {
  const outputPath = path.join(tempRoot, `scope-${workflow}.env`);
  const changedFilesPath = path.join(tempRoot, `scope-${workflow}.txt`);
  const result = spawnSync(
    "bash",
    [
      scopeScriptPath,
      "--workflow",
      workflow,
      "--event-name",
      "pull_request",
      "--base-sha",
      baseSha,
      "--head-sha",
      headSha,
      "--output-path",
      outputPath,
      "--repo-root",
      tempRoot,
      "--changed-files-path",
      changedFilesPath,
    ],
    {
      cwd: tempRoot,
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  return {
    outputs: Object.fromEntries(
      readFileSync(outputPath, "utf8")
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => line.split("=", 2)),
    ),
    changedFiles: readFileSync(changedFilesPath, "utf8")
      .trim()
      .split("\n")
      .filter(Boolean),
  };
}

test("api scope treats critical release scripts as relevant runtime changes", () => {
  const tempRoot = initRepo();

  try {
    writeRepoFile(tempRoot, "README.md", "# test\n");
    const baseSha = commitAll(tempRoot, "chore: initial");

    writeRepoFile(
      tempRoot,
      "scripts/scw-release-deploy.sh",
      "#!/usr/bin/env bash\n",
    );
    const headSha = commitAll(tempRoot, "chore: add release script");

    const { outputs, changedFiles } = runScope(
      tempRoot,
      "api",
      baseSha,
      headSha,
    );
    assert.equal(outputs.relevant, "true");
    assert.equal(outputs.reason, "api_or_ci_critical_paths_changed");
    assert.equal(outputs.architecture_relevant, "true");
    assert.ok(changedFiles.includes("scripts/scw-release-deploy.sh"));
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("api scope reruns data-engine checks when the pinned Python tool helper changes", () => {
  const tempRoot = initRepo();

  try {
    writeRepoFile(tempRoot, "README.md", "# test\n");
    const baseSha = commitAll(tempRoot, "chore: initial");

    writeRepoFile(
      tempRoot,
      "scripts/ci-python-tool.sh",
      "#!/usr/bin/env bash\n",
    );
    const headSha = commitAll(tempRoot, "chore: update ci python helper");

    const { outputs } = runScope(tempRoot, "api", baseSha, headSha);
    assert.equal(outputs.relevant, "true");
    assert.equal(outputs.data_engine_relevant, "true");
    assert.equal(
      outputs.data_engine_reason,
      "data_engine_or_ci_tooling_changed",
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("admin scope stays skipped for unrelated documentation-only changes", () => {
  const tempRoot = initRepo();

  try {
    writeRepoFile(tempRoot, "README.md", "# test\n");
    const baseSha = commitAll(tempRoot, "chore: initial");

    writeRepoFile(tempRoot, "docs/notes.md", "notes\n");
    const headSha = commitAll(tempRoot, "docs: add notes");

    const { outputs } = runScope(tempRoot, "admin", baseSha, headSha);
    assert.equal(outputs.relevant, "false");
    assert.equal(outputs.architecture_relevant, "false");
    assert.equal(outputs.reason, "no_admin_or_ci_critical_paths_changed");
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
