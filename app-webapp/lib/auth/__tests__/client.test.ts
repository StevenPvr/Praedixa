import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const mockFetch = vi.fn();

describe("auth client (webapp)", () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getValidAccessToken no longer exposes bearer tokens to the browser", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
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

    expect(token).toBeNull();
    expect(mockFetch).toHaveBeenCalledWith("/auth/session?min_ttl=60", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
  });

  it("deduplicates concurrent session refreshes even though no token is returned", async () => {
    mockFetch.mockImplementation(
      async () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({
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

    expect(first).toBeNull();
    expect(second).toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(1);
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

  it("returns user from /auth/session without needing an access token", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
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
      json: async () => ({ authenticated: true }),
    });

    const { useCurrentUser } = await import("../client");
    const { result } = renderHook(() => useCurrentUser());

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
    expect(result.current).toBeNull();
  });
});
