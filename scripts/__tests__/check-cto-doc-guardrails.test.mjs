import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  collectCtoDocInventory,
  ctoCriticalPageFiles,
  runCli,
  validateCtoDocGuardrails,
} from "../check-cto-doc-guardrails.mjs";

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createFixtureRoot() {
  const root = mkdtempSync(path.join(os.tmpdir(), "cto-doc-guardrails-"));
  const docsCtoDir = path.join(root, "docs", "cto");
  mkdirSync(docsCtoDir, { recursive: true });

  for (const pageFile of ctoCriticalPageFiles) {
    writeFileSync(
      path.join(docsCtoDir, pageFile),
      `# ${pageFile}\n`,
      "utf8",
    );
  }

  writeFileSync(
    path.join(docsCtoDir, "README.md"),
    [
      "# CTO Docs",
      "",
      ...ctoCriticalPageFiles.map(
        (pageFile) => `- [${pageFile}](./${pageFile})`,
      ),
      "",
    ].join("\n"),
    "utf8",
  );

  return root;
}

test("CTO doc guardrails accept the canonical CTO doc fixture", () => {
  const root = createFixtureRoot();

  assert.deepEqual(validateCtoDocGuardrails(collectCtoDocInventory(root)), []);
  assert.equal(runCli(["--root", root]), 0);
});

test("CTO doc guardrails reject a missing critical page", () => {
  const root = createFixtureRoot();
  const missingPage = ctoCriticalPageFiles[4];
  const missingPagePath = path.join(root, "docs", "cto", missingPage);
  unlinkSync(missingPagePath);

  assert.match(
    validateCtoDocGuardrails({
      ...collectCtoDocInventory(root),
      readmeExists: true,
    }).join("\n"),
    new RegExp(`missing critical CTO doc: docs/cto/${escapeRegExp(missingPage)}`),
  );
});

test("CTO doc guardrails reject a page that is not indexed by README", () => {
  const root = createFixtureRoot();
  const readmePath = path.join(root, "docs", "cto", "README.md");
  const readmeMarkdown = collectCtoDocInventory(root).readmeMarkdown.replace(
    `- [${ctoCriticalPageFiles[0]}](./${ctoCriticalPageFiles[0]})\n`,
    "",
  );

  writeFileSync(readmePath, readmeMarkdown, "utf8");

  assert.match(
    validateCtoDocGuardrails(collectCtoDocInventory(root)).join("\n"),
    new RegExp(
      `docs/cto/README.md must reference numbered page \\\`${escapeRegExp(ctoCriticalPageFiles[0])}\\\``,
    ),
  );
});

test("runCli returns a non-zero exit code when a page is unindexed", () => {
  const root = createFixtureRoot();
  const readmePath = path.join(root, "docs", "cto", "README.md");
  const readmeMarkdown = collectCtoDocInventory(root).readmeMarkdown.replace(
    `- [${ctoCriticalPageFiles[1]}](./${ctoCriticalPageFiles[1]})\n`,
    "",
  );

  writeFileSync(readmePath, readmeMarkdown, "utf8");

  assert.equal(runCli(["--root", root]), 1);
});
