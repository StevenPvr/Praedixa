import { describe, it, expect, vi, beforeEach } from "vitest";

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

function makeMockResponse() {
  return {
    status: 200,
    cookies: {
      set: vi.fn(),
      getAll: vi.fn(() => []),
    },
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

function createMockRequest(path: string, origin = "http://localhost:3001") {
  const url = new URL(path, origin);
  const requestCookies = new Map<string, string>();

  return {
    url: url.toString(),
    nextUrl: {
      pathname: url.pathname,
      searchParams: url.searchParams,
      toString: () => url.toString(),
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
  } as unknown as Parameters<typeof updateSession>[0];
}

describe("updateSession (admin)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedCookieHandlers = null;
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  });

  it("allows /unauthorized route without auth", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const req = createMockRequest("/unauthorized");

    const result = await updateSession(req);

    expect(result.status).toBe(200);
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated users to /login", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const req = createMockRequest("/dashboard");

    const result = await updateSession(req);

    expect((result as { redirectUrl: string }).redirectUrl).toContain("/login");
  });

  it("redirects non-super_admin users to /unauthorized", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "u1", app_metadata: { role: "org_admin" } } },
    });
    const req = createMockRequest("/dashboard");

    const result = await updateSession(req);

    expect((result as { redirectUrl: string }).redirectUrl).toContain(
      "/unauthorized",
    );
  });

  it("allows super_admin users on protected routes", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "u1", app_metadata: { role: "super_admin" } } },
    });
    const req = createMockRequest("/dashboard");

    const result = await updateSession(req);

    expect(result.status).toBe(200);
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });

  it("redirects super_admin from /login to /", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "u1", app_metadata: { role: "super_admin" } } },
    });
    const req = createMockRequest("/login");

    const result = await updateSession(req);

    const redirectUrl = (result as { redirectUrl: string }).redirectUrl;
    expect(redirectUrl).toMatch(/\/$/);
  });

  it("does not redirect /login?reauth=1", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "u1", app_metadata: { role: "super_admin" } } },
    });
    const req = createMockRequest("/login?reauth=1");

    const result = await updateSession(req);

    expect(result.status).toBe(200);
  });

  it("treats Supabase errors as unauthenticated", async () => {
    mockGetUser.mockRejectedValueOnce(new Error("supabase down"));
    const req = createMockRequest("/dashboard");

    const result = await updateSession(req);

    expect((result as { redirectUrl: string }).redirectUrl).toContain("/login");
  });

  it("wires cookie getAll/setAll handlers", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "u1", app_metadata: { role: "super_admin" } } },
    });
    const req = createMockRequest("/dashboard");

    await updateSession(req);

    expect(capturedCookieHandlers).not.toBeNull();
    capturedCookieHandlers!.getAll();
    expect(req.cookies.getAll).toHaveBeenCalled();

    capturedCookieHandlers!.setAll([
      { name: "sb-access", value: "new-token", options: { path: "/" } },
    ]);
    expect(req.cookies.set).toHaveBeenCalledWith("sb-access", "new-token");
    expect(NextResponse.next).toHaveBeenCalled();
  });
});
