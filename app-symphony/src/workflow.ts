import fs from "node:fs";
import { promises as fsp } from "node:fs";
import path from "node:path";

import { Liquid } from "liquidjs";
import YAML from "yaml";

import { buildServiceConfig } from "./config.js";
import { createLogCorrelation } from "./logging.js";
import type {
  IssueRecord,
  WorkflowDefinition,
  WorkflowRuntimeSnapshot,
} from "./types.js";

const DEFAULT_PROMPT = "You are working on an issue from Linear.";
const FRONT_MATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export class WorkflowLoaderError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function loadWorkflowDefinition(
  filePath: string,
): Promise<WorkflowDefinition> {
  let raw: string;
  try {
    raw = await fsp.readFile(filePath, "utf8");
  } catch (error) {
    throw new WorkflowLoaderError(
      "missing_workflow_file",
      error instanceof Error ? error.message : "Unable to read WORKFLOW.md",
    );
  }

  const matched = FRONT_MATTER_PATTERN.exec(raw);
  let config: Record<string, unknown> = {};
  let promptTemplate = raw.trim();

  if (matched != null) {
    try {
      const parsed = YAML.parse(matched[1] ?? "");
      if (parsed != null && typeof parsed !== "object") {
        throw new WorkflowLoaderError(
          "workflow_front_matter_not_a_map",
          "WORKFLOW.md front matter must decode to a map",
        );
      }
      config = (parsed ?? {}) as Record<string, unknown>;
      promptTemplate = (matched[2] ?? "").trim();
    } catch (error) {
      if (error instanceof WorkflowLoaderError) {
        throw error;
      }
      throw new WorkflowLoaderError(
        "workflow_parse_error",
        error instanceof Error ? error.message : "Invalid workflow YAML",
      );
    }
  }

  return {
    filePath,
    config,
    promptTemplate,
  };
}

export async function renderWorkflowPrompt(
  workflow: WorkflowDefinition,
  issue: IssueRecord,
  attempt: number | null,
): Promise<string> {
  const engine = new Liquid({
    strictFilters: true,
    strictVariables: true,
  });

  const template = workflow.promptTemplate.trim() || DEFAULT_PROMPT;
  try {
    const parsedTemplate = await engine.parse(template);
    try {
      return await engine.render(parsedTemplate, { issue, attempt });
    } catch (error) {
      throw new WorkflowLoaderError(
        "template_render_error",
        error instanceof Error ? error.message : "Template rendering failed",
      );
    }
  } catch (error) {
    if (error instanceof WorkflowLoaderError) {
      throw error;
    }
    throw new WorkflowLoaderError(
      "template_parse_error",
      error instanceof Error ? error.message : "Template parsing failed",
    );
  }
}

export function buildContinuationPrompt(
  issue: IssueRecord,
  attempt: number | null,
  turnNumber: number,
  maxTurns: number,
): string {
  return [
    `Continue working on issue ${issue.identifier}: ${issue.title}.`,
    `This is continuation turn ${turnNumber} of ${maxTurns}.`,
    attempt != null ? `Retry/continuation attempt: ${attempt}.` : null,
    "Re-check the repository state before making assumptions, finish the remaining work, update verification, and stop only when the issue has reached a safe handoff state or when you need a retry.",
  ]
    .filter((line): line is string => line != null)
    .join("\n");
}

export class WorkflowRuntime {
  private currentSnapshot: WorkflowRuntimeSnapshot | null = null;

  private currentMtimeMs = 0;

  private watchHandle: fs.FSWatcher | null = null;

  constructor(
    private readonly filePath: string,
    private readonly env: NodeJS.ProcessEnv,
    private readonly processCwd: string,
    private readonly logger: ReturnType<
      typeof import("./logging.js").createSymphonyLogger
    >,
  ) {}

  async initialize(): Promise<WorkflowRuntimeSnapshot> {
    const snapshot = await this.loadFreshSnapshot();
    this.currentSnapshot = snapshot;
    this.currentMtimeMs = await this.readMtimeMs();
    return snapshot;
  }

  getCurrent(): WorkflowRuntimeSnapshot {
    if (this.currentSnapshot == null) {
      throw new Error("Workflow runtime has not been initialized");
    }
    return this.currentSnapshot;
  }

  async reloadIfChanged(): Promise<WorkflowRuntimeSnapshot> {
    const nextMtimeMs = await this.readMtimeMs();
    if (this.currentSnapshot != null && nextMtimeMs <= this.currentMtimeMs) {
      return this.currentSnapshot;
    }

    try {
      const snapshot = await this.loadFreshSnapshot();
      this.currentSnapshot = snapshot;
      this.currentMtimeMs = nextMtimeMs;
      this.logger.info({
        event: "workflow_reloaded",
        message: "Reloaded WORKFLOW.md",
        correlation: createLogCorrelation("workflow-reload"),
        details: {
          workflow_path: this.filePath,
        },
      });
      return snapshot;
    } catch (error) {
      this.logger.error({
        event: "workflow_reload_failed",
        message: "Keeping last known good workflow after reload failure",
        correlation: createLogCorrelation("workflow-reload"),
        details: {
          workflow_path: this.filePath,
          error_message: error instanceof Error ? error.message : String(error),
        },
      });
      return this.getCurrent();
    }
  }

  watch(onChange: () => void): void {
    if (this.watchHandle != null) {
      return;
    }
    this.watchHandle = fs.watch(this.filePath, () => {
      void this.reloadIfChanged().then(() => {
        onChange();
      });
    });
  }

  close(): void {
    this.watchHandle?.close();
    this.watchHandle = null;
  }

  private async loadFreshSnapshot(): Promise<WorkflowRuntimeSnapshot> {
    const workflow = await loadWorkflowDefinition(this.filePath);
    const config = buildServiceConfig(workflow, this.env, this.processCwd);
    return { workflow, config };
  }

  private async readMtimeMs(): Promise<number> {
    const stat = await fsp.stat(this.filePath);
    return stat.mtimeMs;
  }
}

export function resolveWorkflowPath(
  explicitPath: string | null,
  processCwd: string,
): string {
  if (explicitPath != null) {
    return path.resolve(processCwd, explicitPath);
  }
  return path.resolve(processCwd, "WORKFLOW.md");
}
