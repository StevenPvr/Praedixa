import { execFile } from "node:child_process";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

import type {
  HarnessManifest,
  HookContext,
  IssueRecord,
  ServiceConfig,
  WorkspaceInfo,
} from "./types.js";
import {
  assertPathInsideRoot,
  nowIso,
  reserveFreePort,
  sanitizeWorkspaceKey,
} from "./utils.js";
import { createLogCorrelation } from "./logging.js";

const execFileAsync = promisify(execFile);

async function ensureDirectory(targetPath: string): Promise<void> {
  await fsp.mkdir(targetPath, { recursive: true });
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fsp.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function copyFileIfPresent(
  sourcePath: string,
  destinationPath: string,
): Promise<boolean> {
  if (!(await pathExists(sourcePath))) {
    return false;
  }
  await ensureDirectory(path.dirname(destinationPath));
  await fsp.copyFile(sourcePath, destinationPath);
  return true;
}

async function readHarnessManifest(
  manifestPath: string,
): Promise<HarnessManifest | null> {
  try {
    const raw = await fsp.readFile(manifestPath, "utf8");
    return JSON.parse(raw) as HarnessManifest;
  } catch {
    return null;
  }
}

async function writeHarnessManifest(
  manifestPath: string,
  manifest: HarnessManifest,
): Promise<void> {
  await ensureDirectory(path.dirname(manifestPath));
  await fsp.writeFile(
    manifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
}

async function resolveRepoRoot(processCwd: string): Promise<string> {
  const { stdout } = await execFileAsync(
    "git",
    ["rev-parse", "--show-toplevel"],
    {
      cwd: processCwd,
    },
  );
  return stdout.trim();
}

async function branchExists(
  repoRoot: string,
  branchName: string,
): Promise<boolean> {
  try {
    await execFileAsync("git", ["rev-parse", "--verify", branchName], {
      cwd: repoRoot,
    });
    return true;
  } catch {
    return false;
  }
}

async function createGitWorktree(
  repoRoot: string,
  workspacePath: string,
  branchName: string,
  baseRef: string,
): Promise<void> {
  const args = (await branchExists(repoRoot, branchName))
    ? ["worktree", "add", workspacePath, branchName]
    : ["worktree", "add", "-b", branchName, workspacePath, baseRef];

  await execFileAsync("git", args, { cwd: repoRoot });
}

async function removeGitWorktree(
  repoRoot: string,
  workspacePath: string,
): Promise<void> {
  await execFileAsync("git", ["worktree", "remove", "--force", workspacePath], {
    cwd: repoRoot,
  });
}

async function allocatePorts(
  count: number,
  existingPorts: number[],
): Promise<number[]> {
  if (existingPorts.length >= count) {
    return existingPorts.slice(0, count);
  }
  const ports = [...existingPorts];
  while (ports.length < count) {
    ports.push(await reserveFreePort());
  }
  return ports;
}

export class WorkspaceManager {
  private readonly repoRootPromise: Promise<string>;

  constructor(
    private config: ServiceConfig,
    private readonly logger: ReturnType<
      typeof import("./logging.js").createSymphonyLogger
    >,
  ) {
    this.repoRootPromise = resolveRepoRoot(config.processCwd);
  }

  updateConfig(config: ServiceConfig): void {
    this.config = config;
  }

  async ensureWorkspace(issue: IssueRecord): Promise<WorkspaceInfo> {
    const workspaceKey = sanitizeWorkspaceKey(issue.identifier);
    const workspacePath = path.join(
      this.config.workspace.absoluteRoot,
      workspaceKey,
    );
    assertPathInsideRoot(this.config.workspace.absoluteRoot, workspacePath);
    await ensureDirectory(this.config.workspace.absoluteRoot);

    const manifestPath = path.join(
      workspacePath,
      this.config.harness.metadataDirName,
      "workspace.json",
    );
    const existingManifest = await readHarnessManifest(manifestPath);
    const createdNow = !(await pathExists(workspacePath));
    const branchName =
      this.config.harness.strategy === "git_worktree"
        ? `${this.config.harness.branchPrefix}${workspaceKey}`
        : null;

    if (createdNow) {
      if (this.config.harness.strategy === "git_worktree") {
        const repoRoot = await this.repoRootPromise;
        await createGitWorktree(
          repoRoot,
          workspacePath,
          branchName ?? workspaceKey,
          this.config.harness.baseRef,
        );
      } else {
        await ensureDirectory(workspacePath);
      }
    }

    const copiedFiles = await this.copyHarnessFiles(workspacePath);
    const reservedPorts = await allocatePorts(
      this.config.harness.portCount,
      existingManifest?.reservedPorts ?? [],
    );
    const timestamp = nowIso();
    const manifest: HarnessManifest = {
      issueIdentifier: issue.identifier,
      workspaceKey,
      strategy: this.config.harness.strategy,
      branchName,
      reservedPorts,
      copiedFiles,
      createdAt: existingManifest?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };
    await writeHarnessManifest(manifestPath, manifest);

    return {
      path: workspacePath,
      workspaceKey,
      createdNow,
      reservedPorts,
      branchName,
      copiedFiles,
      manifestPath,
    };
  }

  async removeWorkspace(issueIdentifier: string): Promise<void> {
    const workspaceKey = sanitizeWorkspaceKey(issueIdentifier);
    const workspacePath = path.join(
      this.config.workspace.absoluteRoot,
      workspaceKey,
    );
    if (!(await pathExists(workspacePath))) {
      return;
    }
    assertPathInsideRoot(this.config.workspace.absoluteRoot, workspacePath);

    if (this.config.harness.strategy === "git_worktree") {
      const repoRoot = await this.repoRootPromise;
      await removeGitWorktree(repoRoot, workspacePath);
      return;
    }

    await fsp.rm(workspacePath, { recursive: true, force: true });
  }

  async runHook(
    hook: "afterCreate" | "beforeRun" | "afterRun" | "beforeRemove",
    context: HookContext,
  ): Promise<void> {
    const script = this.config.hooks[hook];
    if (script == null) {
      return;
    }

    const correlation = createLogCorrelation(`hook-${hook}`);
    this.logger.info({
      event: "workspace_hook_started",
      message: `Starting workspace hook ${hook}`,
      correlation,
      details: {
        hook,
        issue_id: context.issue.id,
        issue_identifier: context.issue.identifier,
        workspace_path: context.workspacePath,
      },
    });

    try {
      await execFileAsync("bash", ["-lc", script], {
        cwd: context.workspacePath,
        timeout: this.config.hooks.timeoutMs,
        env: {
          ...process.env,
          SYMPHONY_ISSUE_ID: context.issue.id,
          SYMPHONY_ISSUE_IDENTIFIER: context.issue.identifier,
          SYMPHONY_ISSUE_TITLE: context.issue.title,
          SYMPHONY_WORKSPACE_KEY: context.workspaceKey,
          SYMPHONY_WORKSPACE_PATH: context.workspacePath,
          SYMPHONY_ATTEMPT:
            context.attempt != null ? String(context.attempt) : "",
          SYMPHONY_RESERVED_PORTS: context.reservedPorts.join(","),
        },
        maxBuffer: 1024 * 1024,
      });
      this.logger.info({
        event: "workspace_hook_completed",
        message: `Completed workspace hook ${hook}`,
        correlation,
        details: {
          hook,
          issue_id: context.issue.id,
          issue_identifier: context.issue.identifier,
          workspace_path: context.workspacePath,
        },
      });
    } catch (error) {
      const timedOut =
        typeof error === "object" &&
        error != null &&
        "killed" in error &&
        error.killed === true;
      this.logger.warn({
        event: timedOut ? "workspace_hook_timed_out" : "workspace_hook_failed",
        message: timedOut
          ? `Workspace hook ${hook} timed out`
          : `Workspace hook ${hook} failed`,
        correlation,
        details: {
          hook,
          issue_id: context.issue.id,
          issue_identifier: context.issue.identifier,
          workspace_path: context.workspacePath,
          error_message: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    }
  }

  private async copyHarnessFiles(workspacePath: string): Promise<string[]> {
    const repoRoot = await this.repoRootPromise;
    const copied: string[] = [];

    for (const relativeFile of this.config.harness.copyFiles) {
      const sourcePath = path.resolve(repoRoot, relativeFile);
      const destinationPath = path.resolve(workspacePath, relativeFile);
      assertPathInsideRoot(repoRoot, sourcePath);
      assertPathInsideRoot(workspacePath, destinationPath);
      if (await copyFileIfPresent(sourcePath, destinationPath)) {
        copied.push(relativeFile);
      }
    }

    return copied;
  }
}
