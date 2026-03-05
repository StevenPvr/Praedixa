"use client";

import { useEffect, useState } from "react";

interface GetValidAccessTokenOptions {
  minTtlSeconds?: number;
}

interface SessionResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    role: string;
    organizationId: string | null;
    siteId: string | null;
  };
}

interface CurrentUser {
  id: string;
  email: string;
  role: string;
  organizationId: string | null;
  siteId: string | null;
}

interface CachedSession {
  session: SessionResponse;
  accessTokenExpEpochSeconds: number | null;
}

const DEFAULT_MIN_TTL_SECONDS = 60;
const inFlightByMinTtl = new Map<number, Promise<SessionResponse | null>>();
let cachedSession: CachedSession | null = null;

function clampMinTtl(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_MIN_TTL_SECONDS;
  return Math.max(0, Math.min(3600, Math.floor(value)));
}

function base64UrlDecode(value: string): string | null {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);

  if (typeof atob === "function") {
    return atob(padded);
  }

  const maybeBuffer = (
    globalThis as {
      Buffer?: {
        from: (input: string, encoding: string) => { toString: (encoding: string) => string };
      };
    }
  ).Buffer;

  if (maybeBuffer) {
    return maybeBuffer.from(padded, "base64").toString("utf8");
  }

  return null;
}

function readJwtExpEpochSeconds(token: string): number | null {
  const segments = token.split(".");
  if (segments.length < 2) return null;

  const decoded = base64UrlDecode(segments[1]);
  if (!decoded) return null;

  try {
    const parsed = JSON.parse(decoded) as { exp?: unknown };
    if (typeof parsed.exp !== "number" || !Number.isFinite(parsed.exp)) {
      return null;
    }
    return Math.floor(parsed.exp);
  } catch {
    return null;
  }
}

function cacheSession(payload: SessionResponse): void {
  cachedSession = {
    session: payload,
    accessTokenExpEpochSeconds: readJwtExpEpochSeconds(payload.accessToken),
  };
}

function clearSessionCache(): void {
  cachedSession = null;
  inFlightByMinTtl.clear();
}

function hasSufficientTtl(
  expEpochSeconds: number | null,
  minTtlSeconds: number,
): boolean {
  if (!expEpochSeconds) return false;
  const nowEpochSeconds = Math.floor(Date.now() / 1000);
  return expEpochSeconds - nowEpochSeconds > minTtlSeconds;
}

function getCachedSession(minTtlSeconds: number): SessionResponse | null {
  if (!cachedSession) return null;
  if (
    hasSufficientTtl(cachedSession.accessTokenExpEpochSeconds, minTtlSeconds)
  ) {
    return cachedSession.session;
  }
  return null;
}

function getFallbackCachedSession(): SessionResponse | null {
  if (!cachedSession) return null;
  if (hasSufficientTtl(cachedSession.accessTokenExpEpochSeconds, 5)) {
    return cachedSession.session;
  }
  return null;
}

async function fetchSession(
  minTtlSeconds: number,
): Promise<SessionResponse | null> {
  try {
    const response = await fetch(`/auth/session?min_ttl=${minTtlSeconds}`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) return null;
    const payload = (await response.json()) as SessionResponse;
    if (!payload?.accessToken || !payload?.user) return null;
    cacheSession(payload);
    return payload;
  } catch {
    return null;
  }
}

export async function getValidAccessToken(
  options: GetValidAccessTokenOptions = {},
): Promise<string | null> {
  const minTtlSeconds = clampMinTtl(
    options.minTtlSeconds ?? DEFAULT_MIN_TTL_SECONDS,
  );

  const cached = getCachedSession(minTtlSeconds);
  if (cached) {
    return cached.accessToken;
  }

  const existingInFlight = inFlightByMinTtl.get(minTtlSeconds);
  if (existingInFlight) {
    const session = await existingInFlight;
    return session?.accessToken ?? getFallbackCachedSession()?.accessToken ?? null;
  }

  const inFlight = fetchSession(minTtlSeconds);
  inFlightByMinTtl.set(minTtlSeconds, inFlight);

  try {
    const session = await inFlight;
    if (session?.accessToken) {
      return session.accessToken;
    }
    return getFallbackCachedSession()?.accessToken ?? null;
  } finally {
    if (inFlightByMinTtl.get(minTtlSeconds) === inFlight) {
      inFlightByMinTtl.delete(minTtlSeconds);
    }
  }
}

export async function clearAuthSession(): Promise<void> {
  try {
    await fetch("/auth/logout", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    // Best effort.
  } finally {
    clearSessionCache();
  }
}

export function useCurrentUser(): CurrentUser | null {
  const [user, setUser] = useState<CurrentUser | null>(() =>
    getCachedSession(0)?.user ?? null,
  );

  useEffect(() => {
    fetchSession(DEFAULT_MIN_TTL_SECONDS).then((session) => {
      if (!session) {
        setUser(null);
        return;
      }
      setUser(session.user);
    });
  }, []);

  return user;
}
