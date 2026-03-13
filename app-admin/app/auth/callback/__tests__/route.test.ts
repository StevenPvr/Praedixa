import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRedirect = vi.fn();

const mockClearAuthCookies = vi.fn();
const mockBuildSessionData = vi.fn();
const mockConsumeRateLimit = vi.fn();
const mockExchangeCodeForTokens = vi.fn();
const mockGetOidcEnv = vi.fn();
const mockHasRequiredAdminMfa = vi.fn();
const mockIsAccessTokenCompatible = vi.fn();
const mockGetTokenExp = vi.fn();
const mockResolveAuthAppOrigin = vi.fn();
const mockSanitizeNextPath = vi.fn();
const mockSetAuthCookies = vi.fn();
const mockSignSession = vi.fn();
const mockTimingSafeEqual = vi.fn();
const mockUserFromAccessToken = vi.fn();

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
      headers: {
        set: vi.fn(),
      },
      cookies: {
        delete: vi.fn(),
        set: vi.fn(),
      },
    }),
    redirect: (...args: unknown[]) => mockRedirect(...args),
  },
}));

vi.mock("@/lib/security/rate-limit", () => ({
  consumeRateLimit: (...args: unknown[]) => mockConsumeRateLimit(...args),
}));

vi.mock("@/lib/auth/oidc", () => ({
  LOGIN_NEXT_COOKIE: "prx_admin_next",
  LOGIN_STATE_COOKIE: "prx_admin_state",
  LOGIN_VERIFIER_COOKIE: "prx_admin_verifier",
  buildSessionData: (...args: unknown[]) => mockBuildSessionData(...args),
  clearAuthCookies: (...args: unknown[]) => mockClearAuthCookies(...args),
  exchangeCodeForTokens: (...args: unknown[]) =>
    mockExchangeCodeForTokens(...args),
  getOidcEnv: (...args: unknown[]) => mockGetOidcEnv(...args),
  hasRequiredAdminMfa: (...args: unknown[]) => mockHasRequiredAdminMfa(...args),
  isAccessTokenCompatible: (...args: unknown[]) =>
    mockIsAccessTokenCompatible(...args),
  getTokenExp: (...args: unknown[]) => mockGetTokenExp(...args),
  resolveAuthAppOrigin: (...args: unknown[]) =>
    mockResolveAuthAppOrigin(...args),
  sanitizeNextPath: (...args: unknown[]) => mockSanitizeNextPath(...args),
  setAuthCookies: (...args: unknown[]) => mockSetAuthCookies(...args),
  signSession: (...args: unknown[]) => mockSignSession(...args),
  timingSafeEqual: (...args: unknown[]) => mockTimingSafeEqual(...args),
  userFromAccessToken: (...args: unknown[]) => mockUserFromAccessToken(...args),
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

function createMockRequest(
  query: Record<string, string>,
  cookieValues: Record<string, string> = {},
) {
  const url = new URL("/auth/callback", "https://admin.praedixa.com");
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

describe("GET /auth/callback (admin)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockRedirect.mockImplementation((url: string | URL) =>
      createRedirectResponse(url),
    );

    mockGetOidcEnv.mockReturnValue({
      issuerUrl: "https://sso.praedixa.com",
      clientId: "admin-client",
      clientSecret: "secret",
      sessionSecret: "session-secret",
    });
    mockConsumeRateLimit.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 0,
      remaining: 29,
      resetAtEpochSeconds: 2_000_000_000,
    });
    mockResolveAuthAppOrigin.mockReturnValue("https://admin.praedixa.com");

    mockSanitizeNextPath.mockImplementation(
      (next: string | null | undefined, fallback: string) => {
        if (!next || !next.startsWith("/") || next.startsWith("//")) {
          return fallback;
        }
        return next;
      },
    );

    mockExchangeCodeForTokens.mockResolvedValue({
      access_token: "access-token",
      refresh_token: "refresh-token",
      expires_in: 900,
      refresh_expires_in: 7200,
    });
    mockHasRequiredAdminMfa.mockReturnValue(true);
    mockIsAccessTokenCompatible.mockReturnValue(true);
    mockBuildSessionData.mockResolvedValue({
      sub: "admin-1",
      email: "admin@praedixa.com",
      role: "super_admin",
      permissions: ["admin:console:access"],
      organizationId: "org-1",
      siteId: "site-1",
      accessTokenExp: 2000000000,
      issuedAt: Math.floor(Date.now() / 1000),
      sessionExpiresAt: Math.floor(Date.now() / 1000) + 7200,
      accessTokenHash: "hash-access",
      refreshTokenHash: "hash-refresh",
    });
    mockUserFromAccessToken.mockReturnValue({
      id: "admin-1",
      email: "admin@praedixa.com",
      role: "super_admin",
      permissions: ["admin:console:access"],
      organizationId: "org-1",
      siteId: "site-1",
    });
    mockGetTokenExp.mockReturnValue(2000000000);
    mockSignSession.mockResolvedValue("signed-session");
    mockTimingSafeEqual.mockImplementation((a: string, b: string) => a === b);
  });

  it("redirects to sanitized next path after successful callback", async () => {
    const response = (await GET(
      createMockRequest(
        { code: "valid-code", state: "state-123" },
        {
          prx_admin_state: "state-123",
          prx_admin_verifier: "verifier-123",
          prx_admin_next: "/clients",
        },
      ),
    )) as { redirectUrl: string };

    expect(response.redirectUrl).toBe("https://admin.praedixa.com/clients");
    expect(mockExchangeCodeForTokens).toHaveBeenCalled();
    expect(mockSetAuthCookies).toHaveBeenCalled();
    expect(
      (response as { headers: { set: ReturnType<typeof vi.fn> } }).headers.set,
    ).toHaveBeenCalledWith("Cache-Control", "no-store");
    expect(
      (response as { headers: { set: ReturnType<typeof vi.fn> } }).headers.set,
    ).toHaveBeenCalledWith("X-RateLimit-Limit", "30");
    expect(
      (response as { headers: { set: ReturnType<typeof vi.fn> } }).headers.set,
    ).toHaveBeenCalledWith("X-RateLimit-Remaining", "29");
  });

  it("redirects to /login with callback error when params are invalid", async () => {
    const response = (await GET(
      createMockRequest(
        { state: "state-123" },
        {
          prx_admin_state: "state-123",
          prx_admin_verifier: "verifier-123",
        },
      ),
    )) as { redirectUrl: string };

    expect(response.redirectUrl).toBe(
      "https://admin.praedixa.com/login?error=auth_callback_failed",
    );
    expect(mockClearAuthCookies).toHaveBeenCalled();
    expect(
      (response as { headers: { set: ReturnType<typeof vi.fn> } }).headers.set,
    ).toHaveBeenCalledWith("Cache-Control", "no-store");
  });

  it("rejects mismatched state", async () => {
    const response = (await GET(
      createMockRequest(
        { code: "valid-code", state: "state-returned" },
        {
          prx_admin_state: "state-stored",
          prx_admin_verifier: "verifier-123",
          prx_admin_next: "/clients",
        },
      ),
    )) as { redirectUrl: string };

    expect(response.redirectUrl).toBe(
      "https://admin.praedixa.com/login?error=auth_callback_failed",
    );
    expect(mockExchangeCodeForTokens).not.toHaveBeenCalled();
    expect(
      (response as { headers: { set: ReturnType<typeof vi.fn> } }).headers.set,
    ).toHaveBeenCalledWith("Cache-Control", "no-store");
  });

  it("sanitizes unsafe next cookie to /", async () => {
    const response = (await GET(
      createMockRequest(
        { code: "valid-code", state: "state-123" },
        {
          prx_admin_state: "state-123",
          prx_admin_verifier: "verifier-123",
          prx_admin_next: "//evil.com",
        },
      ),
    )) as { redirectUrl: string };

    expect(response.redirectUrl).toBe("https://admin.praedixa.com/");
    expect(
      (response as { headers: { set: ReturnType<typeof vi.fn> } }).headers.set,
    ).toHaveBeenCalledWith("Cache-Control", "no-store");
  });

  it("redirects users without explicit admin console permission to /unauthorized", async () => {
    mockUserFromAccessToken.mockReturnValueOnce({
      id: "u1",
      email: "admin@praedixa.com",
      role: "super_admin",
      permissions: [],
      organizationId: "global-super-admin",
      siteId: null,
    });

    const response = (await GET(
      createMockRequest(
        { code: "valid-code", state: "state-123" },
        {
          prx_admin_state: "state-123",
          prx_admin_verifier: "verifier-123",
          prx_admin_next: "/clients",
        },
      ),
    )) as { redirectUrl: string };

    expect(response.redirectUrl).toBe(
      "https://admin.praedixa.com/unauthorized",
    );
    expect(
      (response as { headers: { set: ReturnType<typeof vi.fn> } }).headers.set,
    ).toHaveBeenCalledWith("Cache-Control", "no-store");
  });

  it("rejects access tokens that do not match the expected OIDC contract", async () => {
    mockIsAccessTokenCompatible.mockReturnValueOnce(false);

    const response = (await GET(
      createMockRequest(
        { code: "valid-code", state: "state-123" },
        {
          prx_admin_state: "state-123",
          prx_admin_verifier: "verifier-123",
          prx_admin_next: "/clients",
        },
      ),
    )) as { redirectUrl: string };

    expect(response.redirectUrl).toBe(
      "https://admin.praedixa.com/login?error=auth_callback_failed",
    );
    expect(mockSetAuthCookies).not.toHaveBeenCalled();
    expect(
      (response as { headers: { set: ReturnType<typeof vi.fn> } }).headers.set,
    ).toHaveBeenCalledWith("Cache-Control", "no-store");
  });

  it("redirects to login with admin_mfa_required when the token lacks MFA evidence", async () => {
    mockHasRequiredAdminMfa.mockReturnValueOnce(false);

    const response = (await GET(
      createMockRequest(
        { code: "valid-code", state: "state-123" },
        {
          prx_admin_state: "state-123",
          prx_admin_verifier: "verifier-123",
          prx_admin_next: "/clients",
        },
      ),
    )) as { redirectUrl: string };

    expect(response.redirectUrl).toBe(
      "https://admin.praedixa.com/login?error=admin_mfa_required",
    );
    expect(mockSetAuthCookies).not.toHaveBeenCalled();
    expect(
      (response as { headers: { set: ReturnType<typeof vi.fn> } }).headers.set,
    ).toHaveBeenCalledWith("Cache-Control", "no-store");
  });

  it("accepts delegated admin permission without super_admin role", async () => {
    mockUserFromAccessToken.mockReturnValueOnce({
      id: "u2",
      email: "delegate@praedixa.com",
      role: "viewer",
      permissions: ["admin:console:access"],
      organizationId: "org-1",
      siteId: "site-1",
    });

    const response = (await GET(
      createMockRequest(
        { code: "valid-code", state: "state-123" },
        {
          prx_admin_state: "state-123",
          prx_admin_verifier: "verifier-123",
          prx_admin_next: "/clients",
        },
      ),
    )) as { redirectUrl: string };

    expect(response.redirectUrl).toBe("https://admin.praedixa.com/clients");
    expect(
      (response as { headers: { set: ReturnType<typeof vi.fn> } }).headers.set,
    ).toHaveBeenCalledWith("Cache-Control", "no-store");
  });

  it("fails closed with a 500 when the public auth origin cannot be resolved", async () => {
    mockResolveAuthAppOrigin.mockImplementationOnce(() => {
      throw new Error("Missing AUTH_APP_ORIGIN");
    });

    const response = (await GET(
      createMockRequest(
        { code: "valid-code", state: "state-123" },
        {
          prx_admin_state: "state-123",
          prx_admin_verifier: "verifier-123",
        },
      ),
    )) as {
      body: { error: string };
      status: number;
      headers: { set: ReturnType<typeof vi.fn> };
    };

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "oidc_config_missing" });
    expect(mockExchangeCodeForTokens).not.toHaveBeenCalled();
    expect(mockClearAuthCookies).toHaveBeenCalled();
    expect(response.headers.set).toHaveBeenCalledWith(
      "Cache-Control",
      "no-store",
    );
    expect(response.headers.set).toHaveBeenCalledWith(
      "X-RateLimit-Limit",
      "30",
    );
  });

  it("rate limits the callback before exchanging tokens", async () => {
    mockConsumeRateLimit.mockResolvedValueOnce({
      allowed: false,
      retryAfterSeconds: 60,
      remaining: 0,
      resetAtEpochSeconds: 2_000_000_060,
    });

    const response = (await GET(
      createMockRequest(
        { code: "valid-code", state: "state-123" },
        {
          prx_admin_state: "state-123",
          prx_admin_verifier: "verifier-123",
        },
      ),
    )) as { redirectUrl: string; headers: { set: ReturnType<typeof vi.fn> } };

    expect(response.redirectUrl).toBe(
      "https://admin.praedixa.com/login?error=rate_limited",
    );
    expect(mockExchangeCodeForTokens).not.toHaveBeenCalled();
    expect(response.headers.set).toHaveBeenCalledWith(
      "X-RateLimit-Limit",
      "30",
    );
    expect(response.headers.set).toHaveBeenCalledWith(
      "X-RateLimit-Remaining",
      "0",
    );
    expect(response.headers.set).toHaveBeenCalledWith("Retry-After", "60");
  });
});
