import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRedirect = vi.fn();

const mockClearAuthCookies = vi.fn();
const mockExchangeCodeForTokens = vi.fn();
const mockGetOidcEnv = vi.fn();
const mockGetTokenExp = vi.fn();
const mockResolveAuthAppOrigin = vi.fn();
const mockSanitizeNextPath = vi.fn();
const mockSetAuthCookies = vi.fn();
const mockSignSession = vi.fn();
const mockUserFromAccessToken = vi.fn();

vi.mock("next/server", () => ({
  NextResponse: {
    redirect: (...args: unknown[]) => mockRedirect(...args),
  },
}));

vi.mock("@/lib/auth/oidc", () => ({
  LOGIN_NEXT_COOKIE: "prx_admin_next",
  LOGIN_STATE_COOKIE: "prx_admin_state",
  LOGIN_VERIFIER_COOKIE: "prx_admin_verifier",
  clearAuthCookies: (...args: unknown[]) => mockClearAuthCookies(...args),
  exchangeCodeForTokens: (...args: unknown[]) =>
    mockExchangeCodeForTokens(...args),
  getOidcEnv: (...args: unknown[]) => mockGetOidcEnv(...args),
  getTokenExp: (...args: unknown[]) => mockGetTokenExp(...args),
  resolveAuthAppOrigin: (...args: unknown[]) =>
    mockResolveAuthAppOrigin(...args),
  sanitizeNextPath: (...args: unknown[]) => mockSanitizeNextPath(...args),
  setAuthCookies: (...args: unknown[]) => mockSetAuthCookies(...args),
  signSession: (...args: unknown[]) => mockSignSession(...args),
  userFromAccessToken: (...args: unknown[]) => mockUserFromAccessToken(...args),
}));

import { GET } from "../route";

function createRedirectResponse(url: string | URL) {
  return {
    status: 302,
    redirectUrl: typeof url === "string" ? url : url.toString(),
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
  });

  it("redirects non-super-admin users to /unauthorized", async () => {
    mockUserFromAccessToken.mockReturnValueOnce({
      id: "u1",
      email: "viewer@praedixa.com",
      role: "viewer",
      permissions: [],
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

    expect(response.redirectUrl).toBe(
      "https://admin.praedixa.com/unauthorized",
    );
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
  });
});
