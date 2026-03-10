import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: vi.fn(async () => ({ data: { id: "mock-id" }, error: null })),
    };
  },
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: (
      body: unknown,
      init?: { status?: number; headers?: HeadersInit },
    ) => ({
      status: init?.status ?? 200,
      body,
      headers: new Headers(init?.headers),
      json: () => Promise.resolve(body),
    }),
  },
}));

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    locale: "fr",
    email: "jean@acme.fr",
    companyName: "ACME Corp",
    timezone: "Europe/Paris",
    slots: ["2026-03-15T10:30", "2026-03-16T14:00", "2026-03-17T09:15"],
    notes: "Nous voulons cadrer un pilote.",
    website: "",
    source: "landing",
    ...overrides,
  };
}

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  const json = typeof body === "string" ? body : JSON.stringify(body);

  return new Request("http://localhost:3000/api/scoping-call", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "content-length": String(new TextEncoder().encode(json).length),
      origin: "http://localhost:3000",
      ...headers,
    },
    body: json,
  });
}

describe("POST /api/scoping-call", () => {
  let POST: (
    request: Request,
  ) => Promise<{ status: number; body: unknown; headers: Headers }>;

  beforeEach(async () => {
    vi.resetModules();
    process.env.RESEND_API_KEY = "re_test_key";
    const mod = await import("../route");
    POST = mod.POST as unknown as typeof POST;
  });

  it("returns no-store on rejected origins", async () => {
    const response = await POST(
      makeRequest(validBody(), { origin: "https://evil.example" }),
    );

    expect(response.status).toBe(403);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns no-store on successful submissions", async () => {
    const response = await POST(makeRequest(validBody()));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
