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

describe("GET /api/contact/challenge", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("returns a signed captcha challenge", async () => {
    const { GET } = await import("../route");
    const response = (await GET()) as unknown as {
      status: number;
      json: () => Promise<{
        captchaA: number;
        captchaB: number;
        challengeToken: string;
      }>;
      headers: Headers;
    };
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(typeof body.captchaA).toBe("number");
    expect(typeof body.captchaB).toBe("number");
    expect(typeof body.challengeToken).toBe("string");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns 503 when no challenge secret is available in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CONTACT_FORM_CHALLENGE_SECRET", "");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("CONTACT_API_INGEST_TOKEN", "");

    const { GET } = await import("../route");
    const response = (await GET()) as unknown as {
      status: number;
      json: () => Promise<{ error: string }>;
    };
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({ error: "Challenge indisponible." });
  });
});
