import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCookies = vi.fn();
const mockVerifySession = vi.fn();
const mockGetOidcEnv = vi.fn();

let cookieValue: string | undefined;

vi.mock("next/headers", () => ({
  cookies: (...args: unknown[]) => mockCookies(...args),
}));

vi.mock("@/lib/auth/oidc", () => ({
  SESSION_COOKIE: "prx_admin_sess",
  verifySession: (...args: unknown[]) => mockVerifySession(...args),
  getOidcEnv: (...args: unknown[]) => mockGetOidcEnv(...args),
}));

import { getSession, getUser } from "../server";

function sessionFixture() {
  return {
    sub: "admin-1",
    email: "admin@praedixa.com",
    role: "super_admin",
    organizationId: "org-1",
    siteId: "site-1",
    accessTokenExp: 2000000000,
    issuedAt: 1900000000,
  };
}

describe("auth server helpers (admin)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookieValue = undefined;

    mockCookies.mockResolvedValue({
      get: (name: string) => {
        if (name !== "prx_admin_sess" || !cookieValue) return undefined;
        return { name, value: cookieValue };
      },
    });

    mockGetOidcEnv.mockReturnValue({
      sessionSecret: "test-session-secret",
    });
    mockVerifySession.mockResolvedValue(sessionFixture());
  });

  it("returns null when session cookie is missing", async () => {
    const session = await getSession();

    expect(session).toBeNull();
    expect(mockVerifySession).not.toHaveBeenCalled();
  });

  it("returns verified session when cookie is present", async () => {
    cookieValue = "signed-session";

    const session = await getSession();

    expect(session).toEqual(sessionFixture());
    expect(mockVerifySession).toHaveBeenCalledWith(
      "signed-session",
      "test-session-secret",
    );
  });

  it("returns null when verification throws", async () => {
    cookieValue = "signed-session";
    mockVerifySession.mockRejectedValueOnce(new Error("invalid signature"));

    const session = await getSession();

    expect(session).toBeNull();
  });

  it("maps session to user payload", async () => {
    cookieValue = "signed-session";

    const user = await getUser();

    expect(user).toEqual({
      id: "admin-1",
      email: "admin@praedixa.com",
      role: "super_admin",
      organization_id: "org-1",
      site_id: "site-1",
    });
  });

  it("returns null user when no session", async () => {
    const user = await getUser();

    expect(user).toBeNull();
  });
});
