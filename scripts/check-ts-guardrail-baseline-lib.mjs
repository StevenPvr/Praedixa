import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_BASELINE_RELATIVE_PATH = path.join(
  "scripts",
  "ts-guardrail-baseline.json",
);

export const DEFAULT_ROOT_DIR = path.resolve(SCRIPT_DIR, "..");
export const FILE_LINE_LIMIT = 500;
export const FUNCTION_LINE_LIMIT = 50;
export const DEFAULT_INCLUDE_ROOTS = [
  "app-landing",
  "app-webapp",
  "app-admin",
  "app-api-ts",
  "app-connectors",
  "packages",
];

const IGNORED_DIR_NAMES = new Set([
  "node_modules",
  ".next",
  ".open-next",
  "dist",
  "build",
  "coverage",
  "playwright-report",
  "test-results",
  "__tests__",
  "presentations-clients",
  "skolae",
  "centaurus",
]);
const IGNORED_PATH_PATTERNS = [
  /(^|\/)testing\/e2e\//,
  /(^|\/)fixtures\//,
  /(^|\/)mocks?\//,
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /\/next-env\.d\.ts$/,
  /\/sector-pages-data\/(fr|en)\.ts$/,
  /\/dictionaries\/.+\.ts$/,
];
const SOURCE_FILE_PATTERN = /\.[cm]?[jt]sx?$/;
const DECLARATION_FILE_PATTERN = /\.d\.[cm]?ts$/;

function createOptionState() {
  return {
    rootDir: DEFAULT_ROOT_DIR,
    baselineArg: null,
    includeRoots: [],
    hasExplicitIncludeRoots: false,
    writeCurrentBaseline: false,
  };
}

function readRequiredArgValue(argv, index, flagName) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flagName} requires a value`);
  }
  return value;
}

function resolveBaselinePath(rootDir, baselineArg) {
  if (baselineArg) {
    return path.resolve(rootDir, baselineArg);
  }
  return path.join(rootDir, DEFAULT_BASELINE_RELATIVE_PATH);
}

function dedupeValues(values) {
  return [...new Set(values)];
}

export function parseArgs(argv) {
  const options = createOptionState();

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--write-current-baseline") {
      options.writeCurrentBaseline = true;
      continue;
    }

    if (value === "--baseline") {
      options.baselineArg = readRequiredArgValue(argv, index, value);
      index += 1;
      continue;
    }

    if (value === "--root") {
      options.rootDir = path.resolve(readRequiredArgValue(argv, index, value));
      index += 1;
      continue;
    }

    if (value === "--include-root") {
      const includeRoot = readRequiredArgValue(argv, index, value);
      if (!options.hasExplicitIncludeRoots) {
        options.includeRoots = [];
        options.hasExplicitIncludeRoots = true;
      }
      options.includeRoots.push(includeRoot);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${value}`);
  }

  return {
    rootDir: options.rootDir,
    baselinePath: resolveBaselinePath(options.rootDir, options.baselineArg),
    includeRoots: options.hasExplicitIncludeRoots
      ? dedupeValues(options.includeRoots)
      : [...DEFAULT_INCLUDE_ROOTS],
    writeCurrentBaseline: options.writeCurrentBaseline,
  };
}

function normalizeRelativePath(rootDir, targetPath) {
  return path.relative(rootDir, targetPath).split(path.sep).join("/");
}

function shouldIgnoreFile(relativePath) {
  return IGNORED_PATH_PATTERNS.some((pattern) => pattern.test(relativePath));
}

function isTrackedSourceFile(relativePath) {
  return (
    SOURCE_FILE_PATTERN.test(relativePath) &&
    !DECLARATION_FILE_PATTERN.test(relativePath) &&
    !shouldIgnoreFile(relativePath)
  );
}

function listSourceFiles(rootDir, includeRoots) {
  const collected = [];

  function walkDirectory(directoryPath) {
    const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORED_DIR_NAMES.has(entry.name)) {
        continue;
      }

      const absolutePath = path.join(directoryPath, entry.name);
      if (entry.isDirectory()) {
        walkDirectory(absolutePath);
        continue;
      }

      const relativePath = normalizeRelativePath(rootDir, absolutePath);
      if (isTrackedSourceFile(relativePath)) {
        collected.push({ absolutePath, relativePath });
      }
    }
  }

  for (const includeRoot of includeRoots) {
    const absoluteIncludeRoot = path.resolve(rootDir, includeRoot);
    if (!fs.existsSync(absoluteIncludeRoot)) {
      continue;
    }
    walkDirectory(absoluteIncludeRoot);
  }

  return collected.sort((left, right) =>
    left.relativePath.localeCompare(right.relativePath),
  );
}

