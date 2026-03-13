import { beforeEach, describe, expect, it, vi } from "vitest";

const mockClearAuthCookies = vi.fn();
const mockResolveAuthAppOrigin = vi.fn();
const mockSetAuthCookies = vi.fn();
const mockResolveRequestSession = vi.fn();
const mockConsumeRateLimit = vi.fn();

vi.mock("@/lib/auth/oidc", () => ({
  SESSION_COOKIE: "prx_admin_sess",
  clearAuthCookies: (...args: unknown[]) => mockClearAuthCookies(...args),
  resolveAuthAppOrigin: (...args: unknown[]) =>
    mockResolveAuthAppOrigin(...args),
  setAuthCookies: (...args: unknown[]) => mockSetAuthCookies(...args),
}));

vi.mock("@/lib/auth/request-session", () => ({
  resolveRequestSession: (...args: unknown[]) =>
    mockResolveRequestSession(...args),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  consumeRateLimit: (...args: unknown[]) => mockConsumeRateLimit(...args),
}));

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
  },
}));

import { GET } from "../route";

function createRequest(options?: {
  origin?: string | null;
  referer?: string | null;
  fetchSite?: string | null;
  requestOrigin?: string;
  sessionCookie?: string;
}) {
  const headers = new Headers();
  if (options?.origin !== undefined && options.origin !== null) {
    headers.set("origin", options.origin);
  }
  if (options?.referer !== undefined && options.referer !== null) {
    headers.set("referer", options.referer);
  }
  if (options?.fetchSite !== undefined && options.fetchSite !== null) {
    headers.set("sec-fetch-site", options.fetchSite);
  }

  return {
    headers,
    nextUrl: {
      origin: options?.requestOrigin ?? "https://admin.praedixa.com",
      searchParams: new URLSearchParams(),
    },
    cookies: {
      get: (name: string) => {
        if (name === "prx_admin_sess" && options?.sessionCookie) {
          return { value: options.sessionCookie };
        }
        return undefined;
      },
    },
  } as Parameters<typeof GET>[0];
}

describe("GET /auth/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveAuthAppOrigin.mockReturnValue("https://admin.praedixa.com");
    mockConsumeRateLimit.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 0,
      remaining: 42,
      resetAtEpochSeconds: 2_000_000_000,
    });
    mockResolveRequestSession.mockResolvedValue({
      ok: true,
      session: {
        sub: "admin-1",
        email: "admin@praedixa.com",
        role: "super_admin",
        permissions: ["admin:console:access"],
        organizationId: "org-1",
        siteId: "site-1",
      },
      cookieUpdate: null,
    });
  });

  it("rejects cross-site browser requests", async () => {
    const response = (await GET(
      createRequest({
        origin: "https://evil.example",
        fetchSite: "cross-site",
      }),
    )) as { body: { error: string }; status: number };

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "csrf_failed" });
    expect(mockResolveRequestSession).not.toHaveBeenCalled();
  });

  it("allows same-origin browser requests", async () => {
    const response = (await GET(
      createRequest({
        origin: "https://admin.praedixa.com",
        fetchSite: "same-origin",
        sessionCookie: "signed-session",
      }),
    )) as { body: { user: { email: string } }; status: number };

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe("admin@praedixa.com");
    expect(mockResolveRequestSession).toHaveBeenCalledTimes(1);
  });
});
