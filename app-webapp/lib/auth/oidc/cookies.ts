import type { NextRequest, NextResponse } from "next/server";
import { getConfiguredAuthAppOrigin } from "@/lib/auth/origin";
import {
  ACCESS_TOKEN_COOKIE,
  LOGIN_NEXT_COOKIE,
  LOGIN_STATE_COOKIE,
  LOGIN_VERIFIER_COOKIE,
  REFRESH_TOKEN_COOKIE,
  SESSION_COOKIE,
} from "./types";

export function secureCookie(request: NextRequest): boolean {
  const configuredOrigin = getConfiguredAuthAppOrigin();
  if (configuredOrigin) {
    return configuredOrigin.startsWith("https://");
  }

  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedProto) {
    const firstProto = forwardedProto.split(",")[0]?.trim().toLowerCase();
    if (firstProto === "https") {
      return true;
    }
    if (firstProto === "http") {
      return false;
    }
  }

  return request.nextUrl.protocol === "https:";
}

export function setAuthCookies(
  response: NextResponse,
  request: NextRequest,
  payload: {
    accessToken: string;
    refreshToken: string | null;
    sessionToken: string;
    accessTokenMaxAge: number;
    refreshTokenMaxAge: number;
  },
): void {
  const secure = secureCookie(request);
  response.cookies.set(ACCESS_TOKEN_COOKIE, payload.accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(60, payload.accessTokenMaxAge),
  });

  if (payload.refreshToken) {
    response.cookies.set(REFRESH_TOKEN_COOKIE, payload.refreshToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: Math.max(300, payload.refreshTokenMaxAge),
    });
  } else {
    response.cookies.delete(REFRESH_TOKEN_COOKIE);
  }

  response.cookies.set(SESSION_COOKIE, payload.sessionToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(300, payload.refreshTokenMaxAge),
  });
}

export function clearAuthCookies(response: NextResponse): void {
  response.cookies.delete(ACCESS_TOKEN_COOKIE);
  response.cookies.delete(REFRESH_TOKEN_COOKIE);
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete(LOGIN_STATE_COOKIE);
  response.cookies.delete(LOGIN_VERIFIER_COOKIE);
  response.cookies.delete(LOGIN_NEXT_COOKIE);
}
