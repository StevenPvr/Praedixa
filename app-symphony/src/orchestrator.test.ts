import { vi } from "vitest";

import { SymphonyOrchestrator } from "./orchestrator.js";
import type {
  IssueRecord,
  RetryEntry,
  RunningEntry,
  ServiceConfig,
  WorkflowDefinition,
  WorkflowRuntimeSnapshot,
} from "./types.js";

vi.mock("./codex-app-server.js", () => ({
  runAgentAttempt: () => new Promise<never>(() => {}),
}));

interface OrchestratorTestHarness {
  claimed: Set<string>;
  retries: Map<string, RetryEntry>;
  running: Map<string, RunningEntry>;
  handleRetry(issueId: string, config: ServiceConfig): Promise<void>;
  dispatchIssue(
    issue: IssueRecord,
    attempt: number | null,
    workflow: WorkflowDefinition,
    config: ServiceConfig,
  ): Promise<void>;
}

function createConfig(): ServiceConfig {
  return {
    processCwd: "/tmp/praedixa",
    workflowPath: "/tmp/praedixa/WORKFLOW.md",
    workflowDir: "/tmp/praedixa",
    tracker: {
      kind: "linear",
      endpoint: "https://api.linear.app/graphql",
      apiKey: "token",
      projectSlug: "praedixa",
      activeStates: ["Todo", "In Progress"],
      terminalStates: ["Done"],
      normalizedActiveStates: new Set(["todo", "in progress"]),
      normalizedTerminalStates: new Set(["done"]),
    },
    polling: {
      intervalMs: 30_000,
    },
    workspace: {
      root: ".meta/.tools/symphony-workspaces",
      absoluteRoot: "/tmp/praedixa/.meta/.tools/symphony-workspaces",
    },
    hooks: {
      afterCreate: null,
      beforeRun: null,
      afterRun: null,
      beforeRemove: null,
      timeoutMs: 60_000,
    },
    agent: {
      maxConcurrentAgents: 10,
      maxConcurrentAgentsByState: new Map(),
      maxRetryBackoffMs: 300_000,
      maxTurns: 20,
    },
    codex: {
      command: "codex app-server",
      approvalPolicy: "never",
      approvalsReviewer: null,
      threadSandbox: "workspace-write",
      turnSandboxPolicy: {
        type: "workspaceWrite",
      },
      turnTimeoutMs: 3_600_000,
      readTimeoutMs: 5_000,
      stallTimeoutMs: 300_000,
      model: null,
      effort: null,
      summary: null,
      personality: null,
      serviceTier: null,
    },
    harness: {
      strategy: "directory",
      baseRef: "main",
      branchPrefix: "sym/",
      copyFiles: [],
      portCount: 0,
      metadataDirName: ".symphony",
    },
    server: {
      host: "127.0.0.1",
      port: null,
    },
  };
}

function createIssue(): IssueRecord {
  return {
    id: "issue-1",
    identifier: "PRA-5",
    title: "Retry claimed issue",
    description: "Reproduce retry dispatch regression",
    priority: 1,
    state: "Todo",
    branchName: null,
    url: null,
    labels: [],
    blockedBy: [],
    createdAt: "2026-03-19T07:00:00.000Z",
    updatedAt: "2026-03-19T07:00:00.000Z",
  };
}

function createWorkflow(): WorkflowDefinition {
  return {
    filePath: "/tmp/praedixa/WORKFLOW.md",
    config: {},
    promptTemplate: "Issue {{ issue.identifier }}",
  };
}

