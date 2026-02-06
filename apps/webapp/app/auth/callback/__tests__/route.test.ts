import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockExchangeCodeForSession = vi.fn();
const mockCookieGetAll = vi.fn(() => [
  { name: "sb-token", value: "test-cookie-value" },
]);
const mockCookieSet = vi.fn();

let capturedCookieOpts: {
  getAll: () => unknown[];
  setAll: (
    cookies: { name: string; value: string; options: unknown }[],
  ) => void;
} | null = null;

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(
    (
      _url: string,
      _key: string,
      opts: { cookies: typeof capturedCookieOpts },
    ) => {
      capturedCookieOpts = opts.cookies;
      return {
        auth: {
          exchangeCodeForSession: mockExchangeCodeForSession,
        },
      };
    },
  ),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      getAll: mockCookieGetAll,
      set: mockCookieSet,
    }),
  ),
}));

// Mock NextResponse.redirect to capture redirect URL
const mockRedirect = vi.fn((url: string | URL) => ({
  status: 302,
  redirectUrl: typeof url === "string" ? url : url.toString(),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    redirect: (...args: unknown[]) => mockRedirect(...args),
  },
}));

import { GET } from "../route";
import type { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockRequest(
  searchParams: Record<string, string>,
  origin = "http://localhost:3001",
): NextRequest {
  const params = new URLSearchParams(searchParams);
  const url = `${origin}/auth/callback?${params.toString()}`;
  return { url } as NextRequest;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedCookieOpts = null;
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  });

  it("should exchange code for session and redirect to /dashboard", async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({ error: null });
    const req = createMockRequest({ code: "valid-code" });

    await GET(req);

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith("valid-code");
    expect(mockRedirect).toHaveBeenCalledTimes(1);
    const redirectUrl = mockRedirect.mock.calls[0][0];
    expect(redirectUrl).toContain("/dashboard");
  });

  it("should redirect to custom next path after successful exchange", async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({ error: null });
    const req = createMockRequest({ code: "valid-code", next: "/settings" });

    await GET(req);

    const redirectUrl = mockRedirect.mock.calls[0][0];
    expect(redirectUrl).toContain("/settings");
  });

  it("should prevent open redirect: next=//evil.com redirects to /dashboard", async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({ error: null });
    const req = createMockRequest({ code: "valid-code", next: "//evil.com" });

    await GET(req);

    const redirectUrl = mockRedirect.mock.calls[0][0];
    expect(redirectUrl).toContain("/dashboard");
    expect(redirectUrl).not.toContain("evil.com");
  });

  it("should prevent open redirect: next=https://evil.com redirects to /dashboard", async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({ error: null });
    const req = createMockRequest({
      code: "valid-code",
      next: "https://evil.com",
    });

    await GET(req);

    const redirectUrl = mockRedirect.mock.calls[0][0];
    expect(redirectUrl).toContain("/dashboard");
    expect(redirectUrl).not.toContain("evil.com");
  });

  it("should redirect to /login with error on exchange failure", async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({
      error: { message: "invalid code" },
    });
    const req = createMockRequest({ code: "invalid-code" });

    await GET(req);

    const redirectUrl = mockRedirect.mock.calls[0][0];
    expect(redirectUrl).toContain("/login");
    expect(redirectUrl).toContain("error=auth_callback_failed");
  });

  it("should redirect to /login with error when no code param", async () => {
    const req = createMockRequest({});

    await GET(req);

    const redirectUrl = mockRedirect.mock.calls[0][0];
    expect(redirectUrl).toContain("/login");
    expect(redirectUrl).toContain("error=auth_callback_failed");
  });

  it("should not call exchangeCodeForSession when no code param", async () => {
    const req = createMockRequest({});

    await GET(req);

    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("should redirect to /previsions when next=/previsions after success", async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({ error: null });
    const req = createMockRequest({ code: "valid", next: "/previsions" });

    await GET(req);

    const redirectUrl = mockRedirect.mock.calls[0][0];
    expect(redirectUrl).toContain("/previsions");
  });

  it("should pass cookies from cookieStore via getAll", async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({ error: null });
    const req = createMockRequest({ code: "valid-code" });

    await GET(req);

    // The createServerClient should have been called and cookies captured
    expect(capturedCookieOpts).not.toBeNull();
    // Exercise getAll
    const allCookies = capturedCookieOpts!.getAll();
    expect(allCookies).toEqual([
      { name: "sb-token", value: "test-cookie-value" },
    ]);
  });

  it("should set cookies via setAll", async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({ error: null });
    const req = createMockRequest({ code: "valid-code" });

    await GET(req);

    expect(capturedCookieOpts).not.toBeNull();
    // Exercise setAll
    capturedCookieOpts!.setAll([
      { name: "sb-access", value: "token123", options: { path: "/" } },
    ]);
    expect(mockCookieSet).toHaveBeenCalledWith("sb-access", "token123", {
      path: "/",
    });
  });
});
