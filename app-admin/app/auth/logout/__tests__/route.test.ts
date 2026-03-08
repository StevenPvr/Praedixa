import { beforeEach, describe, expect, it, vi } from "vitest";

const mockClearAuthCookies = vi.fn();
const mockResolveAuthAppOrigin = vi.fn();
const mockGetOidcEnv = vi.fn();
const mockRevokeTokens = vi.fn();

vi.mock("@/lib/auth/oidc", () => ({
  ACCESS_TOKEN_COOKIE: "prx_admin_at",
  REFRESH_TOKEN_COOKIE: "prx_admin_rt",
  clearAuthCookies: (...args: unknown[]) => mockClearAuthCookies(...args),
  resolveAuthAppOrigin: (...args: unknown[]) =>
    mockResolveAuthAppOrigin(...args),
  getOidcEnv: (...args: unknown[]) => mockGetOidcEnv(...args),
  revokeTokens: (...args: unknown[]) => mockRevokeTokens(...args),
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
      },
    }),
  },
}));

import { POST } from "../route";

function createRequest(options?: {
  origin?: string | null;
  referer?: string | null;
  requestOrigin?: string;
  accessToken?: string;
  refreshToken?: string;
}) {
  const headers = new Headers();
  if (options?.origin !== undefined && options.origin !== null) {
    headers.set("origin", options.origin);
  }
  if (options?.referer !== undefined && options.referer !== null) {
    headers.set("referer", options.referer);
  }

  const cookieValues: Record<string, string | undefined> = {
    prx_admin_at: options?.accessToken,
    prx_admin_rt: options?.refreshToken,
  };

  return {
    headers,
    nextUrl: {
      origin: options?.requestOrigin ?? "https://admin.praedixa.com",
    },
    cookies: {
      get: (name: string) => {
        const value = cookieValues[name];
        return value ? { value } : undefined;
      },
    },
  };
}

describe("POST /auth/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveAuthAppOrigin.mockReturnValue("https://admin.praedixa.com");
    mockGetOidcEnv.mockReturnValue({
      issuerUrl: "https://auth.praedixa.com/realms/praedixa",
      clientId: "praedixa-admin",
      clientSecret: "secret",
    });
  });

  it("rejects cross-origin logout requests", async () => {
    const response = (await POST(
      createRequest({
        origin: "https://evil.example",
      }) as never,
    )) as {
      body: { error: string };
      status: number;
    };

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "csrf_failed" });
    expect(mockRevokeTokens).not.toHaveBeenCalled();
    expect(mockClearAuthCookies).not.toHaveBeenCalled();
  });

  it("revokes tokens and clears cookies for trusted same-origin requests", async () => {
    const response = (await POST(
      createRequest({
        origin: "https://admin.praedixa.com",
        accessToken: "access-token",
        refreshToken: "refresh-token",
      }) as never,
    )) as {
      body: { success: boolean };
      status: number;
    };

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
    expect(mockRevokeTokens).toHaveBeenCalledWith({
      issuerUrl: "https://auth.praedixa.com/realms/praedixa",
      clientId: "praedixa-admin",
      clientSecret: "secret",
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });
    expect(mockClearAuthCookies).toHaveBeenCalledTimes(1);
  });

  it("accepts same-origin referer fallback for browser navigation flows", async () => {
    const response = (await POST(
      createRequest({
        referer: "https://admin.praedixa.com/journal",
        accessToken: "access-token",
      }) as never,
    )) as {
      body: { success: boolean };
      status: number;
    };

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
    expect(mockRevokeTokens).toHaveBeenCalledTimes(1);
  });
});
