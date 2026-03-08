import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

  it("getValidAccessToken probes /auth/session and never returns a browser bearer", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        user: {
          id: "admin-1",
          email: "admin@praedixa.com",
          role: "super_admin",
          permissions: ["admin:console:access"],
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

  it("deduplicates concurrent session fetches", async () => {
    mockFetch.mockImplementation(
      async () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({
                user: {
                  id: "admin-1",
                  email: "admin@praedixa.com",
                  role: "super_admin",
                  permissions: ["admin:console:access"],
                  organizationId: "org-1",
                  siteId: "site-1",
                },
              }),
            });
          }, 5);
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

  it("returns null when the session payload is incomplete", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ accessToken: "legacy-token" }),
    });

    const { getValidAccessToken } = await import("../client");
    expect(await getValidAccessToken()).toBeNull();
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
});

describe("useCurrentUserState (admin)", () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("hydrates the current user from /auth/session", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        user: {
          id: "admin-123",
          email: "admin@praedixa.com",
          role: "super_admin",
          permissions: ["admin:console:access"],
          organizationId: "org-1",
          siteId: "site-1",
        },
      }),
    });

    const { useCurrentUserState } = await import("../client");
    const { result } = renderHook(() => useCurrentUserState());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toMatchObject({
      id: "admin-123",
      email: "admin@praedixa.com",
      role: "super_admin",
    });
  });
});
