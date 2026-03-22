import process from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadSymphonyLocalEnv } from "./env.js";
import { createSymphonyLogger } from "./logging.js";
import { LinearClient } from "./linear-client.js";
import { SymphonyOrchestrator } from "./orchestrator.js";
import { createStatusServer } from "./status-server.js";
import { resolveWorkflowPath, WorkflowRuntime } from "./workflow.js";
import { WorkspaceManager } from "./workspace-manager.js";

function parseCliArgs(argv: string[]): {
  workflowPath: string | null;
  port: number | null;
} {
  let workflowPath: string | null = null;
  let port: number | null = null;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token == null) {
      continue;
    }
    if (token === "--port") {
      const candidate = argv[index + 1];
      port = candidate != null ? Number.parseInt(candidate, 10) : null;
      index += 1;
      continue;
    }
    if (!token.startsWith("-") && workflowPath == null) {
      workflowPath = token;
    }
  }

  return { workflowPath, port };
}

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(moduleDir, "..");
const repoRoot = path.resolve(packageDir, "..");

await loadSymphonyLocalEnv({
  processCwd: process.cwd(),
  packageDir,
  repoRoot,
});

const logger = createSymphonyLogger(
  "symphony",
  process.env["NODE_ENV"] ?? "development",
);
const args = parseCliArgs(process.argv.slice(2));
const workflowPath = resolveWorkflowPath(args.workflowPath, process.cwd());
const workflowRuntime = new WorkflowRuntime(
  workflowPath,
  process.env,
  process.cwd(),
  logger,
);
const initialSnapshot = await workflowRuntime.initialize();
const tracker = new LinearClient({ tracker: initialSnapshot.config.tracker });
const workspaceManager = new WorkspaceManager(initialSnapshot.config, logger);
const orchestrator = new SymphonyOrchestrator(
  workflowRuntime,
  tracker,
  workspaceManager,
  logger,
);

let statusServer: ReturnType<typeof createStatusServer> | null = null;
const port = args.port ?? initialSnapshot.config.server.port;
if (port != null) {
  statusServer = createStatusServer(orchestrator, {
    host: initialSnapshot.config.server.host,
    port,
  });
  await statusServer.listen();
}

workflowRuntime.watch(() => {
  void orchestrator.requestImmediateTick();
});

await orchestrator.start();

const shutdown = async (): Promise<void> => {
  workflowRuntime.close();
  orchestrator.stop();
  await statusServer?.close().catch(() => null);
  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown();
});
process.on("SIGTERM", () => {
  void shutdown();
});
