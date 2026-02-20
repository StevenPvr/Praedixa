import crypto from "node:crypto";
import { Buffer } from "node:buffer";
import type { Page } from "@playwright/test";

type OidcApp = "webapp" | "admin";

const APP_COOKIE_NAMES: Record<
  OidcApp,
  {
    accessToken: string;
    refreshToken: string;
    session: string;
  }
> = {
  webapp: {
    accessToken: "prx_web_at",
    refreshToken: "prx_web_rt",
    session: "prx_web_sess",
  },
  admin: {
    accessToken: "prx_admin_at",
    refreshToken: "prx_admin_rt",
    session: "prx_admin_sess",
  },
};

interface OidcCookieAuthOptions {
  app: OidcApp;
  baseUrl: string;
  sessionSecret: string;
  clientId: string;
  userId: string;
  email: string;
  role: string;
  organizationId?: string | null;
  siteId?: string | null;
  accessTokenTtlSeconds?: number;
  refreshTokenValue?: string;
}

interface SignedSession {
  sub: string;
  email: string;
  role: string;
  organizationId: string | null;
  siteId: string | null;
  accessTokenExp: number;
  issuedAt: number;
}

function toBase64Url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createUnsignedJwt(payload: Record<string, unknown>): string {
  const header = toBase64Url(JSON.stringify({ alg: "none", typ: "JWT" }));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  return `${header}.${encodedPayload}.sig`;
}

function signSessionPayload(payload: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createSignedSessionToken(
  session: SignedSession,
  secret: string,
): string {
  const payload = toBase64Url(JSON.stringify(session));
  const signature = signSessionPayload(payload, secret);
  return `${payload}.${signature}`;
}

export async function applyOidcAuthCookies(
  page: Page,
  options: OidcCookieAuthOptions,
): Promise<void> {
  const {
    app,
    baseUrl,
    sessionSecret,
    clientId,
    userId,
    email,
    role,
    organizationId = null,
    siteId = null,
    accessTokenTtlSeconds = 60 * 60,
    refreshTokenValue = "mock-refresh-token-e2e",
  } = options;

  const now = Math.floor(Date.now() / 1000);
  const exp = now + Math.max(120, accessTokenTtlSeconds);
  const cookieNames = APP_COOKIE_NAMES[app];

  const accessToken = createUnsignedJwt({
    sub: userId,
    email,
    role,
    exp,
    iat: now,
    iss: "https://sso.e2e.local/realms/praedixa",
    aud: clientId,
    organization_id: organizationId,
    site_id: siteId,
  });

  const sessionToken = createSignedSessionToken(
    {
      sub: userId,
      email,
      role,
      organizationId,
      siteId,
      accessTokenExp: exp,
      issuedAt: now,
    },
    sessionSecret,
  );

  await page.context().addCookies([
    {
      name: cookieNames.accessToken,
      value: accessToken,
      url: baseUrl,
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
    {
      name: cookieNames.refreshToken,
      value: refreshTokenValue,
      url: baseUrl,
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
    {
      name: cookieNames.session,
      value: sessionToken,
      url: baseUrl,
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}
