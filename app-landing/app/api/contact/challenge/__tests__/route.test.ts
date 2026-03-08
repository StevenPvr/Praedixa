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
    const response = (await GET(
      new Request("http://localhost:3000/api/contact/challenge", {
        headers: {
          "cf-connecting-ip": "127.0.0.1",
          "user-agent": "Vitest",
        },
      }),
    )) as unknown as {
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
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  });

  it("returns 503 when no dedicated challenge secret is available in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CONTACT_FORM_CHALLENGE_SECRET", "");
    vi.stubEnv("RESEND_API_KEY", "re_live_should_not_be_reused");
    vi.stubEnv("CONTACT_API_INGEST_TOKEN", "ingest_token_should_not_be_reused");

    const { GET } = await import("../route");
    const response = (await GET(
      new Request("https://www.praedixa.com/api/contact/challenge", {
        headers: {
          "cf-connecting-ip": "203.0.113.5",
          "user-agent": "Vitest",
        },
      }),
    )) as unknown as {
      status: number;
      json: () => Promise<{ error: string }>;
    };
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({ error: "Challenge indisponible." });
  });
});
