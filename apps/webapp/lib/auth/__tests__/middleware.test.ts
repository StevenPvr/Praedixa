import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn();
const mockClient = {
  auth: {
    getUser: mockGetUser,
  },
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

// Build a mock NextResponse with chainable cookies
function makeMockResponse() {
  const responseCookies: Map<
    string,
    { name: string; value: string; options: Record<string, unknown> }
  > = new Map();
  return {
    status: 200,
    cookies: {
      set: vi.fn(
        (name: string, value: string, options: Record<string, unknown>) => {
          responseCookies.set(name, { name, value, options });
        },
      ),
      getAll: () => Array.from(responseCookies.values()),
    },
    _responseCookies: responseCookies,
  };
}

const mockNextResponse = makeMockResponse();

vi.mock("next/server", () => ({
  NextResponse: {
    next: vi.fn(() => mockNextResponse),
    redirect: vi.fn((url: URL) => ({
      status: 302,
      redirectUrl: url.toString(),
    })),
  },
}));

import { updateSession } from "../middleware";
import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockRequest(pathname: string, origin = "http://localhost:3001") {
  const requestCookies = new Map<string, string>();

  return {
    url: `${origin}${pathname}`,
    nextUrl: {
      pathname,
      toString: () => `${origin}${pathname}`,
    },
    cookies: {
      getAll: vi.fn(() =>
        Array.from(requestCookies.entries()).map(([name, value]) => ({
          name,
          value,
        })),
      ),
      set: vi.fn((name: string, value: string) => {
        requestCookies.set(name, value);
      }),
    },
    _requestCookies: requestCookies,
  } as unknown as Parameters<typeof updateSession>[0];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("updateSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedCookieHandlers = null;
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  });

  it("should return next response for authenticated user on /dashboard", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } } });
    const req = createMockRequest("/dashboard");

    const result = await updateSession(req);

    expect(result.status).toBe(200);
    // Should NOT have redirected
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });

  it("should redirect unauthenticated user on /dashboard to /login", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const req = createMockRequest("/dashboard");

    const result = await updateSession(req);

    expect(NextResponse.redirect).toHaveBeenCalled();
    expect((result as { redirectUrl: string }).redirectUrl).toContain("/login");
  });

  it("should NOT redirect unauthenticated user on /login (no redirect loop)", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const req = createMockRequest("/login");

    const result = await updateSession(req);

    expect(result.status).toBe(200);
  });

  it("should NOT redirect unauthenticated user on /auth/callback", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const req = createMockRequest("/auth/callback");

    const result = await updateSession(req);

    expect(result.status).toBe(200);
  });

  it("should redirect authenticated user on /login to /dashboard", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } } });
    const req = createMockRequest("/login");

    const result = await updateSession(req);

    expect(NextResponse.redirect).toHaveBeenCalled();
    expect((result as { redirectUrl: string }).redirectUrl).toContain(
      "/dashboard",
    );
  });

  it("should redirect unauthenticated user on /previsions to /login", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const req = createMockRequest("/previsions");

    const result = await updateSession(req);

    expect((result as { redirectUrl: string }).redirectUrl).toContain("/login");
  });

  it("should NOT redirect authenticated user on /previsions", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } } });
    const req = createMockRequest("/previsions");

    const result = await updateSession(req);

    expect(result.status).toBe(200);
  });

  it("cookie getAll should read from request cookies", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } } });
    const req = createMockRequest("/dashboard");

    await updateSession(req);

    // The createServerClient was called, and getAll was wired to request.cookies.getAll
    expect(capturedCookieHandlers).not.toBeNull();
    capturedCookieHandlers!.getAll();
    expect(req.cookies.getAll).toHaveBeenCalled();
  });

  it("cookie setAll should update both request and response cookies", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } } });
    const req = createMockRequest("/dashboard");

    await updateSession(req);

    const cookiesToSet = [
      { name: "sb-access", value: "new-token", options: { path: "/" } },
    ];

    // Calling setAll triggers request.cookies.set + new NextResponse.next + response.cookies.set
    capturedCookieHandlers!.setAll(cookiesToSet);

    expect(req.cookies.set).toHaveBeenCalledWith("sb-access", "new-token");
    // NextResponse.next is called again in setAll to create a fresh response
    expect(NextResponse.next).toHaveBeenCalled();
  });
});
