#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import {
  compareViolations,
  createBaselineDocument,
  formatDeltaMessages,
  loadBaseline,
  parseArgs,
  scanViolations,
  writeBaseline,
} from "./check-ts-guardrail-baseline-lib.mjs";

function writeMessage(stream, message) {
  stream.write(`${message}\n`);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const violations = scanViolations(options.rootDir, options.includeRoots);

  if (options.writeCurrentBaseline) {
    const document = createBaselineDocument(options, violations);
    writeBaseline(options.baselinePath, document);
    writeMessage(
      process.stdout,
      `[ts-guardrails] Wrote baseline with ${violations.fileViolations.length} file violation(s) and ${violations.functionViolations.length} function violation(s) to ${options.baselinePath}`,
    );
    return;
  }

  const baseline = loadBaseline(options.baselinePath);
  const delta = compareViolations(violations, baseline);
  const hasDelta =
    delta.newFileViolations.length > 0 ||
    delta.worsenedFileViolations.length > 0 ||
    delta.newFunctionViolations.length > 0 ||
    delta.worsenedFunctionViolations.length > 0;

  if (!hasDelta) {
    writeMessage(
      process.stdout,
      `[ts-guardrails] OK: ${violations.fileViolations.length} tracked file violation(s), ${violations.functionViolations.length} tracked function violation(s), no regression against ${path.relative(options.rootDir, options.baselinePath)}`,
    );
    return;
  }

  for (const message of formatDeltaMessages(delta)) {
    writeMessage(process.stderr, message);
  }

  process.exitCode = 1;
}

try {
  main();
} catch (error) {
  process.stderr.write(
    `[ts-guardrails] ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
}
