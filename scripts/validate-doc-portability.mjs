#!/usr/bin/env node

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");

export const docRoots = [
  path.join(repoRoot, "README.md"),
  path.join(repoRoot, ".github/workflows"),
  path.join(repoRoot, "docs"),
  path.join(repoRoot, "infra"),
  path.join(repoRoot, "scripts"),
];

const forbiddenPatterns = [
  /file:\/\/\/Users\/[^\s)>\]]+/g,
  /(?<!file:\/\/)\/Users\/[^\s)>\]]+/g,
];

function isMarkdownFile(filePath) {
  return filePath.endsWith(".md");
}

function collectMarkdownFilesFromEntry(entryPath, files) {
  const stat = statSync(entryPath);
  if (stat.isFile()) {
    if (isMarkdownFile(entryPath)) {
      files.push(entryPath);
    }
    return;
  }

  for (const name of readdirSync(entryPath)) {
    if (name === ".git" || name === ".next" || name === ".open-next" || name === "node_modules") {
      continue;
    }
    collectMarkdownFilesFromEntry(path.join(entryPath, name), files);
  }
}

export function collectMarkdownFiles(roots = docRoots) {
  const files = [];
  for (const root of roots) {
    collectMarkdownFilesFromEntry(root, files);
  }
  return files.sort((left, right) => left.localeCompare(right));
}

export function scanMarkdownForPortabilityViolations(filePath, content) {
  const violations = [];
  const seen = new Set();
  const lines = content.split(/\r?\n/u);

  for (const [index, line] of lines.entries()) {
    for (const pattern of forbiddenPatterns) {
      for (const match of line.matchAll(pattern)) {
        const violationId = `${index + 1}:${match[0]}`;
        if (seen.has(violationId)) {
          continue;
        }
        violations.push({
          filePath,
          lineNumber: index + 1,
          value: match[0],
        });
        seen.add(violationId);
      }
    }
  }

  return violations;
}

export function validateDocPortability(roots = docRoots) {
  return collectMarkdownFiles(roots).flatMap((filePath) =>
    scanMarkdownForPortabilityViolations(filePath, readFileSync(filePath, "utf8")),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const violations = validateDocPortability();
  if (violations.length > 0) {
    console.error(
      [
        "[validate-doc-portability] Non-portable absolute paths found",
        ...violations.map(
          ({ filePath, lineNumber, value }) =>
            `- ${path.relative(repoRoot, filePath)}:${lineNumber} -> ${value}`,
        ),
      ].join("\n"),
    );
    process.exit(1);
  }

  console.log("[validate-doc-portability] OK");
}
