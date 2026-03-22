import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import test from "node:test";

const repoRoot = process.cwd();
const scriptPath = path.join(repoRoot, "scripts", "smoke-test-production.sh");

function writeExecutable(filePath, content) {
  writeFileSync(filePath, content, { mode: 0o755 });
}

test("smoke-test-production probes the versioned API health route", () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "smoke-production-"));
  const binDir = path.join(tempRoot, "bin");

  mkdirSync(binDir, { recursive: true });

  writeExecutable(
    path.join(binDir, "curl"),
    `#!/usr/bin/env node
const args = process.argv.slice(2);
let writeFormat = "%{http_code}";
let method = "GET";
let origin = "";
let url = "";

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "-w") {
    writeFormat = args[index + 1];
    index += 1;
    continue;
  }
  if (arg === "-X") {
    method = args[index + 1];
    index += 1;
    continue;
  }
  if (arg === "-H") {
    const header = args[index + 1] ?? "";
    if (header.toLowerCase().startsWith("origin:")) {
      origin = header.slice(header.indexOf(":") + 1).trim();
    }
    index += 1;
    continue;
  }
  if (!arg.startsWith("-")) {
    url = arg;
  }
}

const parsed = new URL(url);
let status = 500;
if (method === "GET" && parsed.pathname === "/api/v1/health") {
  status = 200;
} else if (method === "GET" && parsed.pathname === "/api/v1/live/dashboard/summary") {
  status = 401;
} else if (
  method === "OPTIONS" &&
  parsed.pathname === "/api/v1/live/dashboard/summary" &&
  origin === "https://app.praedixa.com"
) {
  status = 200;
} else if (method === "GET" && parsed.pathname === "/health") {
  status = 404;
}

process.stdout.write(
  writeFormat.replace("%{http_code}", String(status)),
);
`,
  );

  const result = spawnSync("bash", [scriptPath], {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH}`,
    },
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /GET \/api\/v1\/health/);
  assert.match(result.stdout, /=== Results: 3 passed, 0 failed ===/);

  rmSync(tempRoot, { recursive: true, force: true });
});