describe("SymphonyOrchestrator", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("redispatches a claimed issue from its own retry queue", async () => {
    vi.useFakeTimers();

    const issue = createIssue();
    const config = createConfig();
    const workflow = createWorkflow();

    const tracker = {
      updateTrackerConfig: vi.fn(),
      fetchCandidateIssues: vi.fn(async () => [issue]),
      fetchIssueStatesByIds: vi.fn(async () => []),
      fetchIssuesByStates: vi.fn(async () => []),
    };

    const workspaceManager = {
      updateConfig: vi.fn(),
      ensureWorkspace: vi.fn(async () => ({
        path: "/tmp/praedixa/.meta/.tools/symphony-workspaces/PRA-5",
        workspaceKey: "PRA-5",
        createdNow: false,
        reservedPorts: [],
        branchName: null,
        copiedFiles: [],
        manifestPath:
          "/tmp/praedixa/.meta/.tools/symphony-workspaces/PRA-5/.symphony/workspace.json",
      })),
      runHook: vi.fn(async () => undefined),
      removeWorkspace: vi.fn(async () => undefined),
    };

    const workflowRuntime = {
      getCurrent: (): WorkflowRuntimeSnapshot => ({
        workflow,
        config,
      }),
    };

    const logger = {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };

    const orchestrator = new SymphonyOrchestrator(
      workflowRuntime as unknown as ConstructorParameters<
        typeof SymphonyOrchestrator
      >[0],
      tracker as unknown as ConstructorParameters<
        typeof SymphonyOrchestrator
      >[1],
      workspaceManager as unknown as ConstructorParameters<
        typeof SymphonyOrchestrator
      >[2],
      logger as unknown as ConstructorParameters<
        typeof SymphonyOrchestrator
      >[3],
    );

    const harness = orchestrator as unknown as OrchestratorTestHarness;
    const retryTimer = setTimeout(() => undefined, 60_000);

    harness.claimed.add(issue.id);
    harness.retries.set(issue.id, {
      issueId: issue.id,
      identifier: issue.identifier,
      attempt: 2,
      dueAtMs: Date.now() + 60_000,
      error: "previous failure",
      timer: retryTimer,
    });

    await harness.handleRetry(issue.id, config);

    expect(workspaceManager.ensureWorkspace).toHaveBeenCalledWith(issue);
    expect(harness.running.has(issue.id)).toBe(true);
    expect(harness.retries.has(issue.id)).toBe(false);
  });

  it("queues a retry when workspace preparation hooks fail before the agent starts", async () => {
    vi.useFakeTimers();

    const issue = createIssue();
    const config = createConfig();
    const workflow = createWorkflow();

    const tracker = {
      updateTrackerConfig: vi.fn(),
      fetchCandidateIssues: vi.fn(async () => [issue]),
      fetchIssueStatesByIds: vi.fn(async () => []),
      fetchIssuesByStates: vi.fn(async () => []),
    };

    const workspaceManager = {
      updateConfig: vi.fn(),
      ensureWorkspace: vi.fn(async () => ({
        path: "/tmp/praedixa/.meta/.tools/symphony-workspaces/PRA-5",
        workspaceKey: "PRA-5",
        createdNow: true,
        reservedPorts: [],
        branchName: null,
        copiedFiles: [],
        manifestPath:
          "/tmp/praedixa/.meta/.tools/symphony-workspaces/PRA-5/.symphony/workspace.json",
      })),
      runHook: vi
        .fn()
        .mockResolvedValue(undefined)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("before_run hook error")),
      removeWorkspace: vi.fn(async () => undefined),
    };

    const workflowRuntime = {
      getCurrent: (): WorkflowRuntimeSnapshot => ({
        workflow,
        config,
      }),
    };

    const logger = {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };

    const orchestrator = new SymphonyOrchestrator(
      workflowRuntime as unknown as ConstructorParameters<
        typeof SymphonyOrchestrator
      >[0],
      tracker as unknown as ConstructorParameters<
        typeof SymphonyOrchestrator
      >[1],
      workspaceManager as unknown as ConstructorParameters<
        typeof SymphonyOrchestrator
      >[2],
      logger as unknown as ConstructorParameters<
        typeof SymphonyOrchestrator
      >[3],
    );

    const harness = orchestrator as unknown as OrchestratorTestHarness;

    await harness.dispatchIssue(issue, null, workflow, config);

    expect(harness.running.has(issue.id)).toBe(false);
    expect(harness.retries.get(issue.id)?.attempt).toBe(1);
    expect(harness.retries.get(issue.id)?.error).toBe("before_run hook error");
    expect(workspaceManager.runHook).toHaveBeenCalledTimes(3);
  });
});
