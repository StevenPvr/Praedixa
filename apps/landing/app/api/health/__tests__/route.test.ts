import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      body,
      json: () => Promise.resolve(body),
    }),
  },
}));

describe("GET /api/health", () => {
  const originalEnv = process.env.RESEND_API_KEY;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.RESEND_API_KEY = originalEnv;
    } else {
      delete process.env.RESEND_API_KEY;
    }
  });

  it("should return 200 with status 'healthy' when RESEND_API_KEY is set", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    const { GET } = await import("../route");
    const res = (await GET()) as {
      status: number;
      body: { status: string; timestamp: string };
    };
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("healthy");
    expect(res.body.timestamp).toBeDefined();
  });

  it("should return 503 with status 'degraded' when RESEND_API_KEY is unset", async () => {
    delete process.env.RESEND_API_KEY;
    const { GET } = await import("../route");
    const res = (await GET()) as {
      status: number;
      body: { status: string; timestamp: string };
    };
    expect(res.status).toBe(503);
    expect(res.body.status).toBe("degraded");
  });

  it("should include a valid ISO timestamp", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    const { GET } = await import("../route");
    const res = (await GET()) as {
      status: number;
      body: { status: string; timestamp: string };
    };
    const date = new Date(res.body.timestamp);
    expect(date.toISOString()).toBe(res.body.timestamp);
  });
});
