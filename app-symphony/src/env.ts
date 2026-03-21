import { promises as fsp } from "node:fs";
import path from "node:path";

function parseEnvLine(line: string): { key: string; value: string } | null {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.startsWith("#")) {
    return null;
  }

  const separatorIndex = trimmed.indexOf("=");
  if (separatorIndex <= 0) {
    return null;
  }

  const key = trimmed.slice(0, separatorIndex).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
    return null;
  }

  let value = trimmed.slice(separatorIndex + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return { key, value };
}

async function loadEnvFile(filePath: string): Promise<void> {
  let raw: string;
  try {
    raw = await fsp.readFile(filePath, "utf8");
  } catch {
    return;
  }

  for (const line of raw.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (parsed == null) {
      continue;
    }
    if (process.env[parsed.key] == null) {
      process.env[parsed.key] = parsed.value;
    }
  }
}

export async function loadSymphonyLocalEnv(input: {
  processCwd: string;
  packageDir: string;
  repoRoot: string;
}): Promise<void> {
  const candidates = [
    path.resolve(input.packageDir, ".env.local"),
    path.resolve(input.packageDir, ".env"),
    path.resolve(input.processCwd, ".env.local"),
    path.resolve(input.processCwd, ".env"),
    path.resolve(input.repoRoot, ".env.local"),
  ];

  for (const filePath of candidates) {
    await loadEnvFile(filePath);
  }
}
