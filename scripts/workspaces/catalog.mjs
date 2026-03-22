import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function listWorkspaceDirectories(repoRoot) {
  const appDirectories = readdirSync(repoRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("app-"))
    .map((entry) => entry.name)
    .filter((directory) =>
      existsSync(path.join(repoRoot, directory, "package.json")),
    );

  const packageRoot = path.join(repoRoot, "packages");
  const packageDirectories = readdirSync(packageRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => path.join("packages", entry.name))
    .filter((directory) =>
      existsSync(path.join(repoRoot, directory, "package.json")),
    );

  return [...appDirectories, ...packageDirectories].sort((left, right) =>
    left.localeCompare(right),
  );
}

function readWorkspaceManifest(repoRoot, workspaceDir) {
  const manifestPath = path.join(repoRoot, workspaceDir, "package.json");
  const manifest = readJson(manifestPath);
  return {
    dir: workspaceDir,
    manifestPath,
    name: manifest.name,
    scripts: manifest.scripts ?? {},
  };
}

export function collectWorkspaceCatalog(repoRoot) {
  return listWorkspaceDirectories(repoRoot)
    .map((workspaceDir) => readWorkspaceManifest(repoRoot, workspaceDir))
    .filter((workspace) => typeof workspace.name === "string");
}

export function readWorkspacePolicy(repoRoot) {
  const policyPath = path.join(repoRoot, "scripts", "workspace-policy.json");
  const policy = readJson(policyPath);
  return {
    ...policy,
    required_scripts: policy.required_scripts ?? [],
    required_test_workspaces: policy.required_test_workspaces ?? [],
    test_exemptions: policy.test_exemptions ?? {},
  };
}

export function collectCriticalTestWorkspaces(repoRoot) {
  const catalog = collectWorkspaceCatalog(repoRoot);
  const policy = readWorkspacePolicy(repoRoot);
  const criticalWorkspaces = catalog.filter((workspace) =>
    policy.required_test_workspaces.includes(workspace.dir),
  );

  const missingCatalogEntries = policy.required_test_workspaces.filter(
    (workspaceDir) =>
      !criticalWorkspaces.some((workspace) => workspace.dir === workspaceDir),
  );

  if (missingCatalogEntries.length > 0) {
    throw new Error(
      [
        "Critical test workspace policy references unknown workspaces:",
        ...missingCatalogEntries.map((workspaceName) => `- ${workspaceName}`),
      ].join("\n"),
    );
  }

  return criticalWorkspaces;
}
