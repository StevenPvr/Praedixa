import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCookies = vi.fn();
const mockVerifySession = vi.fn();
const mockGetOidcEnv = vi.fn();
const mockIsSessionExpired = vi.fn();

let cookieValue: string | undefined;

vi.mock("next/headers", () => ({
  cookies: (...args: unknown[]) => mockCookies(...args),
}));

vi.mock("@/lib/auth/oidc", () => ({
  SESSION_COOKIE: "prx_web_sess",
  isSessionExpired: (...args: unknown[]) => mockIsSessionExpired(...args),
  verifySession: (...args: unknown[]) => mockVerifySession(...args),
  getOidcEnv: (...args: unknown[]) => mockGetOidcEnv(...args),
}));

import { getSession, getUser, getSafeCurrentUser } from "../server";

function sessionFixture(role = "org_admin") {
  return {
    sub: "user-1",
    email: "ops@praedixa.com",
    role,
    organizationId: "org-1",
    siteId: "site-1",
    accessTokenExp: 2000000000,
    issuedAt: 1900000000,
    sessionExpiresAt: 2000003600,
    accessTokenHash: "access-hash",
    refreshTokenHash: "refresh-hash",
  };
}

describe("auth server helpers (webapp)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookieValue = undefined;

    mockCookies.mockResolvedValue({
      get: (name: string) => {
        if (name !== "prx_web_sess" || !cookieValue) return undefined;
        return { name, value: cookieValue };
      },
    });

    mockGetOidcEnv.mockReturnValue({
      sessionSecret: "test-session-secret",
    });
    mockIsSessionExpired.mockReturnValue(false);
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

  it("returns null when the verified session is expired", async () => {
    cookieValue = "signed-session";
    mockIsSessionExpired.mockReturnValueOnce(true);

    const session = await getSession();

    expect(session).toBeNull();
  });

  it("maps getUser payload from session", async () => {
    cookieValue = "signed-session";

    const user = await getUser();

    expect(user).toEqual({
      id: "user-1",
      email: "ops@praedixa.com",
      role: "org_admin",
      organization_id: "org-1",
      site_id: "site-1",
    });
  });

  it("maps getSafeCurrentUser payload from session", async () => {
    cookieValue = "signed-session";

    const safeUser = await getSafeCurrentUser();

    expect(safeUser).toEqual({
      id: "user-1",
      email: "ops@praedixa.com",
      firstName: "ops",
      organizationId: "org-1",
      role: "org_admin",
      siteId: "site-1",
    });
  });

  it("returns null safe user when no session", async () => {
    const safeUser = await getSafeCurrentUser();

    expect(safeUser).toBeNull();
  });
});
