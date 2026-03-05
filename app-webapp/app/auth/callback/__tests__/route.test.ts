import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRedirect = vi.fn();

const mockClearAuthCookies = vi.fn();
const mockExchangeCodeForTokens = vi.fn();
const mockGetOidcEnv = vi.fn();
const mockGetTokenExp = vi.fn();
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
  LOGIN_NEXT_COOKIE: "prx_web_next",
  LOGIN_STATE_COOKIE: "prx_web_state",
  LOGIN_VERIFIER_COOKIE: "prx_web_verifier",
  clearAuthCookies: (...args: unknown[]) => mockClearAuthCookies(...args),
  exchangeCodeForTokens: (...args: unknown[]) =>
    mockExchangeCodeForTokens(...args),
  getOidcEnv: (...args: unknown[]) => mockGetOidcEnv(...args),
  getTokenExp: (...args: unknown[]) => mockGetTokenExp(...args),
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

    mockGetOidcEnv.mockReturnValue({
      issuerUrl: "https://sso.praedixa.com",
      clientId: "web-client",
      clientSecret: "secret",
      sessionSecret: "session-secret",
    });

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
      id: "user-1",
      email: "ops@praedixa.com",
      role: "org_admin",
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
      "https://app.praedixa.com/login?error=auth_claims_invalid",
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
    const request = createMockRequest(
      { code: "valid-code", state: "state-123" },
      {
        prx_web_state: "state-123",
        prx_web_verifier: "verifier-123",
        prx_web_next: "/dashboard",
      },
    );

    for (let i = 0; i < 30; i += 1) {
      await GET(request);
    }

    const response = (await GET(request)) as { redirectUrl: string };
    expect(response.redirectUrl).toBe(
      "https://app.praedixa.com/login?error=rate_limited",
    );
  });
});
