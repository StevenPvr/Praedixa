import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({
  NextResponse: {
    json: (
      body: unknown,
      init?: { status?: number; headers?: Record<string, string> },
    ) => ({
      status: init?.status ?? 200,
      body,
      headers: new Headers(init?.headers),
      json: () => Promise.resolve(body),
    }),
  },
}));

function makeRequest(
  body: unknown,
  {
    token = "test-token",
    contentType = "application/json",
  }: { token?: string; contentType?: string } = {},
): Request {
  const text = typeof body === "string" ? body : JSON.stringify(body);

  return new Request(
    "https://www.praedixa.com/api/v1/public/contact-requests",
    {
      method: "POST",
      headers: {
        "content-type": contentType,
        "content-length": String(new TextEncoder().encode(text).length),
        "x-contact-ingest-token": token,
        "x-request-id": "req-123",
      },
      body: text,
    },
  );
}

function validPayload() {
  return {
    locale: "fr",
    requestType: "deployment_request",
    companyName: "ACME",
    firstName: "Jean",
    lastName: "Martin",
    role: "COO",
    email: "jean@acme.fr",
    phone: "+33612345678",
    subject: "Preuve sur historique offerte",
    message: "Bonjour, nous voulons cadrer un pilote.",
    consent: true,
    sourceIp: "203.0.113.10",
    metadataJson: {
      source: "landing-contact-form",
      submittedAt: "2026-03-06T10:00:00.000Z",
    },
  };
}

describe("POST /api/v1/public/contact-requests", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("accepts a valid ingest payload", async () => {
    vi.stubEnv("CONTACT_API_INGEST_TOKEN", "test-token");
    const { POST } = await import("../route");

    const response = (await POST(makeRequest(validPayload()))) as unknown as {
      status: number;
      body: { id: string; status: string };
      headers: Headers;
    };

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: "contact-ingest-req-123",
      status: "received",
    });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("rejects invalid payload shapes", async () => {
    vi.stubEnv("CONTACT_API_INGEST_TOKEN", "test-token");
    const { POST } = await import("../route");

    const response = (await POST(
      makeRequest({ ...validPayload(), metadataJson: ["boom"] }),
    )) as unknown as {
      status: number;
      body: { error: string };
    };

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Invalid payload." });
  });

  it("rejects emails with reserved placeholder domains", async () => {
    vi.stubEnv("CONTACT_API_INGEST_TOKEN", "test-token");
    const { POST } = await import("../route");

    const response = (await POST(
      makeRequest({ ...validPayload(), email: "jean@example.com" }),
    )) as unknown as {
      status: number;
      body: { error: string };
    };

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Invalid payload." });
  });

  it("rejects invalid ingest tokens", async () => {
    vi.stubEnv("CONTACT_API_INGEST_TOKEN", "expected-token");
    const { POST } = await import("../route");

    const response = (await POST(
      makeRequest(validPayload(), { token: "wrong-token" }),
    )) as unknown as {
      status: number;
      body: { error: string };
    };

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Unauthorized." });
  });

  it("rejects payloads that exceed the configured limit", async () => {
    vi.stubEnv("CONTACT_API_INGEST_TOKEN", "test-token");
    const { POST } = await import("../route");

    const response = (await POST(
      makeRequest("x".repeat(20_100)),
    )) as unknown as {
      status: number;
      body: { error: string };
    };

    expect(response.status).toBe(413);
    expect(response.body).toEqual({ error: "Payload too large." });
  });
});
