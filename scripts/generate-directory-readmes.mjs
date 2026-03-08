#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const SKIP_SEGMENTS = new Set([
  ".git",
  "node_modules",
  ".next",
  ".open-next",
  "dist",
  "coverage",
  "playwright-report",
  "test-results",
  ".turbo",
  ".venv",
  "__pycache__",
  ".pytest_cache",
  ".ruff_cache",
  ".mypy_cache",
  ".hypothesis",
  ".pnpm-store",
]);

function toTitle(segment) {
  return segment
    .replace(/[\[\]]/g, "")
    .replace(/[-_.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase()) || "Racine";
}

function getTrackedFiles() {
  return execSync("git ls-files", { encoding: "utf8" })
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((file) => !file.startsWith("centaurus/"));
}

function isDocEligible(parts) {
  return !parts.some((part) => SKIP_SEGMENTS.has(part));
}

function ensureInfo(infoMap, dirPath) {
  if (!infoMap.has(dirPath)) {
    infoMap.set(dirPath, { childDirs: new Set(), childFiles: new Set() });
  }
  return infoMap.get(dirPath);
}

function buildDirInfo(files) {
  const infoMap = new Map();
  for (const file of files) {
    const parts = file.split("/");
    if (!isDocEligible(parts)) continue;
    for (let index = 0; index < parts.length - 1; index += 1) {
      const dirPath = parts.slice(0, index + 1).join("/");
      const info = ensureInfo(infoMap, dirPath);
      if (index < parts.length - 2) {
        info.childDirs.add(parts[index + 1]);
      } else {
        info.childFiles.add(parts[index + 1]);
      }
    }
  }
  return infoMap;
}

function nearestRoot(pathname) {
  const parts = pathname.split("/");
  if (parts[0] === ".github") return ".github";
  if (parts[0] === "docs") return "docs";
  if (parts[0] === "contracts") return "contracts";
  if (parts[0] === "infra") return "infra";
  if (parts[0] === "scripts") return "scripts";
  if (parts[0] === "testing") return "testing";
  if (parts[0] === "content") return "content";
  if (parts[0] === "packages") return parts.slice(0, 2).join("/");
  if (parts[0]?.startsWith("app-")) return parts[0];
  return parts[0] ?? pathname;
}

function inferRole(dirPath, info) {
  const parts = dirPath.split("/");
  const last = parts.at(-1);
  const parent = parts.at(-2);
  const root = nearestRoot(dirPath);
  const routeFiles = [...info.childFiles].filter((file) =>
    [
      "page.tsx",
      "layout.tsx",
      "loading.tsx",
      "error.tsx",
      "not-found.tsx",
      "route.ts",
      "default.tsx",
    ].includes(file),
  );

  if (last === "__tests__") {
    return `Ce dossier regroupe les tests associés au dossier parent \`${parts
      .slice(0, -1)
      .join("/")}\`. Il documente et vérifie le comportement attendu de cette zone du code.`;
  }

  if (parts.includes("app") && routeFiles.length > 0) {
    return `Ce dossier matérialise un segment de route Next.js. Les fichiers ${routeFiles
      .map((file) => `\`${file}\``)
      .join(", ")} définissent le rendu, le layout ou le handler HTTP de ce segment.`;
  }

  if (parts.includes("app") && parts.includes("api")) {
    return "Ce dossier porte des routes serveur ou des handlers BFF utilisés par une app Next.js. On y trouve la frontière HTTP côté application.";
  }

  if (last === "components") {
    return "Ce dossier regroupe les composants UI du périmètre concerné. Ils encapsulent la présentation, l'interaction et parfois une petite orchestration locale.";
  }

  if (parent === "components") {
    return `Ce sous-dossier contient une famille spécialisée de composants rattachée à \`${root}\`.`;
  }

  if (last === "hooks") {
    return "Ce dossier regroupe les hooks React réutilisables du périmètre. Ils extraient l'état, la logique de données et les interactions clientes.";
  }

  if (last === "lib") {
    return "Ce dossier contient les utilitaires internes, helpers métier, clients techniques et services locaux utilisés par le reste du périmètre.";
  }

  if (last === "auth") {
    return "Ce dossier concentre les flux d'authentification, de session et les adaptations OIDC nécessaires au périmètre.";
  }

  if (last === "security") {
    return "Ce dossier rassemble les helpers et garde-fous de sécurité du périmètre: origine des requêtes, rate limiting, CSP, contrôles d'accès ou invariants.";
  }

  if (last === "i18n") {
    return "Ce dossier contient la logique d'internationalisation: configuration, providers, dictionnaires et tests associés.";
  }

  if (last === "seo") {
    return "Ce dossier contient les briques SEO et discovery: métadonnées, schéma, helpers de maillage et génération de surface indexable.";
  }

  if (last === "media" || last === "public") {
    return "Ce dossier regroupe les assets statiques ou les helpers de média utilisés par le périmètre.";
  }

  if (last === "src") {
    return "Ce dossier contient le code source principal du package ou service.";
  }

  if (last === "services") {
    return "Ce dossier regroupe la logique métier ou technique orchestrée par services.";
  }

  if (last === "models") {
    return "Ce dossier contient les modèles de données persistées et leurs structures de domaine côté backend.";
  }

  if (last === "schemas") {
    return "Ce dossier regroupe les schémas de validation, de sérialisation et les DTO exposés par le backend.";
  }

  if (last === "migrations" || dirPath.endsWith("alembic/versions")) {
    return "Ce dossier porte l'historique des migrations de schéma et doit rester aligné avec l'état réel de la base.";
  }

  if (last === "fixtures") {
    return "Ce dossier contient des fixtures, mocks et utilitaires de test réutilisables par plusieurs scénarios.";
  }

  if (last === "utils") {
    return "Ce dossier regroupe les utilitaires transverses du périmètre.";
  }

  if (last === "domain") {
    return "Ce dossier contient les types et structures de domaine exposés par le package partagé.";
  }

  if (last === "api") {
    return "Ce dossier regroupe les contrats, clients ou helpers liés aux échanges HTTP/API du périmètre.";
  }

  if (last === "quality") {
    return "Ce sous-dossier implémente des traitements spécialisés de qualité de données.";
  }

  if (root === "scripts") {
    return "Ce dossier contient des scripts opérationnels ou de support automatisant une partie du cycle de vie du repo.";
  }

  if (root === "testing") {
    return "Ce dossier participe à l'infrastructure de test du monorepo.";
  }

  if (root === "docs") {
    return "Ce dossier contient une partie de la documentation projet longue durée.";
  }

  return `Ce dossier fait partie du périmètre \`${root}\` et regroupe des fichiers liés à ${toTitle(last).toLowerCase()}.`;
}

