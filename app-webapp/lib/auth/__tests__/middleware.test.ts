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

function createMockRequest(path: string, cookies: Record<string, string> = {}) {
  const url = new URL(path, "https://app.praedixa.com");

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

describe("updateSession (webapp)", () => {
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

  it("allows /auth routes without auth checks", async () => {
    const result = await updateSession(createMockRequest("/auth/callback"));

    expect(result.status).toBe(200);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("allows /api routes without login redirects", async () => {
    const result = await updateSession(createMockRequest("/api/v1/conversations"));

    expect(result.status).toBe(200);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated users to /login", async () => {
    const result = await updateSession(createMockRequest("/dashboard"));

    expect((result as { redirectUrl: string }).redirectUrl).toBe(
      "https://app.praedixa.com/login",
    );
    expect(mockClearAuthCookies).toHaveBeenCalled();
  });

  it("keeps unauthenticated users on /login", async () => {
    const result = await updateSession(createMockRequest("/login"));

    expect(result.status).toBe(200);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("redirects authenticated users from /login to /dashboard", async () => {
    mockVerifySession.mockResolvedValue(createSession("org_admin"));

    const result = await updateSession(
      createMockRequest("/login", {
        prx_web_at: "access-token",
        prx_web_sess: "session-cookie",
      }),
    );

    expect((result as { redirectUrl: string }).redirectUrl).toBe(
      "https://app.praedixa.com/dashboard",
    );
  });

  it("does not redirect /login when forced reauth", async () => {
    mockVerifySession.mockResolvedValue(createSession("org_admin"));

    const result = await updateSession(
      createMockRequest("/login?reauth=1", {
        prx_web_at: "access-token",
        prx_web_sess: "session-cookie",
      }),
    );

    expect(result.status).toBe(200);
  });

  it("redirects super_admin away from webapp protected routes", async () => {
    mockVerifySession.mockResolvedValue(createSession("super_admin"));

    const result = await updateSession(
      createMockRequest("/dashboard", {
        prx_web_at: "access-token",
        prx_web_sess: "session-cookie",
      }),
    );

    expect((result as { redirectUrl: string }).redirectUrl).toBe(
      "https://app.praedixa.com/login",
    );
  });

  it("allows viewer on /parametres", async () => {
    mockVerifySession.mockResolvedValue(createSession("viewer"));

    const result = await updateSession(
      createMockRequest("/parametres", {
        prx_web_at: "access-token",
        prx_web_sess: "session-cookie",
      }),
    );

    expect(result.status).toBe(200);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("allows org_admin on /parametres", async () => {
    mockVerifySession.mockResolvedValue(createSession("org_admin"));

    const result = await updateSession(
      createMockRequest("/parametres", {
        prx_web_at: "access-token",
        prx_web_sess: "session-cookie",
      }),
    );

    expect(result.status).toBe(200);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("refreshes tokens when access token is expired", async () => {
    mockVerifySession.mockResolvedValue(createSession("org_admin"));
    mockIsTokenExpired.mockReturnValue(true);
    mockRefreshTokens.mockResolvedValue({
      access_token: "new-access",
      refresh_token: "new-refresh",
      expires_in: 1200,
      refresh_expires_in: 2400,
    });
    mockUserFromAccessToken.mockReturnValue({
      id: "u1",
      email: "org-admin@praedixa.com",
      role: "org_admin",
      organizationId: "org-1",
      siteId: "site-1",
    });

    const result = await updateSession(
      createMockRequest("/dashboard", {
        prx_web_at: "expired-access",
        prx_web_rt: "refresh-token",
        prx_web_sess: "session-cookie",
      }),
    );

    expect(result.status).toBe(200);
    expect(mockRefreshTokens).toHaveBeenCalled();
    expect(mockBuildSessionData).toHaveBeenCalled();
    expect(mockSetAuthCookies).toHaveBeenCalled();
  });

  it("clears cookies when access token does not match the signed session", async () => {
    mockVerifySession.mockResolvedValue(createSession("org_admin"));
    mockDoesSessionMatchAccessToken.mockResolvedValue(false);

    const result = await updateSession(
      createMockRequest("/dashboard", {
        prx_web_at: "tampered-access",
        prx_web_sess: "session-cookie",
      }),
    );

    expect((result as { redirectUrl: string }).redirectUrl).toBe(
      "https://app.praedixa.com/login",
    );
    expect(mockClearAuthCookies).toHaveBeenCalled();
  });
});
