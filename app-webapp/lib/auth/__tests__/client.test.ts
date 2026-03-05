import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const mockFetch = vi.fn();

function toBase64Url(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createJwt(expOffsetSeconds: number): string {
  const header = toBase64Url(JSON.stringify({ alg: "none", typ: "JWT" }));
  const payload = toBase64Url(
    JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + expOffsetSeconds,
    }),
  );
  return `${header}.${payload}.sig`;
}

describe("auth client (webapp)", () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getValidAccessToken calls /auth/session with default min_ttl and returns token", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        accessToken: "token-current",
        user: {
          id: "user-1",
          email: "ops@praedixa.com",
          role: "org_admin",
          organizationId: "org-1",
          siteId: "site-1",
        },
      }),
    });

    const { getValidAccessToken } = await import("../client");
    const token = await getValidAccessToken();

    expect(token).toBe("token-current");
    expect(mockFetch).toHaveBeenCalledWith("/auth/session?min_ttl=60", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
  });

  it("getValidAccessToken uses provided min_ttl", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        accessToken: "token-custom",
        user: {
          id: "user-1",
          email: "ops@praedixa.com",
          role: "org_admin",
          organizationId: "org-1",
          siteId: "site-1",
        },
      }),
    });

    const { getValidAccessToken } = await import("../client");
    const token = await getValidAccessToken({ minTtlSeconds: 30 });

    expect(token).toBe("token-custom");
    expect(mockFetch).toHaveBeenCalledWith("/auth/session?min_ttl=30", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
  });

  it("reuses cached token when ttl is still sufficient", async () => {
    const cachedToken = createJwt(600);

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        accessToken: cachedToken,
        user: {
          id: "user-1",
          email: "ops@praedixa.com",
          role: "org_admin",
          organizationId: "org-1",
          siteId: "site-1",
        },
      }),
    });

    const { getValidAccessToken } = await import("../client");
    const first = await getValidAccessToken({ minTtlSeconds: 60 });
    const second = await getValidAccessToken({ minTtlSeconds: 60 });

    expect(first).toBe(cachedToken);
    expect(second).toBe(cachedToken);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("deduplicates concurrent session fetches", async () => {
    const cachedToken = createJwt(600);

    mockFetch.mockImplementation(
      async () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({
                accessToken: cachedToken,
                user: {
                  id: "user-1",
                  email: "ops@praedixa.com",
                  role: "org_admin",
                  organizationId: "org-1",
                  siteId: "site-1",
                },
              }),
            });
          }, 10);
        }),
    );

    const { getValidAccessToken } = await import("../client");
    const [first, second] = await Promise.all([
      getValidAccessToken(),
      getValidAccessToken(),
    ]);

    expect(first).toBe(cachedToken);
    expect(second).toBe(cachedToken);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("getValidAccessToken returns null when response is not ok", async () => {
    mockFetch.mockResolvedValue({ ok: false, json: async () => ({}) });

    const { getValidAccessToken } = await import("../client");
    const token = await getValidAccessToken();

    expect(token).toBeNull();
  });

  it("getValidAccessToken returns null when payload is incomplete", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ accessToken: "token-without-user" }),
    });

    const { getValidAccessToken } = await import("../client");
    const token = await getValidAccessToken();

    expect(token).toBeNull();
  });

  it("getValidAccessToken returns null when fetch throws", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network"));

    const { getValidAccessToken } = await import("../client");
    const token = await getValidAccessToken();

    expect(token).toBeNull();
  });

  it("returns cached token when refresh endpoint is temporarily unavailable", async () => {
    const shortLivedToken = createJwt(20);

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          accessToken: shortLivedToken,
          user: {
            id: "user-1",
            email: "ops@praedixa.com",
            role: "org_admin",
            organizationId: "org-1",
            siteId: "site-1",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: "rate_limited" }),
      });

    const { getValidAccessToken } = await import("../client");

    const primed = await getValidAccessToken({ minTtlSeconds: 0 });
    const fallback = await getValidAccessToken({ minTtlSeconds: 60 });

    expect(primed).toBe(shortLivedToken);
    expect(fallback).toBe(shortLivedToken);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("clearAuthSession posts to /auth/logout", async () => {
    mockFetch.mockResolvedValue({ ok: true });

    const { clearAuthSession } = await import("../client");
    await clearAuthSession();

    expect(mockFetch).toHaveBeenCalledWith("/auth/logout", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });
  });

  it("clearAuthSession swallows fetch errors", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network"));

    const { clearAuthSession } = await import("../client");
    await expect(clearAuthSession()).resolves.toBeUndefined();
  });
});

describe("useCurrentUser (webapp)", () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns user from /auth/session?min_ttl=60", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        accessToken: "token-current",
        user: {
          id: "user-123",
          email: "test@example.com",
          role: "org_admin",
          organizationId: "org-1",
          siteId: "site-1",
        },
      }),
    });

    const { useCurrentUser } = await import("../client");
    const { result } = renderHook(() => useCurrentUser());

    await waitFor(() => {
      expect(result.current).toEqual({
        id: "user-123",
        email: "test@example.com",
        role: "org_admin",
        organizationId: "org-1",
        siteId: "site-1",
      });
    });

    expect(mockFetch).toHaveBeenCalledWith("/auth/session?min_ttl=60", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
  });

  it("returns null when session fetch fails", async () => {
    mockFetch.mockResolvedValue({ ok: false, json: async () => ({}) });

    const { useCurrentUser } = await import("../client");
    const { result } = renderHook(() => useCurrentUser());

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
    expect(result.current).toBeNull();
  });

  it("returns null when payload is invalid", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ accessToken: "token-without-user" }),
    });

    const { useCurrentUser } = await import("../client");
    const { result } = renderHook(() => useCurrentUser());

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
    expect(result.current).toBeNull();
  });
});
