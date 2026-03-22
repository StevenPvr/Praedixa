import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import test from "node:test";

const repoRoot = process.cwd();
const deployScriptPath = path.join(
  repoRoot,
  "scripts",
  "scw",
  "scw-release-deploy.sh",
);
const createManifestScriptPath = path.join(
  repoRoot,
  "scripts",
  "scw",
  "scw-release-manifest-create.sh",
);
const realJqPath = spawnSync("bash", ["-lc", "command -v jq"], {
  cwd: repoRoot,
  encoding: "utf8",
}).stdout.trim();

function writeExecutable(filePath, content) {
  writeFileSync(filePath, content, { mode: 0o755 });
}

function writeGateReport(reportPath) {
  writeFileSync(
    reportPath,
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
}

test("scw-release-deploy fails instead of falling back from digest to mutable tag", () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "scw-release-deploy-"));
  const binDir = path.join(tempRoot, "bin");
  const scwLogPath = path.join(tempRoot, "scw.log");
  const manifestPath = path.join(tempRoot, "manifest.json");
  const gateReportPath = path.join(tempRoot, "gate-report.json");
  const keyPath = path.join(tempRoot, "release.key");

  mkdirSync(binDir, { recursive: true });

  writeExecutable(
    path.join(binDir, "scw"),
    `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(scwLogPath)}, args.join(" ") + "\\n");
if (
  args[0] === "container" &&
  args[1] === "container" &&
  args[2] === "list"
) {
  process.stdout.write(JSON.stringify([{ id: "container-1", name: "api-staging" }]));
  process.exit(0);
}
if (
  args[0] === "container" &&
  args[1] === "container" &&
  args[2] === "update"
) {
  const imageArg = args.find((entry) => entry.startsWith("registry-image=")) ?? "";
  const imageRef = imageArg.split("=", 2)[1] ?? "";
  if (imageRef.includes("@sha256:")) {
    process.stdout.write(JSON.stringify({ error: { message: "digest refs unsupported" } }));
    process.exit(1);
  }
  process.stdout.write(JSON.stringify({ id: "container-1", status: "ready" }));
  process.exit(0);
}
process.exit(1);
`,
  );
  writeExecutable(
    path.join(binDir, "jq"),
    `#!/usr/bin/env bash\nexec ${realJqPath} "$@"\n`,
  );

  writeFileSync(keyPath, "release-test-key\n");
  writeGateReport(gateReportPath);

  const createResult = spawnSync(
    "bash",
    [
      createManifestScriptPath,
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
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
    },
  );
  assert.equal(
    createResult.status,
    0,
    createResult.stderr || createResult.stdout,
  );

  const deployResult = spawnSync(
    "bash",
    [
      deployScriptPath,
      "--manifest",
      manifestPath,
      "--env",
      "staging",
      "--services",
      "api",
      "--key-file",
      keyPath,
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH}`,
      },
    },
  );

  assert.equal(deployResult.status, 1);
  assert.match(
    deployResult.stderr,
    /failed to deploy signed image ref .*@sha256:.*digest refs unsupported/,
  );

  const scwLog = readFileSync(scwLogPath, "utf8");
  assert.equal((scwLog.match(/container container update/g) ?? []).length, 1);
  assert.doesNotMatch(scwLog, /registry-image=registry\.example\.com\/praedixa\/api$/m);

  rmSync(tempRoot, { recursive: true, force: true });
});
