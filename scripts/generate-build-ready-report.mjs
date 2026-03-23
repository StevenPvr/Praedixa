#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  defaultStatusPath,
  loadBuildReadyStatus,
  validateBuildReadyStatus,
} from "./validate-build-ready-status.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");

function parseArgs(argv) {
  const args = {
    outputPath: null,
    sha: process.env.GITHUB_SHA || null,
    statusPath: defaultStatusPath,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--output") {
      args.outputPath = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg === "--sha") {
      args.sha = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg === "--status") {
      args.statusPath = argv[index + 1] ?? defaultStatusPath;
      index += 1;
    }
  }

  return args;
}

function resolveSha(explicitSha) {
  if (explicitSha) {
    return explicitSha;
  }

  return execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: repoRoot,
    encoding: "utf8",
  }).trim();
}

export function buildBuildReadyReport({
  commitSha,
  status,
  statusPath = defaultStatusPath,
}) {
  return {
    summary_type: "build-ready-report",
    schema_version: "1",
    generated_at: new Date().toISOString(),
    commit_sha: commitSha,
    current_verdict: status.current_verdict,
    decision_scope: status.decision_scope,
    source_status_path: path.relative(repoRoot, statusPath),
    open_blocker_count: status.open_blockers.length,
    merge_authority: status.merge_authority,
    clusters: status.clusters.map((cluster) => ({
      id: cluster.id,
      label: cluster.label,
      status: cluster.status,
      proof_count: cluster.proofs.length,
    })),
    open_blockers: status.open_blockers,
    github_context: {
      repository: process.env.GITHUB_REPOSITORY ?? null,
      workflow: process.env.GITHUB_WORKFLOW ?? null,
      run_id: process.env.GITHUB_RUN_ID ?? null,
      run_attempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
      ref: process.env.GITHUB_REF ?? null,
      actor: process.env.GITHUB_ACTOR ?? null,
    },
  };
}

export function writeBuildReadyReport(report, outputPath) {
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  const status = loadBuildReadyStatus(args.statusPath);
  const validationErrors = validateBuildReadyStatus(status);

  if (validationErrors.length > 0) {
    console.error(
      [
        "[generate-build-ready-report] Build-ready status is invalid",
        ...validationErrors.map((error) => `- ${error}`),
      ].join("\n"),
    );
    process.exit(1);
  }

  const commitSha = resolveSha(args.sha);
  const outputPath =
    args.outputPath ??
    path.join(repoRoot, ".git/gate-reports", `build-ready-${commitSha}.json`);

  const report = buildBuildReadyReport({
    commitSha,
    status,
    statusPath: args.statusPath,
  });

  writeBuildReadyReport(report, outputPath);
  console.log(
    `[generate-build-ready-report] Wrote ${path.relative(repoRoot, outputPath)}`,
  );
}
