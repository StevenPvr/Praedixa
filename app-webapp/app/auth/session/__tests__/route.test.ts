import { beforeEach, describe, expect, it, vi } from "vitest";

const mockJson = vi.fn();
const mockClearAuthCookies = vi.fn();
const mockSetAuthCookies = vi.fn();
const mockConsumeRateLimit = vi.fn();
const mockResolveRequestSession = vi.fn();
const mockIsSameOriginBrowserRequest = vi.fn();

vi.mock("next/server", () => ({
  NextResponse: {
    json: (...args: unknown[]) => mockJson(...args),
  },
}));

vi.mock("@/lib/auth/oidc", () => ({
  SESSION_COOKIE: "prx_web_sess",
  clearAuthCookies: (...args: unknown[]) => mockClearAuthCookies(...args),
  setAuthCookies: (...args: unknown[]) => mockSetAuthCookies(...args),
}));

vi.mock("@/lib/auth/request-session", () => ({
  resolveRequestSession: (...args: unknown[]) => mockResolveRequestSession(...args),
}));

vi.mock("@/lib/auth/rate-limit", () => ({
  consumeRateLimit: (...args: unknown[]) => mockConsumeRateLimit(...args),
}));

vi.mock("@/lib/security/same-origin", () => ({
  isSameOriginBrowserRequest: (...args: unknown[]) =>
    mockIsSameOriginBrowserRequest(...args),
}));

import { GET } from "../route";

function createJsonResponse(body: unknown, status = 200) {
  return {
    status,
    body,
    headers: {
      set: vi.fn(),
    },
    cookies: {
      set: vi.fn(),
      delete: vi.fn(),
    },
  };
}

function createMockRequest(
  query: Record<string, string> = {},
  cookieValues: Record<string, string> = {},
) {
  const url = new URL("/auth/session", "https://app.praedixa.com");
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }

  return {
    nextUrl: {
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

describe("GET /auth/session (webapp)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockJson.mockImplementation((body: unknown, init?: { status?: number }) =>
      createJsonResponse(body, init?.status ?? 200),
    );
    mockConsumeRateLimit.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 0,
      remaining: 599,
      resetAtEpochSeconds: 2_000_000_000,
    });
    mockIsSameOriginBrowserRequest.mockReturnValue(true);
    mockResolveRequestSession.mockResolvedValue({
      ok: true,
      session: {
        sub: "user-1",
        email: "ops@praedixa.com",
        role: "org_admin",
        organizationId: "org-1",
        siteId: "site-1",
      },
      accessToken: "server-only-token",
      refreshToken: "refresh-token",
      cookieUpdate: null,
    });
  });

  it("returns current user without exposing the access token", async () => {
    const response = await GET(
      createMockRequest({}, { prx_web_sess: "session-cookie" }),
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      user: {
        id: "user-1",
        email: "ops@praedixa.com",
        role: "org_admin",
        organizationId: "org-1",
        siteId: "site-1",
      },
    });
    expect(response.body).not.toHaveProperty("accessToken");
  });

  it("rejects cross-site browser requests before session resolution", async () => {
    mockIsSameOriginBrowserRequest.mockReturnValueOnce(false);

    const response = await GET(
      createMockRequest({}, { prx_web_sess: "session-cookie" }),
    );

    expect(response.status).toBe(403);
    expect(mockResolveRequestSession).not.toHaveBeenCalled();
    expect(mockClearAuthCookies).not.toHaveBeenCalled();
  });

  it("applies refreshed auth cookies when the session helper rotates tokens", async () => {
    mockResolveRequestSession.mockResolvedValueOnce({
      ok: true,
      session: {
        sub: "user-1",
        email: "ops@praedixa.com",
        role: "org_admin",
        organizationId: "org-1",
        siteId: "site-1",
      },
      accessToken: "server-only-token",
      refreshToken: "refresh-token",
      cookieUpdate: {
        accessToken: "new-access",
        refreshToken: "new-refresh",
        sessionToken: "new-session",
        accessTokenMaxAge: 900,
        refreshTokenMaxAge: 7200,
      },
    });

    const response = await GET(
      createMockRequest({ min_ttl: "120" }, { prx_web_sess: "session-cookie" }),
    );

    expect(response.status).toBe(200);
    expect(mockResolveRequestSession).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        minTtlSeconds: 120,
        preserveCookiesOnRefreshFailure: true,
      }),
    );
    expect(mockSetAuthCookies).toHaveBeenCalledTimes(1);
  });

  it("returns unauthorized and clears cookies when session resolution fails hard", async () => {
    mockResolveRequestSession.mockResolvedValueOnce({
      ok: false,
      clearCookies: true,
    });

    const response = await GET(
      createMockRequest({}, { prx_web_sess: "session-cookie" }),
    );

    expect(response.status).toBe(401);
    expect(mockClearAuthCookies).toHaveBeenCalledTimes(1);
  });
});
