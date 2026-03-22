import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockRedirect = vi.fn();

const mockCreatePkceChallenge = vi.fn();
const mockCreateRandomToken = vi.fn();
const mockGetOidcEnv = vi.fn();
const mockGetTrustedOidcEndpoints = vi.fn();
const mockIsMissingOidcEnvError = vi.fn();
const mockResolveAuthAppOrigin = vi.fn();
const mockSanitizeNextPath = vi.fn();
const mockSecureCookie = vi.fn();
const mockConsumeRateLimit = vi.fn();

vi.mock("next/server", () => ({
  NextResponse: {
    redirect: (...args: unknown[]) => mockRedirect(...args),
  },
}));

vi.mock("@/lib/auth/oidc", () => ({
  LOGIN_NEXT_COOKIE: "prx_admin_next",
  LOGIN_STATE_COOKIE: "prx_admin_state",
  LOGIN_VERIFIER_COOKIE: "prx_admin_verifier",
  createPkceChallenge: (...args: unknown[]) => mockCreatePkceChallenge(...args),
  createRandomToken: (...args: unknown[]) => mockCreateRandomToken(...args),
  getOidcEnv: (...args: unknown[]) => mockGetOidcEnv(...args),
  getTrustedOidcEndpoints: (...args: unknown[]) =>
    mockGetTrustedOidcEndpoints(...args),
  isMissingOidcEnvError: (...args: unknown[]) =>
    mockIsMissingOidcEnvError(...args),
  resolveAuthAppOrigin: (...args: unknown[]) =>
    mockResolveAuthAppOrigin(...args),
  sanitizeNextPath: (...args: unknown[]) => mockSanitizeNextPath(...args),
  secureCookie: (...args: unknown[]) => mockSecureCookie(...args),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  consumeRateLimit: (...args: unknown[]) => mockConsumeRateLimit(...args),
}));

import { GET } from "../route";

const emitWarningSpy = vi
  .spyOn(process, "emitWarning")
  .mockImplementation(() => undefined);

function createRedirectResponse(url: string | URL) {
  return {
    status: 302,
    redirectUrl: typeof url === "string" ? url : url.toString(),
    headers: {
      set: vi.fn(),
    },
    cookies: {
      set: vi.fn(),
    },
  };
}

function createMockRequest(query: Record<string, string> = {}) {
  return createMockRequestWithOrigin("https://admin.praedixa.com", query);
}

function createMockRequestWithOrigin(
  origin: string,
  query: Record<string, string> = {},
) {
  const url = new URL("/auth/login", origin);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }

  return {
    nextUrl: {
      origin: url.origin,
      searchParams: url.searchParams,
    },
  } as Parameters<typeof GET>[0];
}

