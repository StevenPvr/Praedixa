import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";

const defaultRepoRoot = process.cwd();
const ctoDocDirRelativePath = path.join("docs", "cto");
const ctoReadmeRelativePath = path.join(ctoDocDirRelativePath, "README.md");

export const ctoCriticalPageFiles = [
  "01-systeme-et-runtimes.md",
  "02-vocabulaire-et-domaines.md",
  "03-modele-de-donnees-global.md",
  "04-schema-public-postgres.md",
  "05-schemas-tenant-et-medallion.md",
  "06-flux-de-donnees-applicatifs.md",
  "07-connecteurs-et-sync-runs.md",
  "08-contrats-et-types-partages.md",
  "09-runbook-exploration-bd.md",
  "10-ownership-et-tracabilite-des-donnees.md",
  "11-surfaces-http-et-statut.md",
  "12-ui-endpoint-service-table-type.md",
  "13-migrations-et-impacts-metier.md",
  "14-telemetry-et-correlation.md",
  "15-capabilities-et-securite-connecteurs.md",
  "16-legacy-et-surfaces-fermees.md",
  "17-taxonomies-et-registres.md",
];

function listDirectoryFiles(dirPath) {
  if (!existsSync(dirPath)) {
    return [];
  }

  return readdirSync(dirPath)
    .filter((entry) => {
      const fullPath = path.join(dirPath, entry);
      return statSync(fullPath).isFile();
    })
    .sort((left, right) => left.localeCompare(right));
}

function isNumberedCtoPage(fileName) {
  return /^\d{2}-[^/]+\.md$/.test(fileName);
}

function extractMarkdownLinks(markdown) {
  const links = [];
  const linkPattern = /\[[^\]]*\]\(([^)]+)\)/g;

  for (const match of markdown.matchAll(linkPattern)) {
    const rawTarget = match[1].trim().split(/\s+/)[0];
    const target = rawTarget.replace(/^<|>$/g, "");
    links.push(target);
  }

  return links;
}

function normalizeMarkdownTarget(target) {
  const withoutFragment = target.split("#")[0].split("?")[0];
  return path.basename(withoutFragment);
}

export function collectCtoDocInventory(repoRoot = defaultRepoRoot) {
  const docsRoot = path.join(repoRoot, ctoDocDirRelativePath);
  const readmePath = path.join(repoRoot, ctoReadmeRelativePath);
  const readmeExists = existsSync(readmePath) && statSync(readmePath).isFile();
  const readmeMarkdown = readmeExists ? readFileSync(readmePath, "utf8") : "";
  const pageFiles = listDirectoryFiles(docsRoot).filter(isNumberedCtoPage);
  const readmeLinkedFiles = extractMarkdownLinks(readmeMarkdown)
    .map(normalizeMarkdownTarget)
    .filter(isNumberedCtoPage);

  return {
    repoRoot,
    docsRoot,
    readmePath,
    readmeExists,
    readmeMarkdown,
    pageFiles,
    readmeLinkedFiles,
  };
}

export function validateCtoDocGuardrails({
  readmeExists,
  pageFiles,
  readmeLinkedFiles,
}) {
  const errors = [];
  const pageSet = new Set(pageFiles);
  const linkedSet = new Set(readmeLinkedFiles);

  if (!readmeExists) {
    errors.push(`missing critical CTO doc: ${ctoReadmeRelativePath}`);
  }

  for (const requiredPage of ctoCriticalPageFiles) {
    if (!pageSet.has(requiredPage)) {
      errors.push(`missing critical CTO doc: ${path.join(ctoDocDirRelativePath, requiredPage)}`);
    }
  }

  if (readmeExists) {
    for (const pageFile of pageFiles) {
      if (!linkedSet.has(pageFile)) {
        errors.push(
          `docs/cto/README.md must reference numbered page \`${pageFile}\``,
        );
      }
    }

    for (const linkedFile of readmeLinkedFiles) {
      if (!pageSet.has(linkedFile)) {
        errors.push(
          `docs/cto/README.md references missing numbered page \`${linkedFile}\``,
        );
      }
    }
  }

  return errors;
}

function parseArgs(argv) {
  const options = {
    repoRoot: defaultRepoRoot,
    printJson: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--print-json") {
      options.printJson = true;
      continue;
    }

    if (arg === "--root") {
      const next = argv[index + 1];
      if (!next) {
        throw new Error("--root requires a path");
      }
      options.repoRoot = path.resolve(next);
      index += 1;
      continue;
    }

    if (arg.startsWith("--root=")) {
      options.repoRoot = path.resolve(arg.slice("--root=".length));
    }
  }

  return options;
}

export function runCli(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const inventory = collectCtoDocInventory(options.repoRoot);
  const errors = validateCtoDocGuardrails(inventory);

  if (options.printJson) {
    console.log(
      JSON.stringify(
        {
          ok: errors.length === 0,
          ...inventory,
          errors,
        },
        null,
        2,
      ),
    );
    return errors.length === 0 ? 0 : 1;
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`[cto-doc-guardrails] ${error}`);
    }
    return 1;
  }

  console.log(
    `[cto-doc-guardrails] OK: ${inventory.pageFiles.length} numbered CTO pages indexed by docs/cto/README.md`,
  );
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = runCli();
}
