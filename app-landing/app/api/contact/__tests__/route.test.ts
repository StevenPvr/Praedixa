import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      body,
      json: () => Promise.resolve(body),
    }),
  },
}));

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    locale: "fr",
    requestType: "founding_pilot",
    companyName: "ACME Corp",
    firstName: "Jean",
    lastName: "Martin",
    role: "COO",
    email: "jean@acme.fr",
    phone: "+33 6 12 34 56 78",
    subject: "Demande de contact",
    message: "Bonjour, ceci est un message de test suffisamment long.",
    consent: true,
    website: "",
    captchaA: 2,
    captchaB: 3,
    captchaAnswer: 5,
    formStartedAt: Date.now() - 5_000,
    ...overrides,
  };
}

function makeRequest(
  body: unknown,
  headers: Record<string, string> = {},
): Request {
  const json = typeof body === "string" ? body : JSON.stringify(body);

  return new Request("http://localhost:3000/api/contact", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "content-length": String(new TextEncoder().encode(json).length),
      ...headers,
    },
    body: json,
  });
}

describe("POST /api/contact", () => {
  let POST: (request: Request) => Promise<{ status: number; body: unknown }>;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("../route");
    POST = mod.POST as unknown as typeof POST;
  });

  it("returns 403 when origin host is not trusted", async () => {
    const request = makeRequest(validBody(), {
      origin: "https://evil.example",
    });

    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: "Origine de requête non autorisée.",
    });
  });

  it("returns 403 when sec-fetch-site is cross-site", async () => {
    const request = makeRequest(validBody(), {
      "sec-fetch-site": "cross-site",
    });

    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: "Origine de requête non autorisée.",
    });
  });

  it("returns 200 silently when honeypot field is filled", async () => {
    const request = makeRequest(
      validBody({ website: "https://spam.example" }),
      { origin: "http://localhost:3000" },
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
  });

  it("returns 400 when captcha answer is invalid", async () => {
    const request = makeRequest(validBody({ captchaAnswer: 8 }), {
      origin: "http://localhost:3000",
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Test anti-spam invalide." });
  });

  it("returns 400 when form was submitted too quickly", async () => {
    const request = makeRequest(
      validBody({ formStartedAt: Date.now() - 100 }),
      {
        origin: "http://localhost:3000",
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Test anti-spam invalide." });
  });

  it("returns 400 when form is older than allowed window", async () => {
    const request = makeRequest(
      validBody({ formStartedAt: Date.now() - 1000 * 60 * 60 * 5 }),
      { origin: "http://localhost:3000" },
    );

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Test anti-spam invalide." });
  });
});
