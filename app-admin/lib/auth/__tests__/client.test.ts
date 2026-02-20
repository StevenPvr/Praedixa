import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const mockFetch = vi.fn();

describe("auth client (admin)", () => {
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
          id: "admin-1",
          email: "admin@praedixa.com",
          role: "super_admin",
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
          id: "admin-1",
          email: "admin@praedixa.com",
          role: "super_admin",
          organizationId: "org-1",
          siteId: "site-1",
        },
      }),
    });

    const { getValidAccessToken } = await import("../client");
    const token = await getValidAccessToken({ minTtlSeconds: 15 });

    expect(token).toBe("token-custom");
    expect(mockFetch).toHaveBeenCalledWith("/auth/session?min_ttl=15", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
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

describe("useCurrentUser (admin)", () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns user from /auth/session?min_ttl=0", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        accessToken: "token-current",
        user: {
          id: "admin-123",
          email: "admin@praedixa.com",
          role: "super_admin",
          organizationId: "org-1",
          siteId: "site-1",
        },
      }),
    });

    const { useCurrentUser } = await import("../client");
    const { result } = renderHook(() => useCurrentUser());

    await waitFor(() => {
      expect(result.current).toEqual({
        id: "admin-123",
        email: "admin@praedixa.com",
        role: "super_admin",
        organizationId: "org-1",
        siteId: "site-1",
      });
    });

    expect(mockFetch).toHaveBeenCalledWith("/auth/session?min_ttl=0", {
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
