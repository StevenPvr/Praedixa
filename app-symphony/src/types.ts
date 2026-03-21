export interface BlockerRef {
  id: string | null;
  identifier: string | null;
  state: string | null;
}

export interface IssueRecord {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  priority: number | null;
  state: string;
  branchName: string | null;
  url: string | null;
  labels: string[];
  blockedBy: BlockerRef[];
  createdAt: string | null;
  updatedAt: string | null;
}

export interface WorkflowDefinition {
  filePath: string;
  config: Record<string, unknown>;
  promptTemplate: string;
}

export interface WorkflowRuntimeSnapshot {
  workflow: WorkflowDefinition;
  config: ServiceConfig;
}

export interface TrackerConfig {
  kind: string;
  endpoint: string;
  apiKey: string;
  projectSlug: string;
  activeStates: string[];
  terminalStates: string[];
  normalizedActiveStates: Set<string>;
  normalizedTerminalStates: Set<string>;
}

export interface PollingConfig {
  intervalMs: number;
}

export interface WorkspaceConfig {
  root: string;
  absoluteRoot: string;
}

export interface HooksConfig {
  afterCreate: string | null;
  beforeRun: string | null;
  afterRun: string | null;
  beforeRemove: string | null;
  timeoutMs: number;
}

export interface AgentConfig {
  maxConcurrentAgents: number;
  maxConcurrentAgentsByState: Map<string, number>;
  maxRetryBackoffMs: number;
  maxTurns: number;
}

export interface TurnSandboxPolicy {
  type: string;
  networkAccess?: string | boolean;
  writableRoots?: string[];
  readableRoots?: string[];
  includePlatformDefaults?: boolean;
  excludeSlashTmp?: boolean;
  excludeTmpdirEnvVar?: boolean;
}

export interface CodexConfig {
  command: string;
  approvalPolicy: string | Record<string, unknown> | null;
  approvalsReviewer: string | null;
  threadSandbox: string | null;
  turnSandboxPolicy: TurnSandboxPolicy | null;
  turnTimeoutMs: number;
  readTimeoutMs: number;
  stallTimeoutMs: number;
  model: string | null;
  effort: string | null;
  summary: string | null;
  personality: string | null;
  serviceTier: string | null;
}

export interface HarnessConfig {
  strategy: "directory" | "git_worktree";
  baseRef: string;
  branchPrefix: string;
  copyFiles: string[];
  portCount: number;
  metadataDirName: string;
}

export interface StatusServerConfig {
  host: string;
  port: number | null;
}

export interface ServiceConfig {
  processCwd: string;
  workflowPath: string;
  workflowDir: string;
  tracker: TrackerConfig;
  polling: PollingConfig;
  workspace: WorkspaceConfig;
  hooks: HooksConfig;
  agent: AgentConfig;
  codex: CodexConfig;
  harness: HarnessConfig;
  server: StatusServerConfig;
}

export interface HookContext {
  issue: IssueRecord;
  workspacePath: string;
  workspaceKey: string;
  reservedPorts: number[];
  attempt: number | null;
}

export interface HarnessManifest {
  issueIdentifier: string;
  workspaceKey: string;
  strategy: HarnessConfig["strategy"];
  branchName: string | null;
  reservedPorts: number[];
  copiedFiles: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceInfo {
  path: string;
  workspaceKey: string;
  createdNow: boolean;
  reservedPorts: number[];
  branchName: string | null;
  copiedFiles: string[];
  manifestPath: string;
}

export interface RunAttemptContext {
  issueId: string;
  issueIdentifier: string;
  attempt: number | null;
  workspacePath: string;
  startedAt: string;
  status: string;
  error?: string;
}

export interface LiveSession {
  sessionId: string;
  threadId: string;
  turnId: string;
  codexAppServerPid: string | null;
  lastCodexEvent: string | null;
  lastCodexTimestamp: string | null;
  lastCodexMessage: string | null;
  codexInputTokens: number;
  codexOutputTokens: number;
  codexTotalTokens: number;
  lastReportedInputTokens: number;
  lastReportedOutputTokens: number;
  lastReportedTotalTokens: number;
  turnCount: number;
}

export interface UsageSnapshot {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

export interface RuntimeEvent {
  at: string;
  event: string;
  message: string | null;
}

export interface RunningEntry {
  issue: IssueRecord;
  identifier: string;
  workspacePath: string;
  workspaceKey: string;
  reservedPorts: number[];
  startedAtMs: number;
  retryAttempt: number | null;
  abortController: AbortController;
  recentEvents: RuntimeEvent[];
  session: LiveSession | null;
  stopReason: "terminal" | "inactive" | "stalled" | "manual" | null;
}

export interface RetryEntry {
  issueId: string;
  identifier: string;
  attempt: number;
  dueAtMs: number;
  error: string | null;
  timer: NodeJS.Timeout;
}

export interface CodexTotals {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  endedRuntimeMs: number;
}

export interface OrchestratorSnapshot {
  generated_at: string;
  counts: {
    running: number;
    retrying: number;
  };
  running: Array<{
    issue_id: string;
    issue_identifier: string;
    state: string;
    session_id: string | null;
    turn_count: number;
    last_event: string | null;
    last_message: string | null;
    started_at: string;
    last_event_at: string | null;
    tokens: UsageSnapshot;
  }>;
  retrying: Array<{
    issue_id: string;
    issue_identifier: string;
    attempt: number;
    due_at: string;
    error: string | null;
  }>;
  codex_totals: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    seconds_running: number;
  };
  rate_limits: unknown;
}

export interface DynamicToolResult {
  success: boolean;
  contentItems: Array<
    | { type: "inputText"; text: string }
    | { type: "inputImage"; imageUrl: string }
  >;
}

export interface GraphqlResponse<TData> {
  data?: TData;
  errors?: Array<Record<string, unknown>>;
}
