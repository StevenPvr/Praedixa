import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({
  NextResponse: {
    json: (
      body: unknown,
      init?: { status?: number; headers?: Record<string, string> },
    ) => ({
      status: init?.status ?? 200,
      body,
      headers: init?.headers,
      json: () => Promise.resolve(body),
    }),
  },
}));

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should include a valid ISO timestamp", async () => {
    const { GET } = await import("../route");
    const res = (await GET()) as unknown as {
      status: number;
      body: { status: string; timestamp: string };
    };
    const date = new Date(res.body.timestamp);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(date.toISOString()).toBe(res.body.timestamp);
  });

  it("returns non-cacheable, non-indexable headers", async () => {
    const { GET } = await import("../route");
    const res = (await GET()) as unknown as {
      status: number;
      headers?: Record<string, string>;
    };

    expect(res.status).toBe(200);
    expect(res.headers).toEqual({
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    });
  });
});
