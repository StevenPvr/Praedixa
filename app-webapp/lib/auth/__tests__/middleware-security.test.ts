import { beforeEach, describe, expect, it, vi } from "vitest";

const mockNext = vi.fn();
const mockRedirect = vi.fn();

const mockVerifySession = vi.fn();
const mockIsTokenExpired = vi.fn();
const mockRefreshTokens = vi.fn();
const mockUserFromAccessToken = vi.fn();
const mockGetTokenExp = vi.fn();
const mockGetOidcEnv = vi.fn();
const mockSignSession = vi.fn();
const mockSetAuthCookies = vi.fn();
const mockClearAuthCookies = vi.fn();
const mockBuildSessionData = vi.fn();
const mockDoesSessionMatchAccessToken = vi.fn();
const mockDoesSessionMatchRefreshToken = vi.fn();
const mockGetApiAccessTokenCompatibilityReason = vi.fn();

vi.mock("next/server", () => ({
  NextResponse: {
    next: (...args: unknown[]) => mockNext(...args),
    redirect: (...args: unknown[]) => mockRedirect(...args),
  },
}));

vi.mock("@/lib/auth/oidc", () => ({
  ACCESS_TOKEN_COOKIE: "prx_web_at",
  REFRESH_TOKEN_COOKIE: "prx_web_rt",
  SESSION_COOKIE: "prx_web_sess",
  buildSessionData: (...args: unknown[]) => mockBuildSessionData(...args),
  clearAuthCookies: (...args: unknown[]) => mockClearAuthCookies(...args),
  doesSessionMatchAccessToken: (...args: unknown[]) =>
    mockDoesSessionMatchAccessToken(...args),
  doesSessionMatchRefreshToken: (...args: unknown[]) =>
    mockDoesSessionMatchRefreshToken(...args),
  getOidcEnv: (...args: unknown[]) => mockGetOidcEnv(...args),
  getApiAccessTokenCompatibilityReason: (...args: unknown[]) =>
    mockGetApiAccessTokenCompatibilityReason(...args),
  getTokenExp: (...args: unknown[]) => mockGetTokenExp(...args),
  isTokenExpired: (...args: unknown[]) => mockIsTokenExpired(...args),
  refreshTokens: (...args: unknown[]) => mockRefreshTokens(...args),
  setAuthCookies: (...args: unknown[]) => mockSetAuthCookies(...args),
  signSession: (...args: unknown[]) => mockSignSession(...args),
  userFromAccessToken: (...args: unknown[]) => mockUserFromAccessToken(...args),
  verifySession: (...args: unknown[]) => mockVerifySession(...args),
}));

import { updateSession } from "../middleware";

function createMockRequest(
  path: string,
  origin = "https://app.praedixa.com",
  cookies: Record<string, string> = {},
) {
  const url = new URL(path, origin);

  return {
    url: url.toString(),
    nextUrl: {
      pathname: url.pathname,
      searchParams: url.searchParams,
    },
    cookies: {
      get: (name: string) => {
        const value = cookies[name];
        return value ? { name, value } : undefined;
      },
    },
  } as Parameters<typeof updateSession>[0];
}

function createSession(role: string) {
  return {
    sub: "u1",
    email: "user@praedixa.com",
    role,
    organizationId: "org-1",
    siteId: "site-1",
    accessTokenExp: Math.floor(Date.now() / 1000) + 1800,
    issuedAt: Math.floor(Date.now() / 1000),
    sessionExpiresAt: Math.floor(Date.now() / 1000) + 3600,
    accessTokenHash: "access-hash",
    refreshTokenHash: "refresh-hash",
  };
}

