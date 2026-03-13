import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRedirect = vi.fn();
const mockJson = vi.fn();

const mockCreatePkceChallenge = vi.fn();
const mockCreateRandomToken = vi.fn();
const mockGetOidcEnv = vi.fn();
const mockGetTrustedOidcEndpoints = vi.fn();
const mockIsInsecureOidcEnvError = vi.fn();
const mockIsMissingOidcEnvError = vi.fn();
const mockResolveAuthAppOrigin = vi.fn();
const mockSanitizeNextPath = vi.fn();
const mockSecureCookie = vi.fn();
const mockConsumeRateLimit = vi.fn();

vi.mock("next/server", () => ({
  NextResponse: {
    redirect: (...args: unknown[]) => mockRedirect(...args),
    json: (...args: unknown[]) => mockJson(...args),
  },
}));

vi.mock("@/lib/auth/oidc", () => ({
  LOGIN_NEXT_COOKIE: "prx_web_next",
  LOGIN_STATE_COOKIE: "prx_web_state",
  LOGIN_VERIFIER_COOKIE: "prx_web_verifier",
  createPkceChallenge: (...args: unknown[]) => mockCreatePkceChallenge(...args),
  createRandomToken: (...args: unknown[]) => mockCreateRandomToken(...args),
  getOidcEnv: (...args: unknown[]) => mockGetOidcEnv(...args),
  getTrustedOidcEndpoints: (...args: unknown[]) =>
    mockGetTrustedOidcEndpoints(...args),
  isInsecureOidcEnvError: (...args: unknown[]) =>
    mockIsInsecureOidcEnvError(...args),
  isMissingOidcEnvError: (...args: unknown[]) =>
    mockIsMissingOidcEnvError(...args),
  sanitizeNextPath: (...args: unknown[]) => mockSanitizeNextPath(...args),
  secureCookie: (...args: unknown[]) => mockSecureCookie(...args),
}));

vi.mock("@/lib/auth/origin", () => ({
  resolveAuthAppOrigin: (...args: unknown[]) =>
    mockResolveAuthAppOrigin(...args),
}));

vi.mock("@/lib/auth/rate-limit", () => ({
  consumeRateLimit: (...args: unknown[]) => mockConsumeRateLimit(...args),
}));

import { GET } from "../route";

function createRedirectResponse(url: string | URL) {
  return {
    status: 302,
    redirectUrl: typeof url === "string" ? url : url.toString(),
    headers: {
      set: vi.fn(),
    },
    cookies: {
      set: vi.fn(),
    },
  };
}

function createJsonResponse(body: unknown, init?: { status?: number }) {
  return {
    body,
    status: init?.status ?? 200,
    headers: {
      set: vi.fn(),
    },
  };
}

function createMockRequest(query: Record<string, string> = {}) {
  const url = new URL("/auth/login", "https://app.praedixa.com");
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }

  return {
    nextUrl: {
      origin: url.origin,
      searchParams: url.searchParams,
    },
  } as Parameters<typeof GET>[0];
}

