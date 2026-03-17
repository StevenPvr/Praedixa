import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRedirect = vi.fn();
const mockJson = vi.fn();

const mockClearAuthCookies = vi.fn();
const mockBuildSessionData = vi.fn();
const mockExchangeCodeForTokens = vi.fn();
const mockGetAccessTokenClaimsIssue = vi.fn();
const mockGetApiAccessTokenCompatibilityReason = vi.fn();
const mockGetOidcEnv = vi.fn();
const mockGetTokenExp = vi.fn();
const mockSanitizeNextPath = vi.fn();
const mockSetAuthCookies = vi.fn();
const mockSignSession = vi.fn();
const mockTimingSafeEqual = vi.fn();
const mockUserFromAccessToken = vi.fn();
const mockResolveAuthAppOrigin = vi.fn();
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
  buildSessionData: (...args: unknown[]) => mockBuildSessionData(...args),
  clearAuthCookies: (...args: unknown[]) => mockClearAuthCookies(...args),
  exchangeCodeForTokens: (...args: unknown[]) =>
    mockExchangeCodeForTokens(...args),
  getAccessTokenClaimsIssue: (...args: unknown[]) =>
    mockGetAccessTokenClaimsIssue(...args),
  getApiAccessTokenCompatibilityReason: (...args: unknown[]) =>
    mockGetApiAccessTokenCompatibilityReason(...args),
  getOidcEnv: (...args: unknown[]) => mockGetOidcEnv(...args),
  getTokenExp: (...args: unknown[]) => mockGetTokenExp(...args),
  sanitizeNextPath: (...args: unknown[]) => mockSanitizeNextPath(...args),
  setAuthCookies: (...args: unknown[]) => mockSetAuthCookies(...args),
  signSession: (...args: unknown[]) => mockSignSession(...args),
  timingSafeEqual: (...args: unknown[]) => mockTimingSafeEqual(...args),
  userFromAccessToken: (...args: unknown[]) => mockUserFromAccessToken(...args),
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
      delete: vi.fn(),
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

function createMockRequest(
  query: Record<string, string>,
  cookieValues: Record<string, string> = {},
) {
  const url = new URL("/auth/callback", "https://app.praedixa.com");
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }

  return {
    nextUrl: {
      origin: url.origin,
      searchParams: url.searchParams,
    },
    cookies: {
      get: (name: string) => {
        const value = cookieValues[name];
        return value ? { name, value } : undefined;
      },
    },
  } as Parameters<typeof GET>[0];
}

