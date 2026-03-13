"use client";

import { useEffect, useState } from "react";

interface GetValidAccessTokenOptions {
  minTtlSeconds?: number;
}

interface SessionResponse {
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
}

const DEFAULT_MIN_TTL_SECONDS = 60;
const inFlightByMinTtl = new Map<number, Promise<SessionResponse | null>>();
let cachedSession: CachedSession | null = null;

function clampMinTtl(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_MIN_TTL_SECONDS;
  return Math.max(0, Math.min(3600, Math.floor(value)));
}

function cacheSession(payload: SessionResponse): void {
  cachedSession = {
    session: payload,
  };
}

function clearSessionCache(): void {
  cachedSession = null;
  inFlightByMinTtl.clear();
}

function getCachedSession(): SessionResponse | null {
  return cachedSession?.session ?? null;
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

    if (!response.ok) {
      clearSessionCache();
      return null;
    }
    const payload = (await response.json()) as SessionResponse;
    if (!payload?.user) {
      clearSessionCache();
      return null;
    }
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

  const existingInFlight = inFlightByMinTtl.get(minTtlSeconds);
  if (existingInFlight) {
    await existingInFlight;
    return null;
  }

  const inFlight = fetchSession(minTtlSeconds);
  inFlightByMinTtl.set(minTtlSeconds, inFlight);

  try {
    await inFlight;
    return null;
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
  const [user, setUser] = useState<CurrentUser | null>(
    () => getCachedSession()?.user ?? null,
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
