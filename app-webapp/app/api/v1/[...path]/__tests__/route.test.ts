import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockResolveRequestSession = vi.fn();
const mockClearAuthCookies = vi.fn();
const mockSetAuthCookies = vi.fn();
const mockFetch = vi.fn();
const mockIsSameOriginBrowserRequest = vi.fn();

vi.mock("@/lib/auth/request-session", () => ({
  resolveRequestSession: (...args: unknown[]) =>
    mockResolveRequestSession(...args),
}));

vi.mock("@/lib/auth/oidc", () => ({
  clearAuthCookies: (...args: unknown[]) => mockClearAuthCookies(...args),
  setAuthCookies: (...args: unknown[]) => mockSetAuthCookies(...args),
}));

vi.mock("@/lib/security/same-origin", () => ({
  isSameOriginBrowserRequest: (...args: unknown[]) =>
    mockIsSameOriginBrowserRequest(...args),
}));

import { DELETE, GET, PATCH, POST } from "../route";

function createMockRequest(
  method: string,
  {
    query = "",
    headers = {},
  }: { query?: string; headers?: Record<string, string> } = {},
) {
  const url = new URL(
    `/api/v1/conversations${query}`,
    "https://app.praedixa.com",
  );
  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );

  return {
    method,
    nextUrl: {
      origin: url.origin,
      pathname: url.pathname,
      search: url.search,
    },
    headers: {
      get: (name: string) => normalizedHeaders[name.toLowerCase()] ?? null,
    },
    cookies: {
      get: () => undefined,
    },
    text: async () => '{"hello":"world"}',
  } as Parameters<typeof GET>[0];
}

describe("/api/v1 proxy route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.praedixa.com");
    vi.stubGlobal("fetch", mockFetch);
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
      accessToken: "server-only-access-token",
      refreshToken: "refresh-token",
      cookieUpdate: null,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns 401 when auth resolution fails", async () => {
    mockResolveRequestSession.mockResolvedValueOnce({
      ok: false,
      clearCookies: true,
    });

    const response = await GET(createMockRequest("GET"), {
      params: Promise.resolve({ path: ["conversations"] }),
    });

    expect(response.status).toBe(401);
    expect(mockClearAuthCookies).toHaveBeenCalledTimes(1);
  });

  it("proxies GET requests through the backend with a server-side bearer token", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: [] }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Request-ID": "req-upstream-1",
        },
      }),
    );

    const request = createMockRequest("GET", { query: "?page=2" });
    const response = await GET(request, {
      params: Promise.resolve({ path: ["conversations"] }),
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.praedixa.com/api/v1/conversations?page=2",
      expect.objectContaining({
        method: "GET",
        headers: expect.any(Headers),
        cache: "no-store",
      }),
    );

    const forwardedHeaders = mockFetch.mock.calls[0][1].headers as Headers;
    expect(forwardedHeaders.get("authorization")).toBe(
      "Bearer server-only-access-token",
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, data: [] });
    expect(mockIsSameOriginBrowserRequest).toHaveBeenCalledWith(request);
  });

  it("allows the public health endpoint without session resolution", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    const response = await GET(createMockRequest("GET"), {
      params: Promise.resolve({ path: ["health"] }),
    });

    expect(mockResolveRequestSession).not.toHaveBeenCalled();
    const forwardedHeaders = mockFetch.mock.calls[0][1].headers as Headers;
    expect(forwardedHeaders.get("authorization")).toBeNull();
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("blocks cross-origin mutation requests before proxying", async () => {
    mockIsSameOriginBrowserRequest.mockReturnValueOnce(false);

    const response = await POST(
      createMockRequest("POST", {
        headers: {
          origin: "https://evil.example",
          "sec-fetch-site": "cross-site",
        },
      }),
      {
        params: Promise.resolve({ path: ["conversations"] }),
      },
    );

    expect(response.status).toBe(403);
    expect(mockResolveRequestSession).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("blocks cross-site authenticated GET requests before proxying", async () => {
    mockIsSameOriginBrowserRequest.mockReturnValueOnce(false);

    const response = await GET(createMockRequest("GET"), {
      params: Promise.resolve({ path: ["conversations"] }),
    });

    expect(response.status).toBe(403);
    expect(mockResolveRequestSession).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("applies refreshed auth cookies when the auth helper rotates tokens", async () => {
    mockResolveRequestSession.mockResolvedValueOnce({
      ok: true,
      session: {
        sub: "user-1",
        email: "ops@praedixa.com",
        role: "org_admin",
        organizationId: "org-1",
        siteId: "site-1",
      },
      accessToken: "server-only-access-token",
      refreshToken: "refresh-token",
      cookieUpdate: {
        accessToken: "new-access",
        refreshToken: "new-refresh",
        sessionToken: "new-session",
        accessTokenMaxAge: 900,
        refreshTokenMaxAge: 7200,
      },
    });
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }));

    const response = await PATCH(createMockRequest("PATCH"), {
      params: Promise.resolve({ path: ["conversations", "c1"] }),
    });

    expect(response.status).toBe(204);
    expect(mockSetAuthCookies).toHaveBeenCalledTimes(1);
  });

  it("rejects oversized proxied request bodies before contacting the backend", async () => {
    const response = await POST(
      createMockRequest("POST", {
        headers: {
          "content-length": String(1024 * 1024 + 1),
        },
      }),
      {
        params: Promise.resolve({ path: ["conversations"] }),
      },
    );

    expect(response.status).toBe(413);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("clears local cookies when the upstream API rejects the proxied token", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const response = await DELETE(createMockRequest("DELETE"), {
      params: Promise.resolve({ path: ["conversations", "c1"] }),
    });

    expect(response.status).toBe(401);
    expect(mockClearAuthCookies).toHaveBeenCalledTimes(1);
  });

  it("logs upstream fetch failures and returns 502", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    mockFetch.mockRejectedValueOnce(
      new Error("connect ECONNREFUSED 127.0.0.1:8000"),
    );

    const response = await GET(
      createMockRequest("GET", {
        headers: {
          "x-request-id": "req-proxy-webapp-1",
        },
      }),
      {
        params: Promise.resolve({ path: ["health"] }),
      },
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "bad_gateway" });
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const [rawEntry] = consoleErrorSpy.mock.calls[0] as [string];
    expect(JSON.parse(rawEntry)).toMatchObject({
      level: "error",
      service: "webapp-bff",
      event: "proxy.upstream_failed",
      request_id: "req-proxy-webapp-1",
      trace_id: "req-proxy-webapp-1",
      path: "/api/v1/conversations",
      upstream_url: "https://api.praedixa.com/api/v1/health",
      status_code: 502,
    });
  });
});