describe("GET /auth/callback (webapp)", () => {
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
      clientSecret: "secret",
      sessionSecret: "session-secret",
    });
    mockResolveAuthAppOrigin.mockReturnValue("https://app.praedixa.com");

    mockSanitizeNextPath.mockImplementation(
      (next: string | null | undefined, fallback: string) => {
        if (!next || !next.startsWith("/") || next.startsWith("//")) {
          return fallback;
        }
        return next;
      },
    );
    mockTimingSafeEqual.mockImplementation(
      (left: string, right: string) => left === right,
    );

    mockExchangeCodeForTokens.mockResolvedValue({
      access_token: "access-token",
      refresh_token: "refresh-token",
      expires_in: 900,
      refresh_expires_in: 7200,
    });
    mockGetAccessTokenClaimsIssue.mockReturnValue("missing_role");
    mockConsumeRateLimit.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 0,
      remaining: 29,
      resetAtEpochSeconds: 2_000_000_000,
    });
    mockUserFromAccessToken.mockReturnValue({
      id: "user-1",
      email: "ops@praedixa.com",
      role: "org_admin",
      organizationId: "org-1",
      siteId: "site-1",
    });
    mockGetApiAccessTokenCompatibilityReason.mockReturnValue(null);
    mockGetTokenExp.mockReturnValue(2000000000);
    mockBuildSessionData.mockResolvedValue({
      sub: "user-1",
      email: "ops@praedixa.com",
      role: "org_admin",
      organizationId: "org-1",
      siteId: "site-1",
      accessTokenExp: 2000000000,
      issuedAt: 1700000000,
      sessionExpiresAt: 1700007200,
      accessTokenHash: "hash-access",
      refreshTokenHash: "hash-refresh",
    });
    mockSignSession.mockResolvedValue("signed-session");
  });

  it("fails closed with 500 when no explicit public auth origin can be resolved", async () => {
    mockResolveAuthAppOrigin.mockImplementationOnce(() => {
      throw new Error(
        "Missing AUTH_APP_ORIGIN (or NEXT_PUBLIC_APP_ORIGIN) for production auth redirects",
      );
    });

    const response = (await GET(
      createMockRequest({ code: "valid-code", state: "state-123" }),
    )) as {
      body: { error: string };
      status: number;
    };

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "oidc_config_missing" });
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("redirects to sanitized next path after successful callback", async () => {
    const response = (await GET(
      createMockRequest(
        { code: "valid-code", state: "state-123" },
        {
          prx_web_state: "state-123",
          prx_web_verifier: "verifier-123",
          prx_web_next: "/previsions",
        },
      ),
    )) as { redirectUrl: string };

    expect(response.redirectUrl).toBe("https://app.praedixa.com/previsions");
    expect(mockExchangeCodeForTokens).toHaveBeenCalled();
    expect(mockSetAuthCookies).toHaveBeenCalled();
  });

  it("uses the configured public auth origin for token exchange and redirects", async () => {
    mockResolveAuthAppOrigin.mockReturnValueOnce("https://app.praedixa.com");

    await GET({
      nextUrl: {
        origin: "http://internal-webapp:3001",
        searchParams: new URLSearchParams("code=valid-code&state=state-123"),
      },
      cookies: {
        get: (name: string) => {
          const values: Record<string, string> = {
            prx_web_state: "state-123",
            prx_web_verifier: "verifier-123",
            prx_web_next: "/dashboard",
          };
          const value = values[name];
          return value ? { name, value } : undefined;
        },
      },
    } as Parameters<typeof GET>[0]);

    expect(mockExchangeCodeForTokens).toHaveBeenCalledWith(
      expect.objectContaining({
        redirectUri: "https://app.praedixa.com/auth/callback",
      }),
    );
  });

  it("redirects to /login with callback error when params are invalid", async () => {
    const response = (await GET(
      createMockRequest(
        { state: "state-123" },
        {
          prx_web_state: "state-123",
          prx_web_verifier: "verifier-123",
        },
      ),
    )) as { redirectUrl: string };

    expect(response.redirectUrl).toBe(
      "https://app.praedixa.com/login?error=auth_callback_failed",
    );
    expect(mockClearAuthCookies).toHaveBeenCalled();
  });

  it("rejects callback when state token does not match", async () => {
    mockTimingSafeEqual.mockReturnValueOnce(false);

    const response = (await GET(
      createMockRequest(
        { code: "valid-code", state: "unexpected-state" },
        {
          prx_web_state: "state-123",
          prx_web_verifier: "verifier-123",
          prx_web_next: "/dashboard",
        },
      ),
    )) as { redirectUrl: string };

    expect(response.redirectUrl).toBe(
      "https://app.praedixa.com/login?error=auth_callback_failed",
    );
  });

  it("rejects super_admin with wrong_role", async () => {
    mockUserFromAccessToken.mockReturnValueOnce({
      id: "admin-1",
      email: "admin@praedixa.com",
      role: "super_admin",
      organizationId: "org-1",
      siteId: "site-1",
    });

    const response = (await GET(
      createMockRequest(
        { code: "valid-code", state: "state-123" },
        {
          prx_web_state: "state-123",
          prx_web_verifier: "verifier-123",
          prx_web_next: "/dashboard",
        },
      ),
    )) as { redirectUrl: string };

    expect(response.redirectUrl).toBe(
      "https://app.praedixa.com/login?error=wrong_role",
    );
  });

  it("returns auth_claims_invalid when claims cannot be extracted", async () => {
    mockUserFromAccessToken.mockReturnValueOnce(null);

    const response = (await GET(
      createMockRequest(
        { code: "valid-code", state: "state-123" },
        {
          prx_web_state: "state-123",
          prx_web_verifier: "verifier-123",
          prx_web_next: "/dashboard",
        },
      ),
    )) as { redirectUrl: string };

    expect(response.redirectUrl).toBe(
      "https://app.praedixa.com/login?error=auth_claims_invalid&token_reason=missing_role",
    );
  });

  it("returns auth_token_incompatible when the access token cannot be used against the API", async () => {
    mockGetApiAccessTokenCompatibilityReason.mockReturnValueOnce(
      "missing_api_audience",
    );

    const response = (await GET(
      createMockRequest(
        { code: "valid-code", state: "state-123" },
        {
          prx_web_state: "state-123",
          prx_web_verifier: "verifier-123",
          prx_web_next: "/dashboard",
        },
      ),
    )) as { redirectUrl: string };

    expect(response.redirectUrl).toBe(
      "https://app.praedixa.com/login?error=auth_token_incompatible&token_reason=missing_api_audience",
    );
  });

  it("sanitizes unsafe next cookie to /dashboard", async () => {
    const response = (await GET(
      createMockRequest(
        { code: "valid-code", state: "state-123" },
        {
          prx_web_state: "state-123",
          prx_web_verifier: "verifier-123",
          prx_web_next: "//evil.com",
        },
      ),
    )) as { redirectUrl: string };

    expect(response.redirectUrl).toBe("https://app.praedixa.com/dashboard");
  });

  it("redirects to /login with rate_limited when callback attempts are throttled", async () => {
    mockConsumeRateLimit.mockResolvedValueOnce({
      allowed: false,
      retryAfterSeconds: 90,
      remaining: 0,
      resetAtEpochSeconds: 2_000_000_000,
    });

    const response = (await GET(
      createMockRequest(
        { code: "valid-code", state: "state-123" },
        {
          prx_web_state: "state-123",
          prx_web_verifier: "verifier-123",
          prx_web_next: "/dashboard",
        },
      ),
    )) as {
      redirectUrl: string;
      headers: { set: ReturnType<typeof vi.fn> };
    };
    expect(response.redirectUrl).toBe(
      "https://app.praedixa.com/login?error=rate_limited",
    );
    expect(response.headers.set).toHaveBeenCalledWith("Retry-After", "90");
  });
});