function inferIntegration(dirPath) {
  const root = nearestRoot(dirPath);
  if (root.startsWith("app-")) {
    return `Ce dossier est consommé par l'application \`${root}\` et s'insère dans son flux runtime, build ou test.`;
  }
  if (root.startsWith("packages/")) {
    return `Ce dossier appartient au package partagé \`${root}\` et peut être importé par plusieurs apps du monorepo.`;
  }
  if (root === "testing") {
    return "Ce dossier supporte les campagnes de test transverses exécutées depuis la racine du monorepo.";
  }
  if (root === "scripts") {
    return "Ce dossier est invoqué depuis les scripts racine, les gates ou les runbooks opératoires.";
  }
  if (root === "docs") {
    return "Ce dossier sert de référence documentaire et complète les README locaux du code.";
  }
  return `Ce dossier s'intègre au sous-système \`${root}\` du repo.`;
}

function renderList(items, labelPrefix) {
  if (items.length === 0) return "- Aucun élément versionné direct.";
  return items
    .slice(0, 20)
    .map((item) => `- \`${labelPrefix}${item}\``)
    .join("\n");
}

function renderReadme(dirPath, info) {
  const parts = dirPath.split("/");
  const last = parts.at(-1);
  const title = toTitle(last);
  const childDirs = [...info.childDirs].sort();
  const childFiles = [...info.childFiles]
    .filter((file) => file !== "README.md")
    .sort();

  return `# ${title}

## Rôle

${inferRole(dirPath, info)}

## Contenu immédiat

Sous-dossiers :
${renderList(childDirs, "")}

Fichiers :
${renderList(childFiles, "")}

## Intégration

${inferIntegration(dirPath)}
`;
}

function main() {
  const trackedFiles = getTrackedFiles();
  const dirInfo = buildDirInfo(trackedFiles);
  let created = 0;

  for (const [dirPath, info] of [...dirInfo.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    const readmePath = path.join(ROOT, dirPath, "README.md");
    if (fs.existsSync(readmePath)) continue;
    fs.writeFileSync(readmePath, `${renderReadme(dirPath, info).trim()}\n`, "utf8");
    created += 1;
  }

  console.log(`README files created: ${created}`);
}

main();
