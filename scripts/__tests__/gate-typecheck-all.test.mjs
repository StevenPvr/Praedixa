import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import test from "node:test";

const repoRoot = process.cwd();
const scriptPath = path.join(
  repoRoot,
  "scripts",
  "gates",
  "gate-typecheck-all.sh",
);
const scriptSource = readFileSync(scriptPath, "utf8");

test("gate-typecheck-all restores generated Next.js type files before exit", () => {
  assert.match(scriptSource, /NEXT_ENV_FILES=\(/);
  assert.match(scriptSource, /app-landing\/next-env\.d\.ts/);
  assert.match(scriptSource, /app-webapp\/next-env\.d\.ts/);
  assert.match(scriptSource, /app-admin\/next-env\.d\.ts/);
  assert.match(scriptSource, /restore_generated_next_env_files\(\)/);
  assert.match(
    scriptSource,
    /git restore --worktree --source=HEAD -- "\$file"/,
  );
  assert.match(scriptSource, /trap restore_generated_next_env_files EXIT/);
});
