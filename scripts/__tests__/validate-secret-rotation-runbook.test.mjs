import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import test from "node:test";

import { validateSecretRotationRunbook } from "../validate-secret-rotation-runbook.mjs";

const repoRoot = process.cwd();
const runbookPath = path.join(
  repoRoot,
  "docs/runbooks/security-secret-rotation.md",
);
const inventoryPath = path.join(
  repoRoot,
  "docs/deployment/runtime-secrets-inventory.json",
);
const matrixPath = path.join(
  repoRoot,
  "docs/deployment/environment-secrets-owners-matrix.md",
);

function withBrokenRunbook(transform, assertion) {
  const tempDir = mkdtempSync(path.join(tmpdir(), "rotation-runbook-"));
  const brokenRunbookPath = path.join(tempDir, "security-secret-rotation.md");
  const originalRunbook = readFileSync(runbookPath, "utf8");
  writeFileSync(brokenRunbookPath, transform(originalRunbook), "utf8");

  try {
    const errors = validateSecretRotationRunbook({
      runbookPath: brokenRunbookPath,
      inventoryPath,
      matrixPath,
    });
    assertion(errors);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function rewriteMatrixRow(markdown, systemId, transformCells) {
  let found = false;
  const nextMarkdown = markdown
    .split("\n")
    .map((line) => {
      if (!line.startsWith(`| \`${systemId}\` `)) {
        return line;
      }
      found = true;
      const cells = line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim());
      return `| ${transformCells(cells).join(" | ")} |`;
    })
    .join("\n");

  assert.ok(found, `missing matrix row for ${systemId}`);
  return nextMarkdown;
}

test("secret rotation runbook validates the committed baseline", () => {
  assert.deepEqual(
    validateSecretRotationRunbook({
      runbookPath,
      inventoryPath,
      matrixPath,
    }),
    [],
  );
});

test("secret rotation runbook rejects missing release key reference", () => {
  withBrokenRunbook(
    (markdown) =>
      markdown.replaceAll("~/.praedixa/release-manifest.key", "~/.missing"),
    (errors) => {
      assert.match(
        errors.join("\n"),
        /runbook is missing reference ~\/\.praedixa\/release-manifest\.key/,
      );
    },
  );
});

test("secret rotation runbook rejects missing local gate signing key reference", () => {
  withBrokenRunbook(
    (markdown) =>
      markdown.replaceAll(".git/gate-signing.key", ".git/missing-gate.key"),
    (errors) => {
      assert.match(
        errors.join("\n"),
        /runbook is missing reference \.git\/gate-signing\.key/,
      );
    },
  );
});

test("secret rotation runbook rejects matrix row without owner", () => {
  withBrokenRunbook(
    (markdown) =>
      rewriteMatrixRow(markdown, "api-prod", (cells) => {
        const nextCells = [...cells];
        nextCells[2] = "";
        return nextCells;
      }),
    (errors) => {
      assert.match(
        errors.join("\n"),
        /rotation matrix row api-prod is missing Owner principal/,
      );
    },
  );
});

test("secret rotation runbook rejects missing system coverage row", () => {
  withBrokenRunbook(
    (markdown) =>
      markdown
        .split("\n")
        .filter((line) => !line.startsWith("| `auth-prod` "))
        .join("\n"),
    (errors) => {
      assert.match(
        errors.join("\n"),
        /rotation matrix is missing row for system auth-prod/,
      );
    },
  );
});

test("secret rotation runbook rejects missing local gate signing row", () => {
  withBrokenRunbook(
    (markdown) =>
      markdown
        .split("\n")
        .filter((line) => !line.startsWith("| `local-gate-signing` "))
        .join("\n"),
    (errors) => {
      assert.match(
        errors.join("\n"),
        /rotation matrix is missing row for system local-gate-signing/,
      );
    },
  );
});

test("secret rotation runbook rejects cadence wider than inventory SLA", () => {
  withBrokenRunbook(
    (markdown) =>
      rewriteMatrixRow(markdown, "webapp-prod", (cells) => {
        const nextCells = [...cells];
        nextCells[4] = "<= 120 jours";
        return nextCells;
      }),
    (errors) => {
      assert.match(
        errors.join("\n"),
        /rotation matrix row webapp-prod cadence must be <= 90 jours/,
      );
    },
  );
});

test("secret rotation runbook rejects local gate signing evidence without gate verification", () => {
  withBrokenRunbook(
    (markdown) =>
      rewriteMatrixRow(markdown, "local-gate-signing", (cells) => {
        const nextCells = [...cells];
        nextCells[5] = "ancienne cle retiree, fichier local remplace";
        return nextCells;
      }),
    (errors) => {
      const errorText = errors.join("\n");
      assert.match(
        errorText,
        /rotation matrix row local-gate-signing evidence must reference \.git\/gate-signing\.key/,
      );
      assert.match(
        errorText,
        /rotation matrix row local-gate-signing evidence must mention pnpm gate:verify/,
      );
    },
  );
});

test("secret rotation runbook rejects evidence without path, revocation, and verification", () => {
  withBrokenRunbook(
    (markdown) =>
      rewriteMatrixRow(markdown, "admin-prod", (cells) => {
        const nextCells = [...cells];
        nextCells[5] = "preuve manuelle";
        return nextCells;
      }),
    (errors) => {
      const errorText = errors.join("\n");
      assert.match(
        errorText,
        /rotation matrix row admin-prod evidence must reference \/praedixa\/prod\/admin-prod\/runtime/,
      );
      assert.match(
        errorText,
        /rotation matrix row admin-prod evidence must mention revocation or retrait/,
      );
      assert.match(
        errorText,
        /rotation matrix row admin-prod evidence must mention a runnable verification step/,
      );
    },
  );
});
