import { createHash, randomUUID } from "node:crypto";
import { createServer } from "node:net";
import path from "node:path";

export function nowIso(): string {
  return new Date().toISOString();
}

export function monotonicNowMs(): number {
  return Date.now();
}

export function normalizeStateName(value: string): string {
  return value.trim().toLowerCase();
}

export function sanitizeWorkspaceKey(identifier: string): string {
  return identifier.replace(/[^A-Za-z0-9._-]/g, "_");
}

export function assertPathInsideRoot(root: string, candidate: string): void {
  const relative = path.relative(root, candidate);
  if (
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new Error(`Path ${candidate} escapes configured root ${root}`);
  }
}

export function truncateText(
  value: string | null | undefined,
  maxLength = 240,
): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  return trimmed.length <= maxLength
    ? trimmed
    : `${trimmed.slice(0, maxLength - 1)}…`;
}

export function stableHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function reserveFreePort(): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port =
        typeof address === "object" && address != null ? address.port : null;
      server.close((error) => {
        if (error != null) {
          reject(error);
          return;
        }
        if (port == null) {
          reject(new Error("Failed to allocate a free TCP port"));
          return;
        }
        resolve(port);
      });
    });
  });
}

export function coerceString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

export function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) {
    return [];
  }
  return Array.isArray(value) ? [...value] : [value];
}

export function createRequestId(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}