describe("GET /auth/login (webapp)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockRedirect.mockImplementation((url: string | URL) =>
      createRedirectResponse(url),
    );
    mockJson.mockImplementation((body: unknown, init?: { status?: number }) =>
      createJsonResponse(body, init),
    );
    mockGetOidcEnv.mockReturnValue({
      issuerUrl: "https://sso.praedixa.com",
      clientId: "web-client",
      scope: "openid profile email offline_access",
    });
    mockGetTrustedOidcEndpoints.mockResolvedValue({
      authorizationEndpoint:
        "https://sso.praedixa.com/protocol/openid-connect/auth",
      tokenEndpoint: "https://sso.praedixa.com/protocol/openid-connect/token",
    });
    mockIsInsecureOidcEnvError.mockReturnValue(false);
    mockIsMissingOidcEnvError.mockReturnValue(false);
    mockResolveAuthAppOrigin.mockReturnValue("https://app.praedixa.com");
    mockCreateRandomToken
      .mockReturnValueOnce("state-token")
      .mockReturnValueOnce("verifier-token");
    mockCreatePkceChallenge.mockResolvedValue("challenge-token");
    mockSanitizeNextPath.mockImplementation(
      (next: string | null | undefined, fallback: string) => {
        if (!next || !next.startsWith("/") || next.startsWith("//")) {
          return fallback;
        }
        return next;
      },
    );
    mockSecureCookie.mockReturnValue(false);
    mockConsumeRateLimit.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 0,
      remaining: 19,
      resetAtEpochSeconds: 2_000_000_000,
    });
  });

  it("redirects to OIDC authorization endpoint and sets login cookies", async () => {
    const response = (await GET(
      createMockRequest({ next: "/previsions", prompt: "login" }),
    )) as {
      redirectUrl: string;
      cookies: { set: ReturnType<typeof vi.fn> };
    };

    const redirectUrl = new URL(response.redirectUrl);
    expect(redirectUrl.origin + redirectUrl.pathname).toBe(
      "https://sso.praedixa.com/protocol/openid-connect/auth",
    );
    expect(redirectUrl.searchParams.get("client_id")).toBe("web-client");
    expect(redirectUrl.searchParams.get("response_type")).toBe("code");
    expect(redirectUrl.searchParams.get("prompt")).toBe("login");
    expect(redirectUrl.searchParams.get("state")).toBe("state-token");
    expect(redirectUrl.searchParams.get("code_challenge")).toBe(
      "challenge-token",
    );
    expect(redirectUrl.searchParams.get("redirect_uri")).toBe(
      "https://app.praedixa.com/auth/callback",
    );

    expect(response.cookies.set).toHaveBeenCalledWith(
      "prx_web_state",
      "state-token",
      expect.any(Object),
    );
    expect(response.cookies.set).toHaveBeenCalledWith(
      "prx_web_verifier",
      "verifier-token",
      expect.any(Object),
    );
    expect(response.cookies.set).toHaveBeenCalledWith(
      "prx_web_next",
      "/previsions",
      expect.any(Object),
    );
  });

  it("redirects to /login with oidc_config_missing when OIDC env is missing", async () => {
    mockGetOidcEnv.mockImplementationOnce(() => {
      throw new Error(
        "Missing OIDC env vars: AUTH_OIDC_ISSUER_URL, AUTH_OIDC_CLIENT_ID, AUTH_SESSION_SECRET",
      );
    });
    mockIsMissingOidcEnvError.mockReturnValueOnce(true);

    const response = (await GET(createMockRequest({ next: "/dashboard" }))) as {
      redirectUrl: string;
    };

    const redirectUrl = new URL(response.redirectUrl);
    expect(redirectUrl.origin + redirectUrl.pathname).toBe(
      "https://app.praedixa.com/login",
    );
    expect(redirectUrl.searchParams.get("error")).toBe("oidc_config_missing");
    expect(redirectUrl.searchParams.get("next")).toBe("/dashboard");
  });

  it("fails closed with 500 when no explicit public auth origin can be resolved", async () => {
    mockResolveAuthAppOrigin.mockImplementationOnce(() => {
      throw new Error(
        "Missing AUTH_APP_ORIGIN (or NEXT_PUBLIC_APP_ORIGIN) for production auth redirects",
      );
    });

    const response = (await GET(createMockRequest({ next: "/dashboard" }))) as {
      body: { error: string };
      status: number;
    };

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "oidc_config_missing" });
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("uses the configured public auth origin for redirect_uri generation", async () => {
    mockResolveAuthAppOrigin.mockReturnValueOnce("https://app.praedixa.com");

    const response = (await GET({
      nextUrl: {
        origin: "http://internal-webapp:3001",
        searchParams: new URLSearchParams("next=/dashboard"),
      },
    } as Parameters<typeof GET>[0])) as { redirectUrl: string };

    const redirectUrl = new URL(response.redirectUrl);
    expect(redirectUrl.searchParams.get("redirect_uri")).toBe(
      "https://app.praedixa.com/auth/callback",
    );
  });

  it("redirects to /login with oidc_provider_untrusted when discovery is invalid", async () => {
    mockGetTrustedOidcEndpoints.mockRejectedValueOnce(
      new Error("OIDC discovery request failed"),
    );
    mockIsMissingOidcEnvError.mockReturnValueOnce(false);

    const response = (await GET(createMockRequest({ next: "/dashboard" }))) as {
      redirectUrl: string;
    };

    const redirectUrl = new URL(response.redirectUrl);
    expect(redirectUrl.origin + redirectUrl.pathname).toBe(
      "https://app.praedixa.com/login",
    );
    expect(redirectUrl.searchParams.get("error")).toBe(
      "oidc_provider_untrusted",
    );
    expect(redirectUrl.searchParams.get("next")).toBe("/dashboard");
  });

  it("redirects to /login with oidc_config_insecure when session secret is weak", async () => {
    mockGetOidcEnv.mockImplementationOnce(() => {
      throw new Error(
        "Invalid AUTH_SESSION_SECRET: replace the placeholder with a unique random secret",
      );
    });
    mockIsMissingOidcEnvError.mockReturnValueOnce(false);
    mockIsInsecureOidcEnvError.mockReturnValueOnce(true);

    const response = (await GET(createMockRequest({ next: "/dashboard" }))) as {
      redirectUrl: string;
    };

    const redirectUrl = new URL(response.redirectUrl);
    expect(redirectUrl.origin + redirectUrl.pathname).toBe(
      "https://app.praedixa.com/login",
    );
    expect(redirectUrl.searchParams.get("error")).toBe("oidc_config_insecure");
    expect(redirectUrl.searchParams.get("next")).toBe("/dashboard");
  });

  it("redirects to /login with rate_limited when login attempts are throttled", async () => {
    mockConsumeRateLimit.mockResolvedValueOnce({
      allowed: false,
      retryAfterSeconds: 120,
      remaining: 0,
      resetAtEpochSeconds: 2_000_000_000,
    });

    const response = (await GET(createMockRequest({ next: "/dashboard" }))) as {
      redirectUrl: string;
      headers: { set: ReturnType<typeof vi.fn> };
    };
    const redirectUrl = new URL(response.redirectUrl);
    expect(redirectUrl.origin + redirectUrl.pathname).toBe(
      "https://app.praedixa.com/login",
    );
    expect(redirectUrl.searchParams.get("error")).toBe("rate_limited");
    expect(redirectUrl.searchParams.get("next")).toBe("/dashboard");
    expect(response.headers.set).toHaveBeenCalledWith("Retry-After", "120");
  });
});
