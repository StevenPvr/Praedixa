import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import test from "node:test";
import assert from "node:assert/strict";
import { parseArgs } from "../check-ts-guardrail-baseline-lib.mjs";

const repoRoot = process.cwd();
const scriptPath = path.join(
  repoRoot,
  "scripts",
  "check-ts-guardrail-baseline.mjs",
);

function createLines(count, prefix) {
  return Array.from(
    { length: count },
    (_, index) => `${prefix}${index + 1}`,
  ).join("\n");
}

function runGuardrail(tempRoot, ...args) {
  return spawnSync(
    process.execPath,
    [
      scriptPath,
      "--root",
      tempRoot,
      "--baseline",
      "scripts/ts-guardrail-baseline.json",
      ...args,
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
    },
  );
}

test("check-ts-guardrail-baseline writes and enforces a baseline", () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "ts-guardrail-"));

  try {
    mkdirSync(path.join(tempRoot, "app-webapp", "src"), { recursive: true });
    mkdirSync(path.join(tempRoot, "scripts"), { recursive: true });

    writeFileSync(
      path.join(tempRoot, "app-webapp", "src", "big-file.ts"),
      `${createLines(520, "export const line")}\n`,
    );
    writeFileSync(
      path.join(tempRoot, "app-webapp", "src", "big-function.ts"),
      [
        "export function giant() {",
        createLines(55, "  const line"),
        "  return true;",
        "}",
        "",
      ].join("\n"),
    );
    writeFileSync(
      path.join(tempRoot, "app-webapp", "src", "ignored.test.ts"),
      `${createLines(700, "export const ignored")}\n`,
    );

    const writeBaseline = runGuardrail(tempRoot, "--write-current-baseline");
    assert.equal(writeBaseline.status, 0, writeBaseline.stderr);

    const baseline = JSON.parse(
      readFileSync(
        path.join(tempRoot, "scripts", "ts-guardrail-baseline.json"),
        "utf8",
      ),
    );
    assert.equal(baseline.fileViolations.length, 1);
    assert.equal(baseline.functionViolations.length, 1);
    assert.equal(baseline.fileViolations[0].file, "app-webapp/src/big-file.ts");
    assert.equal(
      baseline.functionViolations[0].file,
      "app-webapp/src/big-function.ts",
    );

    const matchesBaseline = runGuardrail(tempRoot);
    assert.equal(matchesBaseline.status, 0, matchesBaseline.stderr);

    writeFileSync(
      path.join(tempRoot, "app-webapp", "src", "new-big-function.ts"),
      [
        "export const tooLong = () => {",
        createLines(70, "  const extra"),
        "  return 1;",
        "};",
        "",
      ].join("\n"),
    );

    const regression = runGuardrail(tempRoot);
    assert.equal(regression.status, 1);
    assert.match(regression.stderr, /New oversized functions detected/);
    assert.match(regression.stderr, /new-big-function\.ts/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("parseArgs lets --include-root replace default roots", () => {
  const options = parseArgs(["--include-root", "scripts"]);
  assert.deepEqual(options.includeRoots, ["scripts"]);
});

test("parseArgs resolves --baseline against the final --root regardless of flag order", () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "ts-guardrail-args-"));

  try {
    const firstOrder = parseArgs([
      "--baseline",
      "custom/baseline.json",
      "--root",
      tempRoot,
    ]);
    const secondOrder = parseArgs([
      "--root",
      tempRoot,
      "--baseline",
      "custom/baseline.json",
    ]);

    const expectedPath = path.join(tempRoot, "custom", "baseline.json");
    assert.equal(firstOrder.baselinePath, expectedPath);
    assert.equal(secondOrder.baselinePath, expectedPath);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("parseArgs rejects missing flag values instead of consuming the next flag", () => {
  assert.throws(
    () => parseArgs(["--include-root", "--write-current-baseline"]),
    /--include-root requires a value/,
  );
});

test("check-ts-guardrail-baseline scopes the baseline to explicit include roots only", () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "ts-guardrail-scope-"));

  try {
    mkdirSync(path.join(tempRoot, "app-webapp", "src"), { recursive: true });
    mkdirSync(path.join(tempRoot, "scripts"), { recursive: true });
    mkdirSync(path.join(tempRoot, "packages", "shared-types", "src"), {
      recursive: true,
    });

    writeFileSync(
      path.join(tempRoot, "app-webapp", "src", "default-big-file.ts"),
      `${createLines(520, "export const defaultLine")}\n`,
    );
    writeFileSync(
      path.join(
        tempRoot,
        "packages",
        "shared-types",
        "src",
        "scoped-big-file.ts",
      ),
      `${createLines(530, "export const scopedLine")}\n`,
    );

    const writeBaseline = runGuardrail(
      tempRoot,
      "--write-current-baseline",
      "--include-root",
      "packages",
    );
    assert.equal(writeBaseline.status, 0, writeBaseline.stderr);

    const baseline = JSON.parse(
      readFileSync(
        path.join(tempRoot, "scripts", "ts-guardrail-baseline.json"),
        "utf8",
      ),
    );
    assert.deepEqual(baseline.metadata.includeRoots, ["packages"]);
    assert.deepEqual(baseline.fileViolations, [
      {
        file: "packages/shared-types/src/scoped-big-file.ts",
        lines: 531,
      },
    ]);

    const scopedRun = runGuardrail(tempRoot, "--include-root", "packages");
    assert.equal(scopedRun.status, 0, scopedRun.stderr);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
