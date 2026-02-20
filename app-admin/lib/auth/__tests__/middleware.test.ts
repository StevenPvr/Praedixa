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

vi.mock("next/server", () => ({
  NextResponse: {
    next: (...args: unknown[]) => mockNext(...args),
    redirect: (...args: unknown[]) => mockRedirect(...args),
  },
}));

vi.mock("@/lib/auth/oidc", () => ({
  ACCESS_TOKEN_COOKIE: "prx_admin_at",
  REFRESH_TOKEN_COOKIE: "prx_admin_rt",
  SESSION_COOKIE: "prx_admin_sess",
  clearAuthCookies: (...args: unknown[]) => mockClearAuthCookies(...args),
  getOidcEnv: (...args: unknown[]) => mockGetOidcEnv(...args),
  getTokenExp: (...args: unknown[]) => mockGetTokenExp(...args),
  isTokenExpired: (...args: unknown[]) => mockIsTokenExpired(...args),
  refreshTokens: (...args: unknown[]) => mockRefreshTokens(...args),
  setAuthCookies: (...args: unknown[]) => mockSetAuthCookies(...args),
  signSession: (...args: unknown[]) => mockSignSession(...args),
  userFromAccessToken: (...args: unknown[]) => mockUserFromAccessToken(...args),
  verifySession: (...args: unknown[]) => mockVerifySession(...args),
}));

import { updateSession } from "../middleware";

type RequestCookies = Record<string, string>;

function createMockRequest(path: string, cookies: RequestCookies = {}) {
  const url = new URL(path, "https://admin.praedixa.com");

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
  };
}

describe("updateSession (admin)", () => {
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
    mockGetOidcEnv.mockReturnValue({
      issuerUrl: "https://sso.praedixa.com",
      clientId: "admin-client",
      clientSecret: "secret",
      sessionSecret: "session-secret",
    });
    mockSignSession.mockResolvedValue("signed-session");
  });

  it("allows auth routes without auth checks", async () => {
    const result = await updateSession(createMockRequest("/auth/callback"));

    expect(result.status).toBe(200);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated users to /login", async () => {
    const result = await updateSession(createMockRequest("/dashboard"));

    expect((result as { redirectUrl: string }).redirectUrl).toBe(
      "https://admin.praedixa.com/login",
    );
    expect(mockClearAuthCookies).toHaveBeenCalled();
  });

  it("redirects non super_admin users to /unauthorized", async () => {
    mockVerifySession.mockResolvedValue(createSession("manager"));

    const result = await updateSession(
      createMockRequest("/dashboard", {
        prx_admin_at: "access-token",
        prx_admin_sess: "session-cookie",
      }),
    );

    expect((result as { redirectUrl: string }).redirectUrl).toBe(
      "https://admin.praedixa.com/unauthorized",
    );
  });

  it("allows super_admin on protected routes", async () => {
    mockVerifySession.mockResolvedValue(createSession("super_admin"));

    const result = await updateSession(
      createMockRequest("/dashboard", {
        prx_admin_at: "access-token",
        prx_admin_sess: "session-cookie",
      }),
    );

    expect(result.status).toBe(200);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("redirects authenticated super_admin away from /login", async () => {
    mockVerifySession.mockResolvedValue(createSession("super_admin"));

    const result = await updateSession(
      createMockRequest("/login", {
        prx_admin_at: "access-token",
        prx_admin_sess: "session-cookie",
      }),
    );

    expect((result as { redirectUrl: string }).redirectUrl).toBe(
      "https://admin.praedixa.com/",
    );
  });

  it("does not redirect /login when forced reauth", async () => {
    mockVerifySession.mockResolvedValue(createSession("super_admin"));

    const result = await updateSession(
      createMockRequest("/login?reauth=1", {
        prx_admin_at: "access-token",
        prx_admin_sess: "session-cookie",
      }),
    );

    expect(result.status).toBe(200);
  });

  it("uses refresh token path and updates cookies", async () => {
    mockVerifySession.mockResolvedValue(createSession("super_admin"));
    mockIsTokenExpired.mockReturnValue(true);
    mockRefreshTokens.mockResolvedValue({
      access_token: "new-access",
      refresh_token: "new-refresh",
      expires_in: 1200,
      refresh_expires_in: 2400,
    });
    mockUserFromAccessToken.mockReturnValue({
      id: "u1",
      email: "admin@praedixa.com",
      role: "super_admin",
      organizationId: "org-1",
      siteId: "site-1",
    });

    const result = await updateSession(
      createMockRequest("/dashboard", {
        prx_admin_at: "expired-access",
        prx_admin_rt: "refresh-token",
        prx_admin_sess: "session-cookie",
      }),
    );

    expect(result.status).toBe(200);
    expect(mockRefreshTokens).toHaveBeenCalled();
    expect(mockSetAuthCookies).toHaveBeenCalled();
  });

  it("clears cookies and redirects to /login when refresh returns no access token", async () => {
    mockVerifySession.mockResolvedValue(createSession("super_admin"));
    mockIsTokenExpired.mockReturnValue(true);
    mockRefreshTokens.mockResolvedValue({
      access_token: "",
    });

    const result = await updateSession(
      createMockRequest("/dashboard", {
        prx_admin_at: "expired-access",
        prx_admin_rt: "refresh-token",
        prx_admin_sess: "session-cookie",
      }),
    );

    expect((result as { redirectUrl: string }).redirectUrl).toBe(
      "https://admin.praedixa.com/login",
    );
    expect(mockClearAuthCookies).toHaveBeenCalled();
  });
});
