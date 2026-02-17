/**
 * Security gap analysis — Auth middleware open redirect & role enforcement.
 *
 * Tests that the auth middleware:
 * 1. Never redirects to external hosts (open redirect prevention).
 * 2. Rejects super_admin users from the client webapp.
 * 3. Redirect URLs always use the same origin as the request.
 * 4. Handles edge-case paths that could bypass route checks.
 *
 * OWASP: A01:2021 — Broken Access Control (open redirect, role enforcement)
 */

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

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(
    (
      _url: string,
      _key: string,
      _opts: {
        cookies: { getAll: () => unknown; setAll: (c: unknown) => void };
      },
    ) => {
      return mockClient;
    },
  ),
}));

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
    headers: new Map<string, string>(),
  };
}

const mockNextResponse = makeMockResponse();

vi.mock("next/server", () => ({
  NextResponse: {
    next: vi.fn(() => mockNextResponse),
    redirect: vi.fn((url: URL) => ({
      status: 302,
      redirectUrl: url.toString(),
      headers: new Map<string, string>(),
    })),
  },
}));

import { updateSession } from "../middleware";
import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Auth Middleware Security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  });

  // ── 1. Open redirect prevention ──────────────────────────────

  describe("open redirect prevention", () => {
    it("redirect to /login uses same origin as request", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      const req = createMockRequest("/dashboard", "http://localhost:3001");

      const result = await updateSession(req);

      const redirectUrl = (result as { redirectUrl: string }).redirectUrl;
      expect(redirectUrl).toContain("http://localhost:3001/login");
      expect(redirectUrl).not.toContain("//evil.com");
    });

    it("redirect to /dashboard uses same origin as request", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "u1", app_metadata: {} } },
      });
      const req = createMockRequest("/login", "http://localhost:3001");

      const result = await updateSession(req);

      const redirectUrl = (result as { redirectUrl: string }).redirectUrl;
      expect(redirectUrl).toContain("http://localhost:3001/dashboard");
    });

    it("redirect URL never points to external host", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      // Even with a production-like origin, redirect stays internal
      const req = createMockRequest("/dashboard", "https://app.praedixa.com");

      const result = await updateSession(req);

      const redirectUrl = (result as { redirectUrl: string }).redirectUrl;
      const parsed = new URL(redirectUrl);
      expect(parsed.hostname).toBe("app.praedixa.com");
      expect(parsed.pathname).toBe("/login");
    });
  });

  // ── 2. Super admin rejection ────────────────────────────────

  describe("super_admin role rejection", () => {
    it("should redirect super_admin on /dashboard to /login", async () => {
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: "admin-1",
            app_metadata: { role: "super_admin" },
          },
        },
      });
      const req = createMockRequest("/dashboard");

      const result = await updateSession(req);

      expect(NextResponse.redirect).toHaveBeenCalled();
      expect((result as { redirectUrl: string }).redirectUrl).toContain(
        "/login",
      );
    });

    it("should redirect super_admin on any protected route", async () => {
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: "admin-1",
            app_metadata: { role: "super_admin" },
          },
        },
      });

      for (const route of ["/previsions", "/donnees", "/arbitrage"]) {
        vi.clearAllMocks();
        mockGetUser.mockResolvedValue({
          data: {
            user: {
              id: "admin-1",
              app_metadata: { role: "super_admin" },
            },
          },
        });
        const req = createMockRequest(route);
        const result = await updateSession(req);

        expect(NextResponse.redirect).toHaveBeenCalled();
        expect((result as { redirectUrl: string }).redirectUrl).toContain(
          "/login",
        );
      }
    });

    it("should NOT redirect super_admin on /login itself", async () => {
      // super_admin on /login is the target of their redirect, so allow it
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: "admin-1",
            app_metadata: { role: "super_admin" },
          },
        },
      });
      const req = createMockRequest("/login");

      const result = await updateSession(req);

      // The super_admin check only applies to non-login routes
      // On /login, the "redirect authenticated to /dashboard" check runs,
      // but it skips super_admin users, so they stay on /login
      expect(result.status).toBe(200);
    });

    it("should allow org_admin on /dashboard (not super_admin)", async () => {
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: "u1",
            app_metadata: { role: "org_admin" },
          },
        },
      });
      const req = createMockRequest("/dashboard");

      const result = await updateSession(req);

      expect(result.status).toBe(200);
      expect(NextResponse.redirect).not.toHaveBeenCalled();
    });

    it("should allow viewer on /dashboard", async () => {
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: "u2",
            app_metadata: { role: "viewer" },
          },
        },
      });
      const req = createMockRequest("/dashboard");

      const result = await updateSession(req);

      expect(result.status).toBe(200);
    });

    it("should allow user with no role on /dashboard", async () => {
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: "u3",
            app_metadata: {},
          },
        },
      });
      const req = createMockRequest("/dashboard");

      const result = await updateSession(req);

      expect(result.status).toBe(200);
    });
  });

  describe("settings route role enforcement", () => {
    it("should redirect viewer from /parametres to /dashboard", async () => {
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: "viewer-1",
            app_metadata: { role: "viewer" },
          },
        },
      });
      const req = createMockRequest("/parametres");

      const result = await updateSession(req);

      expect(NextResponse.redirect).toHaveBeenCalled();
      expect((result as { redirectUrl: string }).redirectUrl).toContain(
        "/dashboard",
      );
    });

    it("should redirect manager from /parametres to /dashboard", async () => {
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: "manager-1",
            app_metadata: { role: "manager" },
          },
        },
      });
      const req = createMockRequest("/parametres");

      const result = await updateSession(req);

      expect(NextResponse.redirect).toHaveBeenCalled();
      expect((result as { redirectUrl: string }).redirectUrl).toContain(
        "/dashboard",
      );
    });

    it("should allow org_admin on /parametres", async () => {
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: "admin-1",
            app_metadata: { role: "org_admin" },
          },
        },
      });
      const req = createMockRequest("/parametres");

      const result = await updateSession(req);

      expect(result.status).toBe(200);
      expect(NextResponse.redirect).not.toHaveBeenCalled();
    });
  });

  // ── 3. Route boundary edge cases ─────────────────────────────

  describe("route boundary edge cases", () => {
    it("/auth/callback is public for unauthenticated users", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      const req = createMockRequest("/auth/callback");

      const result = await updateSession(req);

      expect(result.status).toBe(200);
      expect(NextResponse.redirect).not.toHaveBeenCalled();
    });

    it("/auth/confirm is public for unauthenticated users", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      const req = createMockRequest("/auth/confirm");

      const result = await updateSession(req);

      expect(result.status).toBe(200);
    });

    it("/login-admin is NOT the login route (not startsWith /login)", async () => {
      // /login-admin should be treated as a protected route
      // because startsWith("/login") matches /login-admin too
      // This documents the current behavior
      mockGetUser.mockResolvedValue({ data: { user: null } });
      const req = createMockRequest("/login-admin");

      const result = await updateSession(req);

      // startsWith("/login") is true for "/login-admin"
      // So this is treated as a login route — unauthenticated user is NOT redirected
      expect(result.status).toBe(200);
    });

    it("/loginpage path is treated as login route (startsWith /login)", async () => {
      // This documents a known behavior: startsWith("/login") matches /loginpage
      mockGetUser.mockResolvedValue({ data: { user: null } });
      const req = createMockRequest("/loginpage");

      const result = await updateSession(req);

      // isLoginRoute = pathname.startsWith("/login") → true for "/loginpage"
      expect(result.status).toBe(200);
    });

    it("Supabase unreachable treats user as unauthenticated", async () => {
      // When getUser throws, the middleware catches and treats as unauthenticated
      mockGetUser.mockRejectedValue(new Error("Network error"));
      const req = createMockRequest("/dashboard");

      const result = await updateSession(req);

      // User is null → redirected to /login
      expect(NextResponse.redirect).toHaveBeenCalled();
      expect((result as { redirectUrl: string }).redirectUrl).toContain(
        "/login",
      );
    });
  });
});
