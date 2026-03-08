import { createServer } from "node:net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type RedisServerHandle = {
  close: () => Promise<void>;
  url: string;
};

function createRequest(headers: Record<string, string> = {}): Request {
  return new Request("https://www.praedixa.com/api/contact", {
    headers,
  });
}

function parseRespCommand(source: string): string[] | null {
  if (!source.startsWith("*")) return null;

  let cursor = 0;
  const readLine = (): string | null => {
    const lineEnd = source.indexOf("\r\n", cursor);
    if (lineEnd === -1) return null;
    const line = source.slice(cursor, lineEnd);
    cursor = lineEnd + 2;
    return line;
  };

  const arrayHeader = readLine();
  if (!arrayHeader) return null;
  const count = Number.parseInt(arrayHeader.slice(1), 10);
  if (!Number.isFinite(count) || count < 0) return null;

  const values: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const bulkHeader = readLine();
    if (!bulkHeader?.startsWith("$")) return null;
    const length = Number.parseInt(bulkHeader.slice(1), 10);
    if (!Number.isFinite(length) || length < 0) return null;
    if (source.length < cursor + length + 2) return null;

    values.push(source.slice(cursor, cursor + length));
    cursor += length + 2;
  }

  return values;
}

function createFakeRedisServer(): Promise<RedisServerHandle> {
  const rateLimits = new Map<string, { count: number; expiresAt: number }>();
  const singleUseKeys = new Map<string, number>();

  const server = createServer((socket) => {
    let buffer = "";

    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      const command = parseRespCommand(buffer);
      if (!command) {
        return;
      }

      buffer = "";
      const now = Date.now();
      for (const [key, entry] of rateLimits.entries()) {
        if (entry.expiresAt <= now) {
          rateLimits.delete(key);
        }
      }
      for (const [key, expiresAt] of singleUseKeys.entries()) {
        if (expiresAt <= now) {
          singleUseKeys.delete(key);
        }
      }

      const op = command[0]?.toUpperCase();
      if (op === "AUTH" || op === "SELECT") {
        socket.write("+OK\r\n");
        return;
      }

      if (op === "EVAL") {
        const key = command[3] ?? "";
        const windowMs = Number.parseInt(command[4] ?? "0", 10);
        const existing = rateLimits.get(key);
        if (!existing || existing.expiresAt <= now) {
          rateLimits.set(key, {
            count: 1,
            expiresAt: now + windowMs,
          });
        } else {
          existing.count += 1;
          rateLimits.set(key, existing);
        }

        const current = rateLimits.get(key);
        if (!current) {
          socket.write("-ERR missing state\r\n");
          return;
        }

        const ttlMs = Math.max(1, current.expiresAt - now);
        socket.write(`*2\r\n:${current.count}\r\n:${ttlMs}\r\n`);
        return;
      }

      if (op === "SET") {
        const key = command[1] ?? "";
        const ttlMs = Number.parseInt(command[4] ?? "0", 10);
        const existing = singleUseKeys.get(key);
        if (existing && existing > now) {
          socket.write("$-1\r\n");
          return;
        }

        singleUseKeys.set(key, now + ttlMs);
        socket.write("+OK\r\n");
        return;
      }

      socket.write("-ERR unsupported command\r\n");
    });
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Unable to resolve fake redis address"));
        return;
      }

      resolve({
        url: `redis://127.0.0.1:${address.port}/0`,
        close: () =>
          new Promise<void>((closeResolve, closeReject) => {
            server.close((error) => {
              if (error) {
                closeReject(error);
                return;
              }
              closeResolve();
            });
          }),
      });
    });
  });
}

describe("landing security store", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(async () => {
    const mod = await import("../security-store");
    mod.__resetSecurityStoreStateForTests();
    vi.unstubAllEnvs();
  });

  it("falls back to in-memory storage outside production", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const mod = await import("../security-store");

    const first = await mod.consumeSecurityRateLimit(createRequest({
      "user-agent": "vitest-a",
    }), {
      scope: "landing-contact",
      max: 1,
      windowMs: 60_000,
    });
    const second = await mod.consumeSecurityRateLimit(createRequest({
      "user-agent": "vitest-a",
    }), {
      scope: "landing-contact",
      max: 1,
      windowMs: 60_000,
    });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(false);
  });

  it("fails closed in production when Redis is not configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RATE_LIMIT_STORAGE_URI", "");
    const mod = await import("../security-store");

    await expect(
      mod.consumeSecurityRateLimit(createRequest({
        "user-agent": "vitest-b",
      }), {
        scope: "landing-contact",
        max: 1,
        windowMs: 60_000,
      }),
    ).rejects.toBeInstanceOf(mod.SecurityStoreUnavailableError);
  });

  it("uses Redis for distributed rate limiting and single-use claims", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LANDING_TRUST_PROXY_IP_HEADERS", "1");

    const fakeRedis = await createFakeRedisServer();
    vi.stubEnv("RATE_LIMIT_STORAGE_URI", fakeRedis.url);

    try {
      const mod = await import("../security-store");
      const request = createRequest({
        "cf-connecting-ip": "203.0.113.50",
      });

      const first = await mod.consumeSecurityRateLimit(request, {
        scope: "landing-contact",
        max: 1,
        windowMs: 60_000,
      });
      const second = await mod.consumeSecurityRateLimit(request, {
        scope: "landing-contact",
        max: 1,
        windowMs: 60_000,
      });

      expect(first.allowed).toBe(true);
      expect(second.allowed).toBe(false);

      await expect(
        mod.claimSingleUseToken("landing-contact", "token-1", 60_000),
      ).resolves.toBe(true);
      await expect(
        mod.claimSingleUseToken("landing-contact", "token-1", 60_000),
      ).resolves.toBe(false);
    } finally {
      await fakeRedis.close();
    }
  });
});
