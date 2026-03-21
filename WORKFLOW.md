---
tracker:
  kind: linear
  endpoint: https://api.linear.app/graphql
  api_key: $LINEAR_API_KEY
  project_slug: $LINEAR_PROJECT_SLUG
  active_states:
    - Todo
    - In Progress
  terminal_states:
    - Done
    - Closed
    - Cancelled
    - Canceled
    - Duplicate
polling:
  interval_ms: 30000
workspace:
  root: ./.tools/symphony-workspaces
hooks:
  timeout_ms: 60000
agent:
  max_concurrent_agents: 3
  max_turns: 20
  max_retry_backoff_ms: 300000
  max_concurrent_agents_by_state:
    in progress: 2
codex:
  command: codex app-server
  approval_policy: never
  thread_sandbox: workspace-write
  turn_sandbox_policy:
    type: workspace-write
    networkAccess: enabled
  turn_timeout_ms: 3600000
  read_timeout_ms: 5000
  stall_timeout_ms: 300000
  model: gpt-5.4
  effort: medium
  summary: concise
  personality: pragmatic
harness:
  strategy: git_worktree
  base_ref: HEAD
  branch_prefix: symphony/
  port_count: 4
  copy_files: []
server:
  port: 7788
---

You are executing the Praedixa issue `{{ issue.identifier }}`.

Issue title: {{ issue.title }}
Issue state: {{ issue.state }}
Issue URL: {{ issue.url }}
Attempt: {{ attempt }}
Priority: {{ issue.priority }}

Description:
{{ issue.description }}

Labels:
{% for label in issue.labels %}

- {{ label }}
  {% endfor %}

Blockers:
{% for blocker in issue.blockedBy %}

- {{ blocker.identifier }} (state: {{ blocker.state }})
  {% endfor %}

Execution contract:

- Work only inside the current issue workspace.
- Follow the repository instructions in `AGENTS.md`, `tasks/lessons.md`, and the relevant distributed docs before editing.
- Update docs together with code changes.
- Run the smallest verification set that proves the issue is done.
- If the issue requires tracker writes, use the available `linear_graphql` dynamic tool instead of hunting for raw tokens on disk.
- Stop in a safe handoff state when the issue is complete, blocked by a real external dependency, or requires a human decision.
