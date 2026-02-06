import { describe, it, expect, vi, beforeEach } from "vitest";

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
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "token-current",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        },
      },
    });

    const { getValidAccessToken } = await import("../client");
    const token = await getValidAccessToken();

    expect(token).toBe("token-current");
    expect(mockRefreshSession).not.toHaveBeenCalled();
  });

  it("getValidAccessToken refreshes when session is missing", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockRefreshSession.mockResolvedValue({
      data: { session: { access_token: "token-refreshed" } },
      error: null,
    });

    const { getValidAccessToken } = await import("../client");
    const token = await getValidAccessToken();

    expect(token).toBe("token-refreshed");
    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
  });

  it("getValidAccessToken refreshes when token is near expiry", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "token-old",
          expires_at: Math.floor(Date.now() / 1000) + 10,
        },
      },
    });
    mockRefreshSession.mockResolvedValue({
      data: { session: { access_token: "token-new" } },
      error: null,
    });

    const { getValidAccessToken } = await import("../client");
    const token = await getValidAccessToken({ minTtlSeconds: 60 });

    expect(token).toBe("token-new");
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

  it("clearAuthSession signs out locally", async () => {
    mockSignOut.mockResolvedValue({ error: null });

    const { clearAuthSession } = await import("../client");
    await clearAuthSession();

    expect(mockSignOut).toHaveBeenCalledWith({ scope: "local" });
  });
});
