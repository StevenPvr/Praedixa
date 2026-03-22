import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import test from "node:test";

const repoRoot = process.cwd();
const scriptPath = path.join(
  repoRoot,
  "scripts",
  "scw",
  "scw-apply-container-config.sh",
);
const realJqPath = spawnSync("bash", ["-lc", "command -v jq"], {
  cwd: repoRoot,
  encoding: "utf8",
}).stdout.trim();

function writeExecutable(filePath, content) {
  writeFileSync(filePath, content, { mode: 0o755 });
}

test("scw-apply-container-config rejects SCW_API_URL outside the allowlist before calling curl", () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "scw-apply-config-"));
  const binDir = path.join(tempRoot, "bin");
  const curlLogPath = path.join(tempRoot, "curl.log");

  mkdirSync(binDir, { recursive: true });

  writeExecutable(
    path.join(binDir, "scw"),
    "#!/usr/bin/env bash\nexit 0\n",
  );
  writeExecutable(
    path.join(binDir, "curl"),
    `#!/usr/bin/env bash
printf 'curl-called\n' >>"${curlLogPath}"
exit 0
`,
  );
  writeExecutable(
    path.join(binDir, "jq"),
    `#!/usr/bin/env bash\nexec ${realJqPath} "$@"\n`,
  );

  const result = spawnSync(
    "bash",
    [
      scriptPath,
      "--container-id",
      "container-id",
      "--redeploy",
      "false",
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH}`,
        SCW_SECRET_KEY: "test-token",
        SCW_API_URL: "https://evil.example",
      },
    },
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Invalid SCW_API_URL: host evil\.example is not in allowlist/);
  try {
    const curlLog = readFileSync(curlLogPath, "utf8");
    assert.equal(curlLog, "");
  } catch (error) {
    assert.equal(error.code, "ENOENT");
  }

  rmSync(tempRoot, { recursive: true, force: true });
});

test("scw-apply-container-config serializes command and args into the PATCH payload", () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "scw-apply-config-"));
  const binDir = path.join(tempRoot, "bin");
  const curlPayloadPath = path.join(tempRoot, "payload.json");

  mkdirSync(binDir, { recursive: true });

  writeExecutable(
    path.join(binDir, "scw"),
    "#!/usr/bin/env bash\nexit 0\n",
  );
  writeExecutable(
    path.join(binDir, "curl"),
    `#!/usr/bin/env bash
response_file=""
payload_file=""
while (($# > 0)); do
  case "$1" in
    -o)
      response_file="$2"
      shift 2
      ;;
    --data-binary)
      payload_file="\${2#@}"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done
cat "$payload_file" >"${curlPayloadPath}"
printf '{"id":"container-id"}' >"$response_file"
printf '200'
`,
  );
  writeExecutable(
    path.join(binDir, "jq"),
    `#!/usr/bin/env bash\nexec ${realJqPath} "$@"\n`,
  );

  const result = spawnSync(
    "bash",
    [
      scriptPath,
      "--container-id",
      "container-id",
      "--redeploy",
      "false",
      "--command",
      "/opt/keycloak/bin/kc.sh",
      "--arg",
      "start",
      "--arg",
      "--optimized",
      "--arg",
      "--import-realm",
      "--arg",
      "--http-port=8080",
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH}`,
        SCW_SECRET_KEY: "test-token",
      },
    },
  );

  assert.equal(result.status, 0);
  const payload = JSON.parse(readFileSync(curlPayloadPath, "utf8"));
  assert.deepEqual(payload.command, ["/opt/keycloak/bin/kc.sh"]);
  assert.deepEqual(payload.args, [
    "start",
    "--optimized",
    "--import-realm",
    "--http-port=8080",
  ]);

  rmSync(tempRoot, { recursive: true, force: true });
});