function resolveScriptKind(filePath) {
  if (filePath.endsWith(".tsx")) {
    return ts.ScriptKind.TSX;
  }
  if (filePath.endsWith(".jsx")) {
    return ts.ScriptKind.JSX;
  }
  if (
    filePath.endsWith(".js") ||
    filePath.endsWith(".mjs") ||
    filePath.endsWith(".cjs")
  ) {
    return ts.ScriptKind.JS;
  }
  return ts.ScriptKind.TS;
}

function getFunctionName(node) {
  if (ts.isFunctionDeclaration(node) && node.name) {
    return node.name.text;
  }

  if (
    (ts.isMethodDeclaration(node) ||
      ts.isGetAccessorDeclaration(node) ||
      ts.isSetAccessorDeclaration(node)) &&
    node.name &&
    (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name))
  ) {
    return node.name.text;
  }

  if (ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
    const parent = node.parent;
    if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
      return parent.name.text;
    }
    if (
      ts.isPropertyAssignment(parent) &&
      (ts.isIdentifier(parent.name) || ts.isStringLiteral(parent.name))
    ) {
      return parent.name.text;
    }
  }

  return "<anonymous>";
}

function hasFunctionLikeAncestor(node) {
  let parent = node.parent;
  while (parent) {
    if (ts.isFunctionLike(parent)) {
      return true;
    }
    parent = parent.parent;
  }
  return false;
}

function dedupeAndNumberFunctions(functionViolations) {
  const deduped = new Map();

  for (const violation of functionViolations) {
    const dedupeKey = `${violation.file}::${violation.start}::${violation.lines}`;
    const existing = deduped.get(dedupeKey);
    if (!existing || existing.name === "<anonymous>") {
      deduped.set(dedupeKey, violation);
    }
  }

  const ordered = [...deduped.values()].sort((left, right) => {
    if (left.file !== right.file) {
      return left.file.localeCompare(right.file);
    }
    if (left.name !== right.name) {
      return left.name.localeCompare(right.name);
    }
    return left.start - right.start;
  });

  const occurrenceCountByName = new Map();
  return ordered.map((violation) => {
    const counterKey = `${violation.file}::${violation.name}`;
    const occurrence = (occurrenceCountByName.get(counterKey) ?? 0) + 1;
    occurrenceCountByName.set(counterKey, occurrence);
    return {
      ...violation,
      occurrence,
    };
  });
}

