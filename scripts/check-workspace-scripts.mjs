#!/usr/bin/env node

import path from "node:path";
import process from "node:process";

import {
  collectCriticalTestWorkspaces,
  collectWorkspaceCatalog,
  readWorkspacePolicy,
} from "./workspaces/catalog.mjs";

const VALID_TASKS = new Set(["build", "lint", "typecheck", "test"]);
const VALID_SCOPES = new Set(["all", "critical-test"]);

function parseArgs(argv) {
  const tasks = [];
  let scope = "all";

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--task") {
      const task = argv[index + 1];
      if (!task || task.startsWith("--")) {
        throw new Error("Missing value for --task");
      }
      if (!VALID_TASKS.has(task)) {
        throw new Error(`Unsupported task '${task}'`);
      }
      tasks.push(task);
      index += 1;
      continue;
    }

    if (argument === "--scope") {
      const nextScope = argv[index + 1];
      if (!nextScope || nextScope.startsWith("--")) {
        throw new Error("Missing value for --scope");
      }
      if (!VALID_SCOPES.has(nextScope)) {
        throw new Error(`Unsupported scope '${nextScope}'`);
      }
      scope = nextScope;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument '${argument}'`);
  }

  if (tasks.length === 0) {
    throw new Error("At least one --task is required");
  }

  return { tasks, scope };
}

function collectTargetWorkspaces(repoRoot, scope) {
  if (scope === "critical-test") {
    return collectCriticalTestWorkspaces(repoRoot);
  }

  return collectWorkspaceCatalog(repoRoot);
}

function collectUnclassifiedTestWorkspaces(workspaces, policy) {
  return workspaces.filter((workspace) => {
    const isRequired = policy.required_test_workspaces.includes(workspace.dir);
    const isExempt = typeof policy.test_exemptions[workspace.dir] === "string";
    return !isRequired && !isExempt;
  });
}

function collectMissingScripts(workspaces, tasks) {
  return workspaces.flatMap((workspace) =>
    tasks
      .filter((task) => typeof workspace.scripts[task] !== "string")
      .map((task) => ({ workspace, task })),
  );
}

function formatScopeLabel(scope) {
  return scope === "critical-test"
    ? "workspaces critiques sans absence de test silencieuse"
    : "tous les workspaces du monorepo";
}

function main() {
  try {
    const repoRoot = process.cwd();
    const { tasks, scope } = parseArgs(process.argv.slice(2));
    const policy = readWorkspacePolicy(repoRoot);
    const workspaces = collectTargetWorkspaces(repoRoot, scope);
    const missingScripts = collectMissingScripts(workspaces, tasks);

    if (scope === "all") {
      const missingRequiredTasks = tasks.filter(
        (task) => !policy.required_scripts.includes(task),
      );
      if (missingRequiredTasks.length > 0) {
        throw new Error(
          `workspace-policy.json does not declare required_scripts for ${missingRequiredTasks.join(",")}`,
        );
      }
    }

    if (scope === "critical-test") {
      const unclassifiedWorkspaces = collectUnclassifiedTestWorkspaces(
        collectWorkspaceCatalog(repoRoot),
        policy,
      );
      if (unclassifiedWorkspaces.length > 0) {
        console.error(
          [
            "[workspace-scripts] FAIL (policy de tests incomplete)",
            ...unclassifiedWorkspaces.map(
              (workspace) =>
                `- ${workspace.name} (${workspace.dir}) missing required_test_workspaces/test_exemptions classification`,
            ),
          ].join("\n"),
        );
        process.exit(1);
      }
    }

    if (missingScripts.length > 0) {
      console.error(
        [
          `[workspace-scripts] FAIL (${formatScopeLabel(scope)})`,
          ...missingScripts.map(({ workspace, task }) => {
            const manifestPath = path.relative(repoRoot, workspace.manifestPath);
            return `- ${workspace.name} (${manifestPath}) missing script '${task}'`;
          }),
        ].join("\n"),
      );
      process.exit(1);
    }

    console.log(
      [
        `[workspace-scripts] OK (${formatScopeLabel(scope)})`,
        `tasks=${tasks.join(",")}`,
        `count=${workspaces.length}`,
      ].join(" "),
    );
  } catch (error) {
    console.error(
      `[workspace-scripts] FAIL ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}

main();
