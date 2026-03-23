#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");

export const defaultStatusPath = path.join(
  repoRoot,
  "docs/governance/build-ready-status.json",
);

const allowedVerdicts = new Set(["go", "no-go"]);
const allowedClusterStatuses = new Set(["ready", "partial", "blocked"]);
const allowedSeverities = new Set(["critical", "high", "medium", "low"]);

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function normalizeReference(reference) {
  return String(reference).split("#", 1)[0];
}

function resolveRepoPath(relativePath) {
  return path.join(repoRoot, relativePath);
}

export function loadBuildReadyStatus(statusPath = defaultStatusPath) {
  return JSON.parse(readFileSync(statusPath, "utf8"));
}

export function validateBuildReadyStatus(
  status,
  { repoRootPath = repoRoot } = {},
) {
  const errors = [];

  if (status?.status_type !== "build-ready-status") {
    errors.push('status_type must be "build-ready-status"');
  }

  if (status?.schema_version !== "1") {
    errors.push('schema_version must be "1"');
  }

  if (status?.decision_scope !== "global-monorepo") {
    errors.push('decision_scope must be "global-monorepo"');
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(status?.as_of ?? ""))) {
    errors.push("as_of must use YYYY-MM-DD");
  }

  if (!allowedVerdicts.has(String(status?.current_verdict ?? ""))) {
    errors.push('current_verdict must be "go" or "no-go"');
  }

  const mergeAuthority = status?.merge_authority;
  if (typeof mergeAuthority !== "object" || mergeAuthority === null) {
    errors.push("merge_authority must be an object");
  } else {
    if (mergeAuthority.required_check !== "Autorite - Required") {
      errors.push(
        'merge_authority.required_check must stay "Autorite - Required"',
      );
    }
    if (!isPositiveInteger(mergeAuthority.required_reviews)) {
      errors.push(
        "merge_authority.required_reviews must be a positive integer",
      );
    }
    if (mergeAuthority.enforce_admins !== true) {
      errors.push("merge_authority.enforce_admins must stay true");
    }
    if (
      !Array.isArray(mergeAuthority.proof_scripts) ||
      mergeAuthority.proof_scripts.length === 0
    ) {
      errors.push("merge_authority.proof_scripts must be a non-empty array");
    }
  }

  const clusterIds = new Set();
  const blockersByCluster = new Map();
  const clusters = Array.isArray(status?.clusters) ? status.clusters : null;
  if (!clusters || clusters.length === 0) {
    errors.push("clusters must be a non-empty array");
  } else {
    for (const [index, cluster] of clusters.entries()) {
      const prefix = `clusters[${index}]`;
      if (!isNonEmptyString(cluster?.id)) {
        errors.push(`${prefix}.id must be a non-empty string`);
        continue;
      }
      if (clusterIds.has(cluster.id)) {
        errors.push(`duplicate cluster id ${cluster.id}`);
      }
      clusterIds.add(cluster.id);
      blockersByCluster.set(cluster.id, 0);

      if (!isNonEmptyString(cluster?.label)) {
        errors.push(`${prefix}.label must be a non-empty string`);
      }
      if (!allowedClusterStatuses.has(String(cluster?.status ?? ""))) {
        errors.push(`${prefix}.status must be ready, partial or blocked`);
      }
      if (!Array.isArray(cluster?.proofs) || cluster.proofs.length === 0) {
        errors.push(`${prefix}.proofs must be a non-empty array`);
      }
    }
  }

  const blockerIds = new Set();
  const blockers = Array.isArray(status?.open_blockers)
    ? status.open_blockers
    : null;
  if (!blockers) {
    errors.push("open_blockers must be an array");
  } else {
    for (const [index, blocker] of blockers.entries()) {
      const prefix = `open_blockers[${index}]`;
      if (!isNonEmptyString(blocker?.id)) {
        errors.push(`${prefix}.id must be a non-empty string`);
        continue;
      }
      if (blockerIds.has(blocker.id)) {
        errors.push(`duplicate blocker id ${blocker.id}`);
      }
      blockerIds.add(blocker.id);

      if (!clusterIds.has(String(blocker?.cluster ?? ""))) {
        errors.push(`${prefix}.cluster must reference an existing cluster`);
      } else {
        blockersByCluster.set(
          blocker.cluster,
          (blockersByCluster.get(blocker.cluster) ?? 0) + 1,
        );
      }

      if (!allowedSeverities.has(String(blocker?.severity ?? ""))) {
        errors.push(`${prefix}.severity must be critical, high, medium or low`);
      }
      if (!isNonEmptyString(blocker?.summary)) {
        errors.push(`${prefix}.summary must be a non-empty string`);
      }
      if (
        !Array.isArray(blocker?.references) ||
        blocker.references.length === 0
      ) {
        errors.push(`${prefix}.references must be a non-empty array`);
      }
    }
  }

  const referencesToCheck = [
    ...(mergeAuthority?.proof_scripts ?? []),
    ...(clusters ?? []).flatMap((cluster) => cluster.proofs ?? []),
    ...(blockers ?? []).flatMap((blocker) => blocker.references ?? []),
  ];

  for (const reference of referencesToCheck) {
    if (!isNonEmptyString(reference)) {
      errors.push("all references must be non-empty strings");
      continue;
    }
    const resolvedPath = path.join(repoRootPath, normalizeReference(reference));
    try {
      readFileSync(resolvedPath, "utf8");
    } catch {
      errors.push(
        `missing referenced proof path ${normalizeReference(reference)}`,
      );
    }
  }

  for (const cluster of clusters ?? []) {
    const blockerCount = blockersByCluster.get(cluster.id) ?? 0;
    if (cluster.status === "ready" && blockerCount > 0) {
      errors.push(
        `cluster ${cluster.id} cannot be ready while blockers still reference it`,
      );
    }
    if (cluster.status !== "ready" && blockerCount === 0) {
      errors.push(
        `cluster ${cluster.id} must list at least one blocker while it stays ${cluster.status}`,
      );
    }
  }

  if (status?.current_verdict === "go" && (blockers?.length ?? 0) > 0) {
    errors.push(
      'current_verdict cannot be "go" while open_blockers is non-empty',
    );
  }
  if (status?.current_verdict === "no-go" && (blockers?.length ?? 0) === 0) {
    errors.push(
      'current_verdict cannot be "no-go" with an empty open_blockers array',
    );
  }

  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const status = loadBuildReadyStatus();
  const errors = validateBuildReadyStatus(status);

  if (errors.length > 0) {
    console.error(
      [
        "[validate-build-ready-status] Invalid build-ready status source of truth",
        ...errors.map((error) => `- ${error}`),
      ].join("\n"),
    );
    process.exit(1);
  }

  console.log("[validate-build-ready-status] OK");
}