describe("GET /auth/login (admin)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockRedirect.mockImplementation((url: string | URL) =>
      createRedirectResponse(url),
    );
    mockGetOidcEnv.mockReturnValue({
      issuerUrl: "https://sso.praedixa.com",
      clientId: "admin-client",
      scope: "openid profile email offline_access",
    });
    mockGetTrustedOidcEndpoints.mockResolvedValue({
      authorizationEndpoint:
        "https://sso.praedixa.com/protocol/openid-connect/auth",
      tokenEndpoint: "https://sso.praedixa.com/protocol/openid-connect/token",
    });
    mockIsMissingOidcEnvError.mockReturnValue(false);
    mockResolveAuthAppOrigin.mockReturnValue("https://admin.praedixa.com");
    mockCreateRandomToken
      .mockReturnValueOnce("state-token")
      .mockReturnValueOnce("verifier-token");
    mockCreatePkceChallenge.mockResolvedValue("challenge-token");
    mockSanitizeNextPath.mockImplementation(
      (next: string | null | undefined, fallback: string) => {
        if (!next || !next.startsWith("/") || next.startsWith("//")) {
          return fallback;
        }
        return next;
      },
    );
    mockSecureCookie.mockReturnValue(true);
    mockConsumeRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 7,
      retryAfterSeconds: 300,
      resetAtEpochSeconds: 1_900_000_000,
    });
  });

  afterEach(() => {
    emitWarningSpy.mockClear();
  });

  it("redirects to OIDC authorization endpoint and sets login cookies", async () => {
    const response = (await GET(
      createMockRequest({ next: "/clients", prompt: "login" }),
    )) as {
      redirectUrl: string;
      cookies: { set: ReturnType<typeof vi.fn> };
    };

    const redirectUrl = new URL(response.redirectUrl);
    expect(redirectUrl.origin + redirectUrl.pathname).toBe(
      "https://sso.praedixa.com/protocol/openid-connect/auth",
    );
    expect(redirectUrl.searchParams.get("client_id")).toBe("admin-client");
    expect(redirectUrl.searchParams.get("response_type")).toBe("code");
    expect(redirectUrl.searchParams.get("prompt")).toBe("login");
    expect(redirectUrl.searchParams.get("state")).toBe("state-token");
    expect(redirectUrl.searchParams.get("code_challenge")).toBe(
      "challenge-token",
    );
    expect(redirectUrl.searchParams.get("redirect_uri")).toBe(
      "https://admin.praedixa.com/auth/callback",
    );

    expect(response.cookies.set).toHaveBeenCalledWith(
      "prx_admin_state",
      "state-token",
      expect.any(Object),
    );
    expect(response.cookies.set).toHaveBeenCalledWith(
      "prx_admin_verifier",
      "verifier-token",
      expect.any(Object),
    );
    expect(response.cookies.set).toHaveBeenCalledWith(
      "prx_admin_next",
      "/clients",
      expect.any(Object),
    );
    expect(response.headers.set).toHaveBeenCalledWith(
      "Cache-Control",
      "no-store",
    );
    expect(response.headers.set).toHaveBeenCalledWith("Pragma", "no-cache");
  });

  it("redirects to /login with oidc_config_missing when OIDC env is missing", async () => {
    mockGetOidcEnv.mockImplementationOnce(() => {
      throw new Error(
        "Missing OIDC env vars: AUTH_OIDC_ISSUER_URL, AUTH_OIDC_CLIENT_ID, AUTH_SESSION_SECRET",
      );
    });
    mockIsMissingOidcEnvError.mockReturnValueOnce(true);

    const response = (await GET(createMockRequest({ next: "/" }))) as {
      redirectUrl: string;
    };

    const redirectUrl = new URL(response.redirectUrl);
    expect(redirectUrl.origin + redirectUrl.pathname).toBe(
      "https://admin.praedixa.com/login",
    );
    expect(redirectUrl.searchParams.get("error")).toBe("oidc_config_missing");
    expect(redirectUrl.searchParams.get("next")).toBe("/");
    expect(
      (response as { headers: { set: ReturnType<typeof vi.fn> } }).headers.set,
    ).toHaveBeenCalledWith("Cache-Control", "no-store");
  });

  it("redirects to /login with oidc_provider_untrusted when discovery is invalid", async () => {
    mockGetTrustedOidcEndpoints.mockRejectedValueOnce(
      new Error(
        "OIDC discovery request failed (404 Not Found: Realm does not exist)",
      ),
    );
    mockIsMissingOidcEnvError.mockReturnValueOnce(false);

    const response = (await GET(createMockRequest({ next: "/" }))) as {
      redirectUrl: string;
    };

    const redirectUrl = new URL(response.redirectUrl);
    expect(redirectUrl.origin + redirectUrl.pathname).toBe(
      "https://admin.praedixa.com/login",
    );
    expect(redirectUrl.searchParams.get("error")).toBe(
      "oidc_provider_untrusted",
    );
    expect(redirectUrl.searchParams.get("next")).toBe("/");
    expect(emitWarningSpy).toHaveBeenCalledWith(
      expect.stringContaining("Realm does not exist"),
    );
    expect(
      (response as { headers: { set: ReturnType<typeof vi.fn> } }).headers.set,
    ).toHaveBeenCalledWith("Cache-Control", "no-store");
  });

  it("preserves the provider retry marker when an auto-retry bounce still fails", async () => {
    mockGetTrustedOidcEndpoints.mockRejectedValueOnce(
      new Error("OIDC discovery request failed (503 Service Unavailable)"),
    );
    mockIsMissingOidcEnvError.mockReturnValueOnce(false);

    const response = (await GET(
      createMockRequest({ next: "/", provider_retry_at: "1711080000000" }),
    )) as {
      redirectUrl: string;
    };

    const redirectUrl = new URL(response.redirectUrl);
    expect(redirectUrl.searchParams.get("error")).toBe(
      "oidc_provider_untrusted",
    );
    expect(redirectUrl.searchParams.get("provider_retry_at")).toBe(
      "1711080000000",
    );
  });

  it("redirects to the configured auth origin before starting OIDC on a loopback alias", async () => {
    mockResolveAuthAppOrigin.mockReturnValue("http://localhost:3002");

    const response = (await GET(
      createMockRequestWithOrigin("http://127.0.0.1:3002", { next: "/" }),
    )) as {
      redirectUrl: string;
      headers: { set: ReturnType<typeof vi.fn> };
    };

    const redirectUrl = new URL(response.redirectUrl);
    expect(redirectUrl.origin + redirectUrl.pathname).toBe(
      "http://localhost:3002/auth/login",
    );
    expect(redirectUrl.searchParams.get("next")).toBe("/");
    expect(mockGetTrustedOidcEndpoints).not.toHaveBeenCalled();
    expect(response.headers.set).toHaveBeenCalledWith(
      "Cache-Control",
      "no-store",
    );
  });

  it("redirects to /login with rate_limited when the client exceeds the login budget", async () => {
    mockConsumeRateLimit.mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 120,
      resetAtEpochSeconds: 1_900_000_000,
    });

    const response = (await GET(createMockRequest({ next: "/clients" }))) as {
      redirectUrl: string;
    };

    const redirectUrl = new URL(response.redirectUrl);
    expect(redirectUrl.origin + redirectUrl.pathname).toBe(
      "https://admin.praedixa.com/login",
    );
    expect(redirectUrl.searchParams.get("error")).toBe("rate_limited");
    expect(redirectUrl.searchParams.get("next")).toBe("/clients");
    expect(mockGetTrustedOidcEndpoints).not.toHaveBeenCalled();
    expect(
      (response as { headers: { set: ReturnType<typeof vi.fn> } }).headers.set,
    ).toHaveBeenCalledWith("Retry-After", "120");
    expect(
      (response as { headers: { set: ReturnType<typeof vi.fn> } }).headers.set,
    ).toHaveBeenCalledWith("Cache-Control", "no-store");
  });
});
