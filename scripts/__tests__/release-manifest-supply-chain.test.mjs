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
const createScriptPath = path.join(
  repoRoot,
  "scripts",
  "scw-release-manifest-create.sh",
);
const verifyScriptPath = path.join(
  repoRoot,
  "scripts",
  "release-manifest-verify.sh",
);

function runScript(scriptPath, args) {
  return spawnSync("bash", [scriptPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

function createSupplyChainEvidence(tempRoot) {
  const evidenceDir = path.join(tempRoot, "evidence");
  mkdirSync(evidenceDir, { recursive: true });

  const sbomPath = path.join(evidenceDir, "sbom.cdx.json");
  const scanPath = path.join(evidenceDir, "grype-findings.json");
  const summaryPath = path.join(evidenceDir, "supply-chain-evidence.json");

  writeFileSync(
    sbomPath,
    JSON.stringify({ bomFormat: "CycloneDX", specVersion: "1.6" }, null, 2),
  );
  writeFileSync(
    scanPath,
    JSON.stringify({ matches: [], source: { type: "sbom" } }, null, 2),
  );

  const sbomSha = sha256(sbomPath);
  const scanSha = sha256(scanPath);

  writeFileSync(
    summaryPath,
    JSON.stringify(
      {
        summary_type: "supply-chain-evidence",
        schema_version: "1",
        recorded_at: "2026-03-12T10:00:00Z",
        status: "pass",
        policy: {
          vulnerability_fail_on: "medium",
        },
        artifacts: {
          sbom: {
            format: "cyclonedx-json",
            path: sbomPath,
            sha256: sbomSha,
          },
          vulnerability_scan: {
            engine: "grype",
            path: scanPath,
            sha256: scanSha,
            active_signal_count: 0,
          },
        },
      },
      null,
      2,
    ),
  );

  return { sbomPath, scanPath, summaryPath };
}

function sha256(filePath) {
  const result = spawnSync("openssl", ["dgst", "-sha256", filePath], {
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const match = result.stdout.match(/=\s*([0-9a-f]+)\s*$/i);
  assert.ok(match);
  return match[1];
}

test("release manifest carries and verifies supply-chain evidence", () => {
  const tempRoot = mkdtempSync(
    path.join(os.tmpdir(), "manifest-supply-chain-"),
  );

  try {
    const manifestPath = path.join(tempRoot, "manifest.json");
    const gateReportPath = path.join(tempRoot, "gate-report.json");
    const keyPath = path.join(tempRoot, "release.key");
    const { summaryPath } = createSupplyChainEvidence(tempRoot);
    writeFileSync(keyPath, "release-test-key\n");

    writeFileSync(
      gateReportPath,
      JSON.stringify({ commit_sha: "placeholder", status: "pass" }, null, 2),
    );

    const createResult = runScript(createScriptPath, [
      "--ref",
      "HEAD",
      "--gate-report",
      gateReportPath,
      "--output",
      manifestPath,
      "--image",
      "api=registry.example.com/praedixa/api@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "--supply-chain-evidence",
      summaryPath,
      "--key-file",
      keyPath,
    ]);
    assert.equal(
      createResult.status,
      0,
      createResult.stderr || createResult.stdout,
    );

    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    assert.equal(manifest.gate_report.path, gateReportPath);
    assert.equal(manifest.gate_report.sha256, sha256(gateReportPath));
    assert.equal(manifest.supply_chain_evidence.length, 1);
    assert.equal(
      manifest.supply_chain_evidence[0].summary.artifacts.sbom.path,
      path.join(tempRoot, "evidence", "sbom.cdx.json"),
    );

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

    writeFileSync(
      gateReportPath,
      JSON.stringify({ commit_sha: "placeholder", status: "fail" }, null, 2),
    );

    const tamperedGateReportVerify = runScript(verifyScriptPath, [
      "--manifest",
      manifestPath,
      "--key-file",
      keyPath,
    ]);
    assert.equal(tamperedGateReportVerify.status, 1);
    assert.match(
      tamperedGateReportVerify.stderr,
      /gate report digest mismatch/,
    );

    writeFileSync(
      gateReportPath,
      JSON.stringify({ commit_sha: "placeholder", status: "pass" }, null, 2),
    );

    writeFileSync(
      manifest.supply_chain_evidence[0].summary.artifacts.vulnerability_scan
        .path,
      JSON.stringify(
        { matches: [{ vulnerability: { id: "CVE-2026-0001" } }] },
        null,
        2,
      ),
    );

    const failedVerify = runScript(verifyScriptPath, [
      "--manifest",
      manifestPath,
      "--key-file",
      keyPath,
    ]);
    assert.equal(failedVerify.status, 1);
    assert.match(
      failedVerify.stderr,
      /supply-chain vulnerability_scan artifact digest mismatch/,
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
