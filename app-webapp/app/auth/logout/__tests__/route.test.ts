import { beforeEach, describe, expect, it, vi } from "vitest";

const mockJson = vi.fn();
const mockClearAuthCookies = vi.fn();
const mockGetOidcEnv = vi.fn();
const mockRevokeOidcToken = vi.fn();

vi.mock("next/server", () => ({
  NextResponse: {
    json: (...args: unknown[]) => mockJson(...args),
  },
}));

vi.mock("@/lib/auth/oidc", () => ({
  ACCESS_TOKEN_COOKIE: "prx_web_at",
  REFRESH_TOKEN_COOKIE: "prx_web_rt",
  clearAuthCookies: (...args: unknown[]) => mockClearAuthCookies(...args),
  getOidcEnv: (...args: unknown[]) => mockGetOidcEnv(...args),
  revokeOidcToken: (...args: unknown[]) => mockRevokeOidcToken(...args),
}));

import { POST } from "../route";

function createJsonResponse(
  body: unknown,
  init?: { status?: number },
): {
  status: number;
  body: unknown;
  headers: { set: ReturnType<typeof vi.fn> };
  cookies: { delete: ReturnType<typeof vi.fn> };
} {
  return {
    status: init?.status ?? 200,
    body,
    headers: {
      set: vi.fn(),
    },
    cookies: {
      delete: vi.fn(),
    },
  };
}

function createMockRequest(
  headers: Record<string, string> = {},
  cookieValues: Record<string, string> = {},
) {
  const url = new URL("/auth/logout", "https://app.praedixa.com");
  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );

  return {
    nextUrl: {
      origin: url.origin,
    },
    headers: {
      get: (name: string) => normalizedHeaders[name.toLowerCase()] ?? null,
    },
    cookies: {
      get: (name: string) => {
        const value = cookieValues[name];
        return value ? { name, value } : undefined;
      },
    },
  } as Parameters<typeof POST>[0];
}

describe("POST /auth/logout (webapp)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockJson.mockImplementation((body: unknown, init?: { status?: number }) =>
      createJsonResponse(body, init),
    );
    mockGetOidcEnv.mockReturnValue({
      issuerUrl: "https://sso.praedixa.com",
      clientId: "web-client",
      clientSecret: "secret",
    });
    mockRevokeOidcToken.mockResolvedValue(true);
  });

  it("rejects cross-origin logout attempts", async () => {
    const response = await POST(
      createMockRequest({
        origin: "https://evil.example",
        "sec-fetch-site": "cross-site",
      }),
    );

    expect(response.status).toBe(403);
    expect(mockClearAuthCookies).not.toHaveBeenCalled();
    expect(mockRevokeOidcToken).not.toHaveBeenCalled();
  });

  it("revokes upstream tokens before clearing local cookies", async () => {
    const response = await POST(
      createMockRequest(
        {
          origin: "https://app.praedixa.com",
          "sec-fetch-site": "same-origin",
        },
        {
          prx_web_at: "access-token",
          prx_web_rt: "refresh-token",
        },
      ),
    );

    expect(response.status).toBe(200);
    expect(mockRevokeOidcToken).toHaveBeenCalledTimes(2);
    expect(mockClearAuthCookies).toHaveBeenCalledTimes(1);
  });

  it("allows direct logout navigation requests without an Origin header", async () => {
    const response = await POST(
      createMockRequest(
        {
          "sec-fetch-site": "none",
        },
        {
          prx_web_rt: "refresh-token",
        },
      ),
    );

    expect(response.status).toBe(200);
    expect(mockRevokeOidcToken).toHaveBeenCalledTimes(1);
    expect(mockClearAuthCookies).toHaveBeenCalledTimes(1);
  });

  it("still clears local cookies when upstream revocation fails", async () => {
    mockRevokeOidcToken.mockRejectedValueOnce(new Error("revocation down"));

    const response = await POST(
      createMockRequest(
        {
          origin: "https://app.praedixa.com",
        },
        {
          prx_web_rt: "refresh-token",
        },
      ),
    );

    expect(response.status).toBe(200);
    expect(mockClearAuthCookies).toHaveBeenCalledTimes(1);
  });
});
