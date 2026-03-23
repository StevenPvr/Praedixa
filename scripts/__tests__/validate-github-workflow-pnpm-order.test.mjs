import assert from "node:assert/strict";
import test from "node:test";

import { validateGithubWorkflowPnpmOrder } from "../validate-github-workflow-pnpm-order.mjs";

test("workflow pnpm/setup-node order validates on committed baseline", () => {
  assert.deepEqual(validateGithubWorkflowPnpmOrder(), []);
});

test("workflow pnpm/setup-node order rejects cache: pnpm before pnpm/action-setup", () => {
  const fakeWorkflow = `
jobs:
  sample:
    steps:
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9
`;

  const errors = validateGithubWorkflowPnpmOrder({
    files: ["/virtual/workflow.yml"],
    read: () => fakeWorkflow,
  });

  assert.equal(errors.length, 1);
  assert.match(
    errors[0],
    /must install pnpm before any actions\/setup-node step that uses cache: pnpm/i,
  );
});
