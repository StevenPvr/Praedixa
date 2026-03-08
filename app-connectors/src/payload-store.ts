import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function sanitizePathSegment(value: string, label: string): string {
  const trimmed = value.trim();
  if (!/^[A-Za-z0-9._:-]{1,200}$/.test(trimmed)) {
    throw new Error(`${label} contains unsupported characters`);
  }
  return trimmed;
}

export interface StoredPayloadObject {
  contentType: string;
  key: string;
  sizeBytes: number;
}

export interface PayloadStore {
  putJson(
    organizationId: string,
    connectionId: string,
    eventId: string,
    payload: Record<string, unknown>,
  ): Promise<StoredPayloadObject>;
  getJson(objectKey: string): Promise<Record<string, unknown>>;
}

export class LocalFilePayloadStore implements PayloadStore {
  constructor(private readonly rootDir: string) {}

  async putJson(
    organizationId: string,
    connectionId: string,
    eventId: string,
    payload: Record<string, unknown>,
  ): Promise<StoredPayloadObject> {
    const safeOrgId = sanitizePathSegment(organizationId, "organizationId");
    const safeConnectionId = sanitizePathSegment(connectionId, "connectionId");
    const safeEventId = sanitizePathSegment(eventId, "eventId");
    const relativeKey = path.posix.join(
      safeOrgId,
      safeConnectionId,
      `${safeEventId}.json`,
    );
    const absolutePath = path.join(this.rootDir, relativeKey);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    const serialized = JSON.stringify(payload);
    await writeFile(absolutePath, serialized, { encoding: "utf8", mode: 0o600 });
    return {
      key: relativeKey,
      contentType: "application/json",
      sizeBytes: Buffer.byteLength(serialized, "utf8"),
    };
  }

  async getJson(objectKey: string): Promise<Record<string, unknown>> {
    const normalizedKey = objectKey
      .split("/")
      .map((segment) => sanitizePathSegment(segment, "objectKey"))
      .join(path.sep);
    const absolutePath = path.join(this.rootDir, normalizedKey);
    const raw = await readFile(absolutePath, "utf8");
    return JSON.parse(raw) as Record<string, unknown>;
  }
}
