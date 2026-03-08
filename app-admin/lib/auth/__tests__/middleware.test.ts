import { beforeEach, describe, expect, it, vi } from "vitest";

const mockNext = vi.fn();
const mockRedirect = vi.fn();
const mockSetAuthCookies = vi.fn();
const mockClearAuthCookies = vi.fn();
const mockResolveRequestSession = vi.fn();

vi.mock("next/server", () => ({
  NextResponse: {
    next: (...args: unknown[]) => mockNext(...args),
    redirect: (...args: unknown[]) => mockRedirect(...args),
  },
}));

vi.mock("@/lib/auth/oidc", () => ({
  clearAuthCookies: (...args: unknown[]) => mockClearAuthCookies(...args),
  setAuthCookies: (...args: unknown[]) => mockSetAuthCookies(...args),
}));

vi.mock("@/lib/auth/request-session", () => ({
  resolveRequestSession: (...args: unknown[]) => mockResolveRequestSession(...args),
}));

import { updateSession } from "../middleware";

function createMockRequest(path: string) {
  const url = new URL(path, "https://admin.praedixa.com");

  return {
    url: url.toString(),
    nextUrl: {
      pathname: url.pathname,
      searchParams: url.searchParams,
    },
  } as Parameters<typeof updateSession>[0];
}

function createSession() {
  return {
    sub: "u1",
    email: "admin@praedixa.com",
    role: "super_admin",
    permissions: [
      "admin:console:access",
      "admin:monitoring:read",
      "admin:org:read",
      "admin:audit:read",
    ],
    organizationId: "org-1",
    siteId: "site-1",
    accessTokenExp: Math.floor(Date.now() / 1000) + 1800,
    issuedAt: Math.floor(Date.now() / 1000),
    sessionExpiresAt: Math.floor(Date.now() / 1000) + 3600,
    accessTokenHash: "hash-access",
    refreshTokenHash: "hash-refresh",
  };
}

describe("updateSession (admin)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockNext.mockReturnValue({
      status: 200,
      cookies: { set: vi.fn(), delete: vi.fn() },
      headers: new Headers(),
    });
    mockRedirect.mockImplementation((url: URL) => ({
      status: 302,
      redirectUrl: url.toString(),
      cookies: { set: vi.fn(), delete: vi.fn() },
      headers: new Headers(),
    }));
    mockResolveRequestSession.mockResolvedValue({
      ok: false,
      clearCookies: true,
    });
  });

  it("allows auth routes without auth checks", async () => {
    const result = await updateSession(createMockRequest("/auth/callback"));

    expect(result.status).toBe(200);
    expect(mockResolveRequestSession).not.toHaveBeenCalled();
  });

  it("allows API routes to be handled by route handlers", async () => {
    const result = await updateSession(createMockRequest("/api/v1/organizations"));

    expect(result.status).toBe(200);
    expect(mockResolveRequestSession).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated users to /login", async () => {
    const result = await updateSession(createMockRequest("/dashboard"));

    expect((result as { redirectUrl: string }).redirectUrl).toBe(
      "https://admin.praedixa.com/login",
    );
  });

  it("allows authenticated admins on protected routes", async () => {
    mockResolveRequestSession.mockResolvedValue({
      ok: true,
      session: createSession(),
      accessToken: "server-only-token",
      refreshToken: "refresh-token",
      cookieUpdate: {
        accessToken: "server-only-token",
        refreshToken: "refresh-token",
        sessionToken: "signed-session",
        accessTokenMaxAge: 900,
        refreshTokenMaxAge: 7200,
      },
    });

    const result = await updateSession(createMockRequest("/dashboard"));

    expect(result.status).toBe(200);
    expect(mockSetAuthCookies).toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("redirects authenticated admins away from restricted governance routes", async () => {
    mockResolveRequestSession.mockResolvedValue({
      ok: true,
      session: createSession(),
      accessToken: "server-only-token",
      refreshToken: "refresh-token",
      cookieUpdate: null,
    });

    const result = await updateSession(createMockRequest("/parametres"));

    expect((result as { redirectUrl: string }).redirectUrl).toBe(
      "https://admin.praedixa.com/unauthorized",
    );
    expect(mockClearAuthCookies).not.toHaveBeenCalled();
  });

  it("redirects authenticated admins away from /login except reauth", async () => {
    mockResolveRequestSession.mockResolvedValue({
      ok: true,
      session: createSession(),
      accessToken: "server-only-token",
      refreshToken: "refresh-token",
      cookieUpdate: null,
    });

    const redirected = await updateSession(createMockRequest("/login"));
    expect((redirected as { redirectUrl: string }).redirectUrl).toBe(
      "https://admin.praedixa.com/",
    );

    const forced = await updateSession(createMockRequest("/login?reauth=1"));
    expect(forced.status).toBe(200);
  });

  it("redirects authenticated admins without route permission to /unauthorized", async () => {
    mockResolveRequestSession.mockResolvedValue({
      ok: true,
      session: {
        ...createSession(),
        permissions: ["admin:console:access", "admin:monitoring:read"],
      },
      accessToken: "server-only-token",
      refreshToken: "refresh-token",
      cookieUpdate: null,
    });

    const result = await updateSession(createMockRequest("/journal"));

    expect((result as { redirectUrl: string }).redirectUrl).toBe(
      "https://admin.praedixa.com/unauthorized",
    );
    expect(mockClearAuthCookies).not.toHaveBeenCalled();
  });
});
