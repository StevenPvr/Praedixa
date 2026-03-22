import { Pool, type PoolClient, type QueryResultRow } from "pg";

let singletonPool: Pool | null | undefined;

export class PersistenceError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 500,
    public readonly code = "PERSISTENCE_ERROR",
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "PersistenceError";
  }
}

export function isUuidString(
  value: string | null | undefined,
): value is string {
  if (!value) {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function hasPersistentDatabase(): boolean {
  return (process.env["DATABASE_URL"]?.trim().length ?? 0) > 0;
}

export function canUsePersistentStore(
  scopeId: string | null | undefined,
): boolean {
  return hasPersistentDatabase() && isUuidString(scopeId);
}

export function getPersistencePool(): Pool | null {
  if (singletonPool !== undefined) {
    return singletonPool;
  }

  const databaseUrl = process.env["DATABASE_URL"]?.trim() ?? "";
  if (!databaseUrl) {
    singletonPool = null;
    return singletonPool;
  }

  singletonPool = new Pool({
    connectionString: databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
  return singletonPool;
}

export async function queryRows<T extends QueryResultRow>(
  text: string,
  values: readonly unknown[],
): Promise<T[]> {
  const pool = getPersistencePool();
  if (!pool) {
    throw new PersistenceError(
      "Persistent database is not configured.",
      503,
      "PERSISTENCE_UNAVAILABLE",
    );
  }

  const result = await pool.query<T>(text, [...values]);
  return result.rows;
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const pool = getPersistencePool();
  if (!pool) {
    throw new PersistenceError(
      "Persistent database is not configured.",
      503,
      "PERSISTENCE_UNAVAILABLE",
    );
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw mapPersistenceError(error);
  } finally {
    client.release();
  }
}

export function mapPersistenceError(
  error: unknown,
  fallbackCode = "PERSISTENCE_ERROR",
  fallbackMessage = "The persistent storage operation failed.",
): PersistenceError {
  if (error instanceof PersistenceError) {
    return error;
  }

  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    if (error.code === "22P02") {
      return new PersistenceError(
        "One or more identifiers are invalid.",
        400,
        "INVALID_IDENTIFIER",
      );
    }

    if (error.code === "23505") {
      return new PersistenceError(
        "The requested record already exists.",
        409,
        "CONFLICT",
      );
    }
  }

  return new PersistenceError(fallbackMessage, 500, fallbackCode, {
    cause: error instanceof Error ? error.message : String(error),
  });
}

export function toIsoDateOnly(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}

export function toIsoDateTime(value: Date | string | null): string | null {
  if (value == null) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString();
}

export function normalizeStringArray(
  values: readonly string[] | null | undefined,
): string[] {
  return Array.from(
    new Set(
      (values ?? [])
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  );
}
