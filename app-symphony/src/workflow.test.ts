import os from "node:os";
import path from "node:path";
import { promises as fsp } from "node:fs";

import { buildServiceConfig, validateDispatchConfig } from "./config.js";
import {
  loadWorkflowDefinition,
  renderWorkflowPrompt,
  resolveWorkflowPath,
} from "./workflow.js";

describe("workflow runtime", () => {
  it("parses front matter and normalizes Codex config aliases to app-server enums", async () => {
    const tempDir = await fsp.mkdtemp(
      path.join(os.tmpdir(), "symphony-workflow-"),
    );
    const workflowPath = path.join(tempDir, "WORKFLOW.md");
    await fsp.writeFile(
      workflowPath,
      `---
tracker:
  kind: linear
  api_key: $LINEAR_API_KEY
  project_slug: praedixa
codex:
  approval_policy: onRequest
  thread_sandbox: workspaceWrite
  turn_sandbox_policy:
    type: workspaceWrite
    networkAccess: enabled
---
Issue {{ issue.identifier }}
`,
      "utf8",
    );

    const workflow = await loadWorkflowDefinition(workflowPath);
    const config = buildServiceConfig(
      workflow,
      { LINEAR_API_KEY: "linear-token" },
      tempDir,
    );

    expect(config.tracker.apiKey).toBe("linear-token");
    expect(config.codex.approvalPolicy).toBe("on-request");
    expect(config.codex.threadSandbox).toBe("workspace-write");
    expect(config.codex.turnSandboxPolicy?.type).toBe("workspaceWrite");
  });

  it("accepts kebab-case Codex aliases but emits canonical app-server values", async () => {
    const tempDir = await fsp.mkdtemp(
      path.join(os.tmpdir(), "symphony-codex-aliases-"),
    );
    const workflowPath = path.join(tempDir, "WORKFLOW.md");
    await fsp.writeFile(
      workflowPath,
      `---
tracker:
  kind: linear
  api_key: $LINEAR_API_KEY
  project_slug: praedixa
codex:
  approval_policy: on-request
  thread_sandbox: workspace-write
  turn_sandbox_policy:
    type: danger-full-access
---
Issue {{ issue.identifier }}
`,
      "utf8",
    );

    const workflow = await loadWorkflowDefinition(workflowPath);
    const config = buildServiceConfig(
      workflow,
      { LINEAR_API_KEY: "linear-token" },
      tempDir,
    );

    expect(config.codex.approvalPolicy).toBe("on-request");
    expect(config.codex.threadSandbox).toBe("workspace-write");
    expect(config.codex.turnSandboxPolicy?.type).toBe("dangerFullAccess");
  });

  it("surfaces template parse errors distinctly from render errors", async () => {
    const tempDir = await fsp.mkdtemp(
      path.join(os.tmpdir(), "symphony-template-parse-"),
    );
    const workflowPath = path.join(tempDir, "WORKFLOW.md");
    await fsp.writeFile(
      workflowPath,
      `---
tracker:
  kind: linear
  api_key: $LINEAR_API_KEY
  project_slug: praedixa
---
Issue {{ issue.identifier
`,
      "utf8",
    );

    const workflow = await loadWorkflowDefinition(workflowPath);

    await expect(
      renderWorkflowPrompt(
        workflow,
        {
          id: "1",
          identifier: "PRX-42",
          title: "Wire Symphony",
          description: null,
          priority: 1,
          state: "Todo",
          branchName: null,
          url: null,
          labels: [],
          blockedBy: [],
          createdAt: null,
          updatedAt: null,
        },
        null,
      ),
    ).rejects.toMatchObject({ code: "template_parse_error" });
  });

  it("surfaces template render errors for unknown variables", async () => {
    const tempDir = await fsp.mkdtemp(
      path.join(os.tmpdir(), "symphony-template-render-"),
    );
    const workflowPath = path.join(tempDir, "WORKFLOW.md");
    await fsp.writeFile(
      workflowPath,
      `---
tracker:
  kind: linear
  api_key: $LINEAR_API_KEY
  project_slug: praedixa
---
Issue {{ issue.missing_field }}
`,
      "utf8",
    );

    const workflow = await loadWorkflowDefinition(workflowPath);

    await expect(
      renderWorkflowPrompt(
        workflow,
        {
          id: "1",
          identifier: "PRX-42",
          title: "Wire Symphony",
          description: null,
          priority: 1,
          state: "Todo",
          branchName: null,
          url: null,
          labels: [],
          blockedBy: [],
          createdAt: null,
          updatedAt: null,
        },
        null,
      ),
    ).rejects.toMatchObject({ code: "template_render_error" });
  });

  it("renders issue context through the strict liquid template", async () => {
    const tempDir = await fsp.mkdtemp(
      path.join(os.tmpdir(), "symphony-render-"),
    );
    const workflowPath = path.join(tempDir, "WORKFLOW.md");
    await fsp.writeFile(
      workflowPath,
      `---
tracker:
  kind: linear
  api_key: $LINEAR_API_KEY
  project_slug: praedixa
---
Issue {{ issue.identifier }} - {{ issue.title }} - attempt {{ attempt }}
`,
      "utf8",
    );

    const workflow = await loadWorkflowDefinition(workflowPath);
    const rendered = await renderWorkflowPrompt(
      workflow,
      {
        id: "1",
        identifier: "PRX-42",
        title: "Wire Symphony",
        description: null,
        priority: 1,
        state: "Todo",
        branchName: null,
        url: null,
        labels: [],
        blockedBy: [],
        createdAt: null,
        updatedAt: null,
      },
      2,
    );

    expect(rendered).toContain("PRX-42");
    expect(rendered).toContain("Wire Symphony");
    expect(rendered).toContain("attempt 2");
  });

  it("resolves the default workflow path from the current process working directory only", async () => {
    const tempDir = await fsp.mkdtemp(
      path.join(os.tmpdir(), "symphony-discovery-"),
    );
    const packageDir = path.join(tempDir, "app-symphony");
    await fsp.mkdir(packageDir, { recursive: true });
    const workflowPath = path.join(tempDir, "WORKFLOW.md");
    await fsp.writeFile(workflowPath, "---\ntracker: {}\n---\nhello\n", "utf8");

    expect(resolveWorkflowPath(null, packageDir)).toBe(
      path.join(packageDir, "WORKFLOW.md"),
    );
  });

  it("resolves an explicit workflow path relative to the current process working directory", async () => {
    const tempDir = await fsp.mkdtemp(
      path.join(os.tmpdir(), "symphony-explicit-path-"),
    );
    const packageDir = path.join(tempDir, "app-symphony");
    await fsp.mkdir(packageDir, { recursive: true });
    const workflowPath = path.join(tempDir, "WORKFLOW.md");
    await fsp.writeFile(workflowPath, "---\ntracker: {}\n---\nhello\n", "utf8");

    expect(resolveWorkflowPath("../WORKFLOW.md", packageDir)).toBe(
      workflowPath,
    );
  });

  it("fails validation when tracker.kind is missing or unsupported", async () => {
    const tempDir = await fsp.mkdtemp(
      path.join(os.tmpdir(), "symphony-unsupported-tracker-"),
    );
    const workflowPath = path.join(tempDir, "WORKFLOW.md");
    await fsp.writeFile(
      workflowPath,
      `---
tracker:
  kind: jira
  api_key: $LINEAR_API_KEY
  project_slug: praedixa
---
Issue {{ issue.identifier }}
`,
      "utf8",
    );

    const workflow = await loadWorkflowDefinition(workflowPath);
    const config = buildServiceConfig(
      workflow,
      { LINEAR_API_KEY: "linear-token" },
      tempDir,
    );

    expect(() => validateDispatchConfig(config)).toThrow(
      "unsupported_tracker_kind",
    );
  });

  it("keeps server.port=0 when configured as a string for local ephemeral bind", async () => {
    const tempDir = await fsp.mkdtemp(
      path.join(os.tmpdir(), "symphony-server-port-"),
    );
    const workflowPath = path.join(tempDir, "WORKFLOW.md");
    await fsp.writeFile(
      workflowPath,
      `---
tracker:
  kind: linear
  api_key: $LINEAR_API_KEY
  project_slug: praedixa
server:
  port: "0"
---
Issue {{ issue.identifier }}
`,
      "utf8",
    );

    const workflow = await loadWorkflowDefinition(workflowPath);
    const config = buildServiceConfig(
      workflow,
      { LINEAR_API_KEY: "linear-token" },
      tempDir,
    );

    expect(config.server.port).toBe(0);
  });
});