export function scanViolations(rootDir, includeRoots) {
  const files = listSourceFiles(rootDir, includeRoots);
  const fileViolations = [];
  const functionViolations = [];

  for (const file of files) {
    const sourceText = fs.readFileSync(file.absolutePath, "utf8");
    const lineCount = sourceText.split(/\r?\n/u).length;
    if (lineCount > FILE_LINE_LIMIT) {
      fileViolations.push({
        file: file.relativePath,
        lines: lineCount,
      });
    }

    const sourceFile = ts.createSourceFile(
      file.absolutePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      resolveScriptKind(file.absolutePath),
    );

    function visit(node) {
      if (
        ts.isFunctionDeclaration(node) ||
        ts.isFunctionExpression(node) ||
        ts.isArrowFunction(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isGetAccessorDeclaration(node) ||
        ts.isSetAccessorDeclaration(node)
      ) {
        if (hasFunctionLikeAncestor(node)) {
          ts.forEachChild(node, visit);
          return;
        }

        const start =
          sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
            .line + 1;
        const end = sourceFile.getLineAndCharacterOfPosition(node.end).line + 1;
        const lines = end - start + 1;
        if (lines > FUNCTION_LINE_LIMIT) {
          functionViolations.push({
            file: file.relativePath,
            name: getFunctionName(node),
            start,
            lines,
          });
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  }

  return {
    fileViolations: fileViolations.sort((left, right) =>
      left.file.localeCompare(right.file),
    ),
    functionViolations: dedupeAndNumberFunctions(functionViolations),
  };
}

export function createBaselineDocument(options, violations) {
  return {
    metadata: {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      fileLineLimit: FILE_LINE_LIMIT,
      functionLineLimit: FUNCTION_LINE_LIMIT,
      includeRoots: options.includeRoots,
      rootDir: ".",
    },
    fileViolations: violations.fileViolations,
    functionViolations: violations.functionViolations,
  };
}

export function loadBaseline(baselinePath) {
  if (!fs.existsSync(baselinePath)) {
    throw new Error(`Missing baseline file: ${baselinePath}`);
  }

  return JSON.parse(fs.readFileSync(baselinePath, "utf8"));
}

function createFileViolationMap(violations) {
  return new Map(violations.map((violation) => [violation.file, violation]));
}

function createFunctionViolationMap(violations) {
  return new Map(
    violations.map((violation) => [
      `${violation.file}::${violation.name}::${violation.occurrence}`,
      violation,
    ]),
  );
}

export function compareViolations(current, baseline) {
  const baselineFiles = createFileViolationMap(baseline.fileViolations ?? []);
  const currentFiles = createFileViolationMap(current.fileViolations);
  const baselineFunctions = createFunctionViolationMap(
    baseline.functionViolations ?? [],
  );
  const currentFunctions = createFunctionViolationMap(
    current.functionViolations,
  );

  const newFileViolations = [];
  const worsenedFileViolations = [];
  for (const [key, currentViolation] of currentFiles.entries()) {
    const baselineViolation = baselineFiles.get(key);
    if (!baselineViolation) {
      newFileViolations.push(currentViolation);
      continue;
    }
    if (currentViolation.lines > baselineViolation.lines) {
      worsenedFileViolations.push({
        ...currentViolation,
        baselineLines: baselineViolation.lines,
      });
    }
  }

  const newFunctionViolations = [];
  const worsenedFunctionViolations = [];
  for (const [key, currentViolation] of currentFunctions.entries()) {
    const baselineViolation = baselineFunctions.get(key);
    if (!baselineViolation) {
      newFunctionViolations.push(currentViolation);
      continue;
    }
    if (currentViolation.lines > baselineViolation.lines) {
      worsenedFunctionViolations.push({
        ...currentViolation,
        baselineLines: baselineViolation.lines,
      });
    }
  }

  return {
    newFileViolations,
    worsenedFileViolations,
    newFunctionViolations,
    worsenedFunctionViolations,
  };
}

function formatFileViolation(violation) {
  if ("baselineLines" in violation) {
    return `- ${violation.file}: ${violation.lines} lines (baseline ${violation.baselineLines})`;
  }
  return `- ${violation.file}: ${violation.lines} lines`;
}

function formatFunctionViolation(violation) {
  if ("baselineLines" in violation) {
    return `- ${violation.file}:${violation.start} ${violation.name}(): ${violation.lines} lines (baseline ${violation.baselineLines})`;
  }
  return `- ${violation.file}:${violation.start} ${violation.name}(): ${violation.lines} lines`;
}

export function formatDeltaMessages(delta) {
  const messages = [];

  if (delta.newFileViolations.length > 0) {
    messages.push("[ts-guardrails] New oversized files detected:");
    messages.push(...delta.newFileViolations.map(formatFileViolation));
  }

  if (delta.worsenedFileViolations.length > 0) {
    messages.push("[ts-guardrails] Existing oversized files got worse:");
    messages.push(...delta.worsenedFileViolations.map(formatFileViolation));
  }

  if (delta.newFunctionViolations.length > 0) {
    messages.push("[ts-guardrails] New oversized functions detected:");
    messages.push(...delta.newFunctionViolations.map(formatFunctionViolation));
  }

  if (delta.worsenedFunctionViolations.length > 0) {
    messages.push("[ts-guardrails] Existing oversized functions got worse:");
    messages.push(
      ...delta.worsenedFunctionViolations.map(formatFunctionViolation),
    );
  }

  return messages;
}

function ensureDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

export function writeBaseline(baselinePath, document) {
  ensureDirectory(baselinePath);
  fs.writeFileSync(baselinePath, `${JSON.stringify(document, null, 2)}\n`);
}
