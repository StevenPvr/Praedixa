import { beforeEach, describe, expect, it, vi } from "vitest";
import { createContactChallenge } from "../../../../lib/security/contact-challenge";

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
  const challenge = createContactChallenge(Date.now() - 5_000);
  if (!challenge) {
    throw new Error("Unable to create contact challenge in tests");
  }

  return {
    locale: "fr",
    intent: "deployment",
    companyName: "ACME Corp",
    role: "COO",
    email: "jean@acme.fr",
    siteCount: "11-30",
    sector: "Logistique / Transport / Retail",
    mainTradeOff: "Reallocation inter-sites avant pic de charge",
    timeline: "0-3 mois",
    currentStack: "ERP + BI",
    message: "Contexte additionnel pour qualifier la demande.",
    consent: true,
    website: "",
    challengeToken: challenge.challengeToken,
    captchaAnswer: challenge.captchaA + challenge.captchaB,
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
  let POST: (
    request: Request,
  ) => Promise<{ status: number; body: unknown; headers: Headers }>;

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
    expect(response.headers.get("Cache-Control")).toBe("no-store");
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
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns 403 when a trusted production origin arrives as cross-site", async () => {
    const request = makeRequest(validBody(), {
      host: "www.praedixa.com",
      origin: "https://www.praedixa.com",
      "sec-fetch-site": "cross-site",
    });

    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: "Origine de requête non autorisée.",
    });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns 403 when source headers are missing", async () => {
    const request = makeRequest(validBody());

    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: "Origine de requête non autorisée.",
    });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns 200 silently when honeypot field is filled", async () => {
    const request = makeRequest(
      validBody({ website: "https://spam.example" }),
      { origin: "http://localhost:3000" },
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns 400 when captcha answer is invalid", async () => {
    const body = validBody();
    const request = makeRequest(
      { ...body, captchaAnswer: body.captchaAnswer + 1 },
      {
        origin: "http://localhost:3000",
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Test anti-spam invalide." });
  });

  it("returns 400 when form was submitted too quickly", async () => {
    const challenge = createContactChallenge(Date.now() - 100);
    if (!challenge) throw new Error("Unable to create fast challenge");

    const request = makeRequest(
      validBody({
        challengeToken: challenge.challengeToken,
        captchaAnswer: challenge.captchaA + challenge.captchaB,
      }),
      { origin: "http://localhost:3000" },
    );

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Test anti-spam invalide." });
  });

  it("returns 400 when form is older than allowed window", async () => {
    const challenge = createContactChallenge(Date.now() - 1000 * 60 * 60 * 5);
    if (!challenge) throw new Error("Unable to create expired challenge");

    const request = makeRequest(
      validBody({
        challengeToken: challenge.challengeToken,
        captchaAnswer: challenge.captchaA + challenge.captchaB,
      }),
      { origin: "http://localhost:3000" },
    );

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Test anti-spam invalide." });
  });

  it("returns 415 when content-type is not application/json", async () => {
    const request = new Request("http://localhost:3000/api/contact", {
      method: "POST",
      headers: {
        "content-type": "text/plain",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify(validBody()),
    });

    const response = await POST(request);

    expect(response.status).toBe(415);
    expect(response.body).toEqual({ error: "Content-Type non supporte." });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
