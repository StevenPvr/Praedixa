/**
 * Webapp auth client tests.
 *
 * Tests getSupabaseBrowserClient, getValidAccessToken, clearAuthSession, useCurrentUser.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const {
  mockGetSession,
  mockRefreshSession,
  mockSignOut,
  mockCreateBrowserClient,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockRefreshSession: vi.fn(),
  mockSignOut: vi.fn(),
  mockCreateBrowserClient: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: (...args: unknown[]) => mockCreateBrowserClient(...args),
}));

describe("auth client", () => {
  const toJwt = (payload: Record<string, unknown> = {}) => {
    const encode = (value: Record<string, unknown>) =>
      Buffer.from(JSON.stringify(value)).toString("base64url");
    return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: "user-1", ...payload })}.signature`;
  };

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");

    mockGetSession.mockReset();
    mockRefreshSession.mockReset();
    mockSignOut.mockReset();
    mockCreateBrowserClient.mockReset();

    mockCreateBrowserClient.mockImplementation(() => ({
      auth: {
        getUser: vi.fn(),
        getSession: mockGetSession,
        refreshSession: mockRefreshSession,
        signOut: mockSignOut,
      },
    }));
  });

  it("returns a singleton browser client", async () => {
    const { getSupabaseBrowserClient } = await import("../client");
    const client1 = getSupabaseBrowserClient();
    const client2 = getSupabaseBrowserClient();

    expect(client1).toBe(client2);
    expect(mockCreateBrowserClient).toHaveBeenCalledTimes(1);
  });

  it("passes env vars to createBrowserClient", async () => {
    const { getSupabaseBrowserClient } = await import("../client");
    getSupabaseBrowserClient();

    expect(mockCreateBrowserClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-anon-key",
    );
  });

  it("getValidAccessToken returns current valid token", async () => {
    const tokenValue = toJwt();
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: tokenValue,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        },
      },
    });

    const { getValidAccessToken } = await import("../client");
    const token = await getValidAccessToken();

    expect(token).toBe(tokenValue);
    expect(mockRefreshSession).not.toHaveBeenCalled();
  });

  it("getValidAccessToken refreshes when session is missing", async () => {
    const refreshedToken = toJwt({ refreshed: true });
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockRefreshSession.mockResolvedValue({
      data: { session: { access_token: refreshedToken } },
      error: null,
    });

    const { getValidAccessToken } = await import("../client");
    const token = await getValidAccessToken();

    expect(token).toBe(refreshedToken);
    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
  });

  it("getValidAccessToken refreshes when token is near expiry", async () => {
    const oldToken = toJwt({ old: true });
    const newToken = toJwt({ fresh: true });
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: oldToken,
          expires_at: Math.floor(Date.now() / 1000) + 10,
        },
      },
    });
    mockRefreshSession.mockResolvedValue({
      data: { session: { access_token: newToken } },
      error: null,
    });

    const { getValidAccessToken } = await import("../client");
    const token = await getValidAccessToken({ minTtlSeconds: 60 });

    expect(token).toBe(newToken);
    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
  });

  it("getValidAccessToken returns null when refresh fails", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockRefreshSession.mockResolvedValue({
      data: { session: null },
      error: { message: "refresh failed" },
    });

    const { getValidAccessToken } = await import("../client");
    const token = await getValidAccessToken();

    expect(token).toBeNull();
  });

  it("getValidAccessToken returns null when getSession throws", async () => {
    mockGetSession.mockRejectedValueOnce(new Error("session unavailable"));

    const { getValidAccessToken } = await import("../client");
    const token = await getValidAccessToken();

    expect(token).toBeNull();
  });

  it("getValidAccessToken returns null when session has no access token", async () => {
    mockGetSession.mockResolvedValueOnce({
      data: {
        session: {
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        },
      },
    });

    const { getValidAccessToken } = await import("../client");
    const token = await getValidAccessToken();

    expect(token).toBeNull();
  });

  it("getValidAccessToken returns null when token is not a JWT", async () => {
    mockGetSession.mockResolvedValueOnce({
      data: {
        session: {
          access_token: "mock-access-token-e2e-testing",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        },
      },
    });

    const { getValidAccessToken } = await import("../client");
    const token = await getValidAccessToken();

    expect(token).toBeNull();
  });

  it("clearAuthSession signs out locally", async () => {
    mockSignOut.mockResolvedValue({ error: null });

    const { clearAuthSession } = await import("../client");
    await clearAuthSession();

    expect(mockSignOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("clearAuthSession swallows signOut errors", async () => {
    mockSignOut.mockRejectedValueOnce(new Error("signout failed"));

    const { clearAuthSession } = await import("../client");
    await expect(clearAuthSession()).resolves.toBeUndefined();
  });
});

describe("useCurrentUser", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockCreateBrowserClient.mockImplementation(() => ({
      auth: {
        getUser: vi.fn(),
        getSession: mockGetSession,
        refreshSession: mockRefreshSession,
        signOut: mockSignOut,
      },
    }));
  });

  it("returns user data from session", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: "user-123",
            email: "test@example.com",
            app_metadata: { role: "org_admin" },
          },
        },
      },
    });

    const { useCurrentUser } = await import("../client");
    const { result } = renderHook(() => useCurrentUser());

    await waitFor(() => {
      expect(result.current).toEqual({
        id: "user-123",
        email: "test@example.com",
        role: "org_admin",
      });
    });
  });

  it("returns null when no session", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
    });

    const { useCurrentUser } = await import("../client");
    const { result } = renderHook(() => useCurrentUser());

    expect(result.current).toBeNull();

    await waitFor(() => {
      expect(mockGetSession).toHaveBeenCalled();
    });
    expect(result.current).toBeNull();
  });

  it("defaults email to empty string and role to viewer", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: "user-456",
            email: null,
            app_metadata: {},
          },
        },
      },
    });

    const { useCurrentUser } = await import("../client");
    const { result } = renderHook(() => useCurrentUser());

    await waitFor(() => {
      expect(result.current).toEqual({
        id: "user-456",
        email: "",
        role: "viewer",
      });
    });
  });
});
