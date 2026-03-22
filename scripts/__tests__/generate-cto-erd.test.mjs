import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  collectSqlAlchemyGraph,
  renderMermaidErd,
  runCli,
} from "../generate-cto-erd.mjs";

function createFixtureDir() {
  const root = mkdtempSync(path.join(os.tmpdir(), "generate-cto-erd-"));
  mkdirSync(root, { recursive: true });
  writeFileSync(
    path.join(root, "organization.py"),
    [
      'class Organization:',
      '    __tablename__ = "organizations"',
      "",
    ].join("\n"),
    "utf8",
  );
  writeFileSync(
    path.join(root, "site.py"),
    [
      'class Site:',
      '    __tablename__ = "sites"',
      '    organization_id = mapped_column(ForeignKey("organizations.id"))',
      "",
    ].join("\n"),
    "utf8",
  );
  return root;
}

test("collectSqlAlchemyGraph extracts tables and foreign-key relations", () => {
  const modelDir = createFixtureDir();
  const graph = collectSqlAlchemyGraph(modelDir);

  assert.deepEqual(graph.tables, ["organizations", "sites"]);
  assert.deepEqual(graph.relations, [{ from: "sites", to: "organizations" }]);
});

test("renderMermaidErd emits a Mermaid erDiagram", () => {
  const mermaid = renderMermaidErd({
    tables: ["organizations", "sites"],
    relations: [{ from: "sites", to: "organizations" }],
  });

  assert.match(mermaid, /^%% Auto-generated/m);
  assert.match(mermaid, /erDiagram/);
  assert.match(mermaid, /organizations \|\|--o\{ sites/);
});

test("runCli writes the generated ERD file", () => {
  const modelDir = createFixtureDir();
  const outputDir = mkdtempSync(path.join(os.tmpdir(), "generate-cto-erd-out-"));
  const outputPath = path.join(outputDir, "schema-public-auto-generated.mmd");

  assert.equal(runCli(["--models", modelDir, "--out", outputPath]), 0);
  assert.match(readFileSync(outputPath, "utf8"), /erDiagram/);
});
