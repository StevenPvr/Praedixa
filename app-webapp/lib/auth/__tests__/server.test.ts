/**
 * Webapp auth server tests.
 *
 * Tests getSupabaseServerClient, getUser, and getSession.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();
const mockGetSession = vi.fn();
const mockClient = {
  auth: {
    getUser: mockGetUser,
    getSession: mockGetSession,
  },
};

const mockCookieGetAll = vi.fn(() => [{ name: "sb-token", value: "abc123" }]);
const mockCookieSet = vi.fn();
const mockCookieStore = {
  getAll: mockCookieGetAll,
  set: mockCookieSet,
};

let capturedCookieHandlers: {
  getAll: () => unknown;
  setAll: (
    cookies: {
      name: string;
      value: string;
      options: Record<string, unknown>;
    }[],
  ) => void;
} | null = null;

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(
    (
      _url: string,
      _key: string,
      opts: { cookies: typeof capturedCookieHandlers },
    ) => {
      capturedCookieHandlers = opts.cookies as typeof capturedCookieHandlers;
      return mockClient;
    },
  ),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

import { getSupabaseServerClient, getUser, getSession } from "../server";

describe("getSupabaseServerClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedCookieHandlers = null;
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  });

  it("should create a server client with cookie handlers", async () => {
    const { createServerClient } = await import("@supabase/ssr");
    await getSupabaseServerClient();

    expect(createServerClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-anon-key",
      expect.objectContaining({
        cookies: expect.objectContaining({
          getAll: expect.any(Function),
          setAll: expect.any(Function),
        }),
      }),
    );
  });

  it("should wire getAll to cookieStore.getAll", async () => {
    await getSupabaseServerClient();

    const result = capturedCookieHandlers!.getAll();
    expect(result).toEqual([{ name: "sb-token", value: "abc123" }]);
    expect(mockCookieGetAll).toHaveBeenCalled();
  });

  it("should wire setAll to cookieStore.set for each cookie", async () => {
    await getSupabaseServerClient();

    const cookiesToSet = [
      { name: "sb-access", value: "token1", options: { path: "/" } },
      {
        name: "sb-refresh",
        value: "token2",
        options: { path: "/", httpOnly: true },
      },
    ];

    capturedCookieHandlers!.setAll(cookiesToSet);

    expect(mockCookieSet).toHaveBeenCalledTimes(2);
    expect(mockCookieSet).toHaveBeenCalledWith("sb-access", "token1", {
      path: "/",
    });
    expect(mockCookieSet).toHaveBeenCalledWith("sb-refresh", "token2", {
      path: "/",
      httpOnly: true,
    });
  });

  it("should silently catch errors in setAll (Server Components)", async () => {
    mockCookieSet.mockImplementation(() => {
      throw new Error("Read-only cookie store");
    });

    await getSupabaseServerClient();

    expect(() => {
      capturedCookieHandlers!.setAll([
        { name: "sb-token", value: "v", options: {} },
      ]);
    }).not.toThrow();
  });
});

describe("getUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return user when authenticated", async () => {
    const mockUser = { id: "user-1", email: "test@test.com" };
    mockGetUser.mockResolvedValueOnce({ data: { user: mockUser } });

    const user = await getUser();

    expect(user).toEqual(mockUser);
  });

  it("should return null when no user", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });

    const user = await getUser();

    expect(user).toBeNull();
  });
});

describe("getSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return session when authenticated", async () => {
    const mockSession = { access_token: "at", refresh_token: "rt" };
    mockGetSession.mockResolvedValueOnce({ data: { session: mockSession } });

    const session = await getSession();

    expect(session).toEqual(mockSession);
  });

  it("should return null when no session", async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });

    const session = await getSession();

    expect(session).toBeNull();
  });
});
