import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import test from "node:test";

const repoRoot = process.cwd();
const smokeScriptPath = path.join(
  repoRoot,
  "scripts",
  "scw-post-deploy-smoke.sh",
);

function writeExecutable(filePath, content) {
  writeFileSync(filePath, content, { mode: 0o755 });
}

function createMockCurlBin() {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "post-deploy-smoke-"));
  const binDir = path.join(tempRoot, "bin");
  mkdirSync(binDir, { recursive: true });

  writeExecutable(
    path.join(binDir, "curl"),
    `#!/usr/bin/env node
const fs = require("node:fs");

const args = process.argv.slice(2);
let headersPath = null;
let bodyPath = null;
let writeFormat = "%{http_code}";
const requestHeaders = {};
let url = "";

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "-D") {
    headersPath = args[index + 1];
    index += 1;
    continue;
  }
  if (arg === "-o") {
    bodyPath = args[index + 1];
    index += 1;
    continue;
  }
  if (arg === "-w") {
    writeFormat = args[index + 1];
    index += 1;
    continue;
  }
  if (arg === "-H") {
    const header = args[index + 1] ?? "";
    const separator = header.indexOf(":");
    if (separator >= 0) {
      const name = header.slice(0, separator).trim().toLowerCase();
      const value = header.slice(separator + 1).trim();
      requestHeaders[name] = value;
    }
    index += 1;
    continue;
  }
  if (!arg.startsWith("-")) {
    url = arg;
  }
}

if (!url) {
  console.error("mock curl missing URL");
  process.exit(1);
}

const parsed = new URL(url);
const scenario = process.env.MOCK_SCW_SMOKE_SCENARIO ?? "happy";
const origin = requestHeaders.origin ?? "";
const fetchSite = (requestHeaders["sec-fetch-site"] ?? "").toLowerCase();

function buildAuthLocation(appOrigin, authOrigin) {
  const redirect = new URL("/realms/praedixa/protocol/openid-connect/auth", authOrigin);
  redirect.searchParams.set("client_id", appOrigin.includes("admin.") ? "praedixa-admin" : "praedixa-webapp");
  redirect.searchParams.set("response_type", "code");
  redirect.searchParams.set("scope", "openid profile email");
  redirect.searchParams.set("redirect_uri", appOrigin + "/auth/callback");
  redirect.searchParams.set("state", "state-token");
  redirect.searchParams.set("code_challenge", "challenge-token");
  redirect.searchParams.set("code_challenge_method", "S256");
  return redirect.toString();
}

function createResponse() {
  const isAdmin = parsed.hostname === "admin.praedixa.com";
  const appOrigin = parsed.origin;

  if ((parsed.hostname === "app.praedixa.com" || parsed.hostname === "admin.praedixa.com") && parsed.pathname === "/login") {
    return {
      status: 200,
      effectiveUrl: url,
      headers: { "content-type": ["text/html; charset=utf-8"] },
      body: "<html><body>login</body></html>",
    };
  }

  if ((parsed.hostname === "app.praedixa.com" || parsed.hostname === "admin.praedixa.com") && parsed.pathname === "/auth/login") {
    const authOrigin = scenario === "bad-login-host" ? "https://evil.example" : "https://auth.praedixa.com";
    return {
      status: 307,
      effectiveUrl: url,
      headers: {
        "cache-control": ["no-store"],
        location: [buildAuthLocation(appOrigin, authOrigin)],
        "set-cookie": [
          "cookie-a=value; Path=/; HttpOnly; Secure; SameSite=Lax",
          "cookie-b=value; Path=/; HttpOnly; Secure; SameSite=Lax",
          "cookie-c=value; Path=/; HttpOnly; Secure; SameSite=Lax",
        ],
      },
      body: "",
    };
  }

  if ((parsed.hostname === "app.praedixa.com" || parsed.hostname === "admin.praedixa.com") && parsed.pathname === "/auth/session") {
    if (origin === appOrigin && fetchSite === "same-origin") {
      return {
        status: 401,
        effectiveUrl: url,
        headers: { "cache-control": ["no-store"], "content-type": ["application/json"] },
        body: JSON.stringify({ error: "unauthorized" }),
      };
    }
    if (origin === "https://evil.example" && fetchSite === "cross-site") {
      return {
        status: 403,
        effectiveUrl: url,
        headers: { "cache-control": ["no-store"], "content-type": ["application/json"] },
        body: JSON.stringify({ error: isAdmin ? "csrf_failed" : "forbidden" }),
      };
    }
  }

  console.error("mock curl received unexpected request", url, JSON.stringify(requestHeaders));
  process.exit(1);
}

const response = createResponse();
const headerLines = [\`HTTP/2 \${response.status}\`];
for (const [name, values] of Object.entries(response.headers)) {
  for (const value of values) {
    headerLines.push(\`\${name}: \${value}\`);
  }
}
headerLines.push("", "");

if (headersPath) {
  fs.writeFileSync(headersPath, headerLines.join("\\r\\n"));
}
if (bodyPath) {
  fs.writeFileSync(bodyPath, response.body);
}

process.stdout.write(
  writeFormat
    .replaceAll("\\\\t", "\\t")
    .replace("%{http_code}", String(response.status))
    .replace("%{url_effective}", response.effectiveUrl),
);
`,
  );

  return tempRoot;
}

function runSmoke(args, options = {}) {
  return spawnSync("bash", [smokeScriptPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      ...(options.env ?? {}),
    },
  });
}

test("post-deploy smoke validates prod webapp/admin login redirect and session/origin checks", () => {
  const mockRoot = createMockCurlBin();

  try {
    const result = runSmoke(["--env", "prod", "--services", "webapp,admin"], {
      env: {
        PATH: `${path.join(mockRoot, "bin")}:${process.env.PATH}`,
      },
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /GET webapp \/auth\/login/);
    assert.match(result.stdout, /GET webapp \/auth\/session same-origin/);
    assert.match(result.stdout, /GET webapp \/auth\/session cross-origin/);
    assert.match(result.stdout, /GET admin \/auth\/login/);
    assert.match(result.stdout, /GET admin \/auth\/session same-origin/);
    assert.match(result.stdout, /GET admin \/auth\/session cross-origin/);
    assert.match(result.stdout, /Results: 8 passed, 0 failed/);
  } finally {
    rmSync(mockRoot, { recursive: true, force: true });
  }
});

test("post-deploy smoke fails closed for staging webapp/admin when auth origin is not explicit", () => {
  const result = runSmoke(["--env", "staging", "--services", "webapp"]);

  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr || result.stdout,
    /Staging auth smoke requires --auth-url with the explicit staging auth origin\./,
  );
});

test("post-deploy smoke rejects a frontend login redirect that leaves the expected auth host", () => {
  const mockRoot = createMockCurlBin();

  try {
    const result = runSmoke(["--env", "prod", "--services", "webapp"], {
      env: {
        PATH: `${path.join(mockRoot, "bin")}:${process.env.PATH}`,
        MOCK_SCW_SMOKE_SCENARIO: "bad-login-host",
      },
    });

    assert.equal(result.status, 1, result.stderr || result.stdout);
    assert.match(result.stdout, /GET webapp \/auth\/login/);
    assert.match(result.stdout, /Results: 3 passed, 1 failed/);
  } finally {
    rmSync(mockRoot, { recursive: true, force: true });
  }
});
