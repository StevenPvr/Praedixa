#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");

export const workflowPaths = [
  path.join(repoRoot, ".github/workflows/ci-admin.yml"),
  path.join(repoRoot, ".github/workflows/ci-api.yml"),
  path.join(repoRoot, ".github/workflows/ci-authoritative.yml"),
  path.join(repoRoot, ".github/workflows/release-platform.yml"),
];

function readUtf8(filePath) {
  return readFileSync(filePath, "utf8");
}

function getStepBlocks(yaml) {
  const lines = yaml.split(/\r?\n/u);
  const steps = [];
  let current = [];

  for (const line of lines) {
    if (/^\s+- name: /.test(line) || /^\s+- uses: /.test(line)) {
      if (current.length > 0) {
        steps.push(current.join("\n"));
      }
      current = [line];
      continue;
    }

    if (current.length > 0) {
      current.push(line);
    }
  }

  if (current.length > 0) {
    steps.push(current.join("\n"));
  }

  return steps;
}

function stepUsesAction(stepBlock, actionName) {
  return stepBlock.includes(`uses: ${actionName}@`);
}

function stepEnablesPnpmCache(stepBlock) {
  return (
    stepUsesAction(stepBlock, "actions/setup-node") &&
    /cache:\s*pnpm/.test(stepBlock)
  );
}

export function validateGithubWorkflowPnpmOrder({
  files = workflowPaths,
  read = readUtf8,
} = {}) {
  const errors = [];

  for (const filePath of files) {
    const relativePath = path.relative(repoRoot, filePath);
    const steps = getStepBlocks(read(filePath));

    for (let index = 0; index < steps.length; index += 1) {
      const step = steps[index];
      if (!stepEnablesPnpmCache(step)) {
        continue;
      }

      const hasPnpmSetupBefore = steps
        .slice(0, index)
        .some((candidate) => stepUsesAction(candidate, "pnpm/action-setup"));

      if (!hasPnpmSetupBefore) {
        errors.push(
          `${relativePath} must install pnpm before any actions/setup-node step that uses cache: pnpm`,
        );
      }
    }
  }

  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const errors = validateGithubWorkflowPnpmOrder();
  if (errors.length > 0) {
    console.error(
      [
        "[validate-github-workflow-pnpm-order] Invalid pnpm/setup-node order",
        ...errors.map((error) => `- ${error}`),
      ].join("\n"),
    );
    process.exit(1);
  }

  console.log("[validate-github-workflow-pnpm-order] OK");
}
