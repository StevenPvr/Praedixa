import process from "node:process";
import { execFileSync } from "node:child_process";

const schemaPathPrefixes = [
  "app-api/app/models/",
  "app-api/alembic/versions/",
];

const docPathPrefixes = [
  "docs/cto/",
  "docs/architecture/adr/",
];

const docPathFiles = new Set(["docs/DATABASE.md"]);

function normalizePath(filePath) {
  return filePath.replace(/\\/g, "/").trim();
}

function isSchemaPath(filePath) {
  return schemaPathPrefixes.some((prefix) => filePath.startsWith(prefix));
}

function isDocPath(filePath) {
  return docPathFiles.has(filePath)
    || docPathPrefixes.some((prefix) => filePath.startsWith(prefix));
}

function listGitChangedFiles() {
  const staged = execFileSync("git", ["diff", "--cached", "--name-only"], {
    encoding: "utf8",
  });
  const unstaged = execFileSync("git", ["diff", "--name-only"], {
    encoding: "utf8",
  });
  return `${staged}\n${unstaged}`
    .split("\n")
    .map(normalizePath)
    .filter(Boolean);
}

function parseArgs(argv) {
  const changedFiles = [];
  let printJson = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--print-json") {
      printJson = true;
      continue;
    }

    if (arg === "--changed-file") {
      const next = argv[index + 1];
      if (next == null) {
        throw new Error("--changed-file requires a path");
      }
      changedFiles.push(next);
      index += 1;
      continue;
    }
  }

  return {
    changedFiles: changedFiles.map(normalizePath).filter(Boolean),
    printJson,
  };
}

export function validateSchemaDocChangeParity(changedFiles) {
  const normalized = changedFiles.map(normalizePath).filter(Boolean);
  const schemaFiles = normalized.filter(isSchemaPath);
  const docFiles = normalized.filter(isDocPath);
  const errors = [];

  if (schemaFiles.length > 0 && docFiles.length === 0) {
    errors.push(
      "Schema files changed without durable documentation update. Touch docs/DATABASE.md, docs/cto/* or docs/architecture/adr/* in the same change.",
    );
  }

  return {
    changedFiles: normalized,
    schemaFiles,
    docFiles,
    errors,
  };
}

export function runCli(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const changedFiles =
    options.changedFiles.length > 0 ? options.changedFiles : listGitChangedFiles();
  const result = validateSchemaDocChangeParity(changedFiles);

  if (options.printJson) {
    console.log(JSON.stringify({ ok: result.errors.length === 0, ...result }, null, 2));
    return result.errors.length === 0 ? 0 : 1;
  }

  if (result.errors.length > 0) {
    for (const error of result.errors) {
      console.error(`[schema-doc-change-parity] ${error}`);
    }
    if (result.schemaFiles.length > 0) {
      console.error(
        `[schema-doc-change-parity] schema files: ${result.schemaFiles.join(", ")}`,
      );
    }
    return 1;
  }

  if (result.schemaFiles.length === 0) {
    console.log("[schema-doc-change-parity] OK: no schema change detected");
  } else {
    console.log(
      `[schema-doc-change-parity] OK: ${result.schemaFiles.length} schema file(s) paired with ${result.docFiles.length} durable doc file(s)`,
    );
  }
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = runCli();
}