describe("Auth middleware security", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockNext.mockReturnValue({
      status: 200,
      cookies: { set: vi.fn(), delete: vi.fn() },
    });
    mockRedirect.mockImplementation((url: URL) => ({
      status: 302,
      redirectUrl: url.toString(),
      cookies: { set: vi.fn(), delete: vi.fn() },
    }));

    mockVerifySession.mockResolvedValue(null);
    mockIsTokenExpired.mockReturnValue(false);
    mockRefreshTokens.mockResolvedValue(null);
    mockUserFromAccessToken.mockReturnValue(null);
    mockGetTokenExp.mockReturnValue(Math.floor(Date.now() / 1000) + 1800);
    mockBuildSessionData.mockImplementation((session) => session);
    mockDoesSessionMatchAccessToken.mockResolvedValue(true);
    mockDoesSessionMatchRefreshToken.mockResolvedValue(true);
    mockGetApiAccessTokenCompatibilityReason.mockReturnValue(null);
    mockGetOidcEnv.mockReturnValue({
      issuerUrl: "https://sso.praedixa.com",
      clientId: "web-client",
      clientSecret: "secret",
      sessionSecret: "session-secret",
    });
    mockSignSession.mockResolvedValue("signed-session");
  });

  it("redirect to /login keeps request origin", async () => {
    const result = await updateSession(
      createMockRequest("/dashboard", "https://app.praedixa.com"),
    );

    const redirectUrl = (result as { redirectUrl: string }).redirectUrl;
    const parsed = new URL(redirectUrl);
    expect(parsed.origin).toBe("https://app.praedixa.com");
    expect(parsed.pathname).toBe("/login");
  });

  it("redirect to /dashboard from /login keeps request origin", async () => {
    mockVerifySession.mockResolvedValue(createSession("org_admin"));

    const result = await updateSession(
      createMockRequest("/login", "https://app.praedixa.com", {
        prx_web_at: "access-token",
        prx_web_sess: "session-cookie",
      }),
    );

    const redirectUrl = (result as { redirectUrl: string }).redirectUrl;
    const parsed = new URL(redirectUrl);
    expect(parsed.origin).toBe("https://app.praedixa.com");
    expect(parsed.pathname).toBe("/dashboard");
  });

  it("rejects super_admin users from webapp protected routes", async () => {
    mockVerifySession.mockResolvedValue(createSession("super_admin"));

    const result = await updateSession(
      createMockRequest("/previsions", "https://app.praedixa.com", {
        prx_web_at: "access-token",
        prx_web_sess: "session-cookie",
      }),
    );

    expect((result as { redirectUrl: string }).redirectUrl).toBe(
      "https://app.praedixa.com/login",
    );
  });

  it("allows viewer access to /parametres", async () => {
    mockVerifySession.mockResolvedValue(createSession("viewer"));

    const result = await updateSession(
      createMockRequest("/parametres", "https://app.praedixa.com", {
        prx_web_at: "access-token",
        prx_web_sess: "session-cookie",
      }),
    );

    expect(result.status).toBe(200);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("allows org_admin access to /parametres", async () => {
    mockVerifySession.mockResolvedValue(createSession("org_admin"));

    const result = await updateSession(
      createMockRequest("/parametres", "https://app.praedixa.com", {
        prx_web_at: "access-token",
        prx_web_sess: "session-cookie",
      }),
    );

    expect(result.status).toBe(200);
  });

  it("keeps /auth/callback public", async () => {
    const result = await updateSession(
      createMockRequest("/auth/callback", "https://app.praedixa.com"),
    );

    expect(result.status).toBe(200);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("does not treat /login-admin as the login route", async () => {
    const result = await updateSession(
      createMockRequest("/login-admin", "https://app.praedixa.com"),
    );

    expect((result as { redirectUrl: string }).redirectUrl).toBe(
      "https://app.praedixa.com/login",
    );
  });

  it("treats refresh errors as unauthenticated", async () => {
    mockVerifySession.mockResolvedValue(createSession("org_admin"));
    mockIsTokenExpired.mockReturnValue(true);
    mockRefreshTokens.mockRejectedValue(new Error("network"));

    const result = await updateSession(
      createMockRequest("/dashboard", "https://app.praedixa.com", {
        prx_web_at: "expired-access",
        prx_web_rt: "refresh-token",
        prx_web_sess: "session-cookie",
      }),
    );

    expect((result as { redirectUrl: string }).redirectUrl).toBe(
      "https://app.praedixa.com/login",
    );
    expect(mockClearAuthCookies).toHaveBeenCalled();
  });

  it("rejects requests when refresh token does not match the signed session", async () => {
    mockVerifySession.mockResolvedValue(createSession("org_admin"));
    mockDoesSessionMatchRefreshToken.mockResolvedValue(false);

    const result = await updateSession(
      createMockRequest("/dashboard", "https://app.praedixa.com", {
        prx_web_at: "access-token",
        prx_web_rt: "tampered-refresh",
        prx_web_sess: "session-cookie",
      }),
    );

    expect((result as { redirectUrl: string }).redirectUrl).toBe(
      "https://app.praedixa.com/login",
    );
    expect(mockClearAuthCookies).toHaveBeenCalled();
  });
});
