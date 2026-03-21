import { beforeEach, describe, expect, it, vi } from "vitest";

const mockResolveAuthAppOrigin = vi.fn();
const mockResolveRequestSession = vi.fn();
const mockFetch = vi.fn();

globalThis.fetch = mockFetch as typeof fetch;

vi.mock("@/lib/auth/oidc", () => ({
  clearAuthCookies: vi.fn(),
  resolveAuthAppOrigin: (...args: unknown[]) =>
    mockResolveAuthAppOrigin(...args),
  setAuthCookies: vi.fn(),
}));

vi.mock("@/lib/auth/request-session", () => ({
  resolveRequestSession: (...args: unknown[]) =>
    mockResolveRequestSession(...args),
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
  body?: string;
  contentLength?: string;
  method?: string;
  pathname?: string;
  origin?: string | null;
  referer?: string | null;
  fetchSite?: string | null;
  requestOrigin?: string;
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
  if (options?.contentLength !== undefined) {
    headers.set("content-length", options.contentLength);
  }

  return {
    method: options?.method ?? "GET",
    headers,
    nextUrl: {
      origin: options?.requestOrigin ?? "https://admin.praedixa.com",
      pathname: options?.pathname ?? "/api/v1/admin/organizations",
      search: "",
    },
    text: vi.fn().mockResolvedValue(options?.body ?? ""),
  } as Parameters<typeof GET>[0];
}

describe("GET /api/v1/[...path]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveAuthAppOrigin.mockReturnValue("https://admin.praedixa.com");
  });

  it("rejects cross-site authenticated proxy requests before touching the session", async () => {
    const response = (await GET(
      createRequest({
        origin: "https://evil.example",
        fetchSite: "cross-site",
      }),
      {
        params: Promise.resolve({ path: ["organizations"] }),
      },
    )) as { body: { error: string }; status: number };

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "csrf_failed" });
    expect(mockResolveRequestSession).not.toHaveBeenCalled();
  });

  it("rejects contradictory authenticated proxy requests when sec-fetch-site is cross-site", async () => {
    const response = (await GET(
      createRequest({
        origin: "https://admin.praedixa.com",
        fetchSite: "cross-site",
      }),
      {
        params: Promise.resolve({ path: ["organizations"] }),
      },
    )) as { body: { error: string }; status: number };

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "csrf_failed" });
    expect(mockResolveRequestSession).not.toHaveBeenCalled();
  });

  it("fails closed when the configured public admin origin is missing", async () => {
    mockResolveAuthAppOrigin.mockImplementationOnce(() => {
      throw new Error("Missing AUTH_APP_ORIGIN");
    });

    const response = (await GET(
      createRequest({
        origin: "https://admin.praedixa.com",
        fetchSite: "same-origin",
      }),
      {
        params: Promise.resolve({ path: ["organizations"] }),
      },
    )) as { body: { error: string }; status: number };

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "csrf_failed" });
    expect(mockResolveRequestSession).not.toHaveBeenCalled();
  });

  it("blocks same-origin admin proxy requests without an explicit matching permission", async () => {
    mockResolveRequestSession.mockResolvedValue({
      ok: true,
      session: {
        role: "super_admin",
        permissions: ["admin:console:access", "admin:org:read"],
      },
      accessToken: "server-only-token",
      refreshToken: "refresh-token",
      cookieUpdate: null,
    });

    const response = (await GET(
      createRequest({
        origin: "https://admin.praedixa.com",
        fetchSite: "same-origin",
        pathname: "/api/v1/admin/audit-log",
      }),
      {
        params: Promise.resolve({ path: ["admin", "audit-log"] }),
      },
    )) as { body: { error: string }; status: number };

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "forbidden" });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fails closed for unknown admin proxy paths before the upstream call", async () => {
    mockResolveRequestSession.mockResolvedValue({
      ok: true,
      session: {
        role: "super_admin",
        permissions: ["admin:console:access", "admin:monitoring:read"],
      },
      accessToken: "server-only-token",
      refreshToken: "refresh-token",
      cookieUpdate: null,
    });

    const response = (await GET(
      createRequest({
        origin: "https://admin.praedixa.com",
        fetchSite: "same-origin",
        pathname: "/api/v1/admin/legacy-resource",
      }),
      {
        params: Promise.resolve({ path: ["admin", "legacy-resource"] }),
      },
    )) as { body: { error: string }; status: number };

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "forbidden" });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("logs upstream proxy failures with a structured request envelope", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    mockResolveRequestSession.mockResolvedValue({
      ok: true,
      session: {
        role: "super_admin",
        permissions: ["admin:console:access", "admin:org:read"],
      },
      accessToken: "server-only-token",
      refreshToken: "refresh-token",
      cookieUpdate: null,
    });
    mockFetch.mockRejectedValueOnce(
      new Error("connect ECONNREFUSED 127.0.0.1:8000"),
    );

    const response = (await GET(
      createRequest({
        origin: "https://admin.praedixa.com",
        fetchSite: "same-origin",
        pathname: "/api/v1/admin/organizations",
      }),
      {
        params: Promise.resolve({ path: ["admin", "organizations"] }),
      },
    )) as { body: { error: string }; status: number };

    expect(response.status).toBe(502);
    expect(response.body).toEqual({ error: "bad_gateway" });
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const [rawEntry] = consoleErrorSpy.mock.calls[0] as [string];
    expect(JSON.parse(rawEntry)).toMatchObject({
      level: "error",
      service: "admin-bff",
      event: "proxy.upstream_failed",
      path: "/api/v1/admin/organizations",
      status_code: 502,
    });
  });

  it("rejects oversized proxy payloads with 413 before the upstream call", async () => {
    mockResolveRequestSession.mockResolvedValue({
      ok: true,
      session: {
        role: "super_admin",
        permissions: ["admin:console:access", "admin:onboarding:write"],
      },
      accessToken: "server-only-token",
      refreshToken: "refresh-token",
      cookieUpdate: null,
    });

    const response = (await GET(
      createRequest({
        method: "POST",
        origin: "https://admin.praedixa.com",
        fetchSite: "same-origin",
        pathname: "/api/v1/admin/onboarding",
        contentLength: String(1024 * 1024 + 1),
        body: '{"name":"too-large"}',
      }),
      {
        params: Promise.resolve({ path: ["admin", "onboarding"] }),
      },
    )) as { body: { error: string }; status: number };

    expect(response.status).toBe(413);
    expect(response.body).toEqual({ error: "payload_too_large" });
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
