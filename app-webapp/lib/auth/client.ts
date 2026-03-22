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

function isCurrentUserShape(value: unknown): value is CurrentUser {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const hasNullableString = (field: string) =>
    candidate[field] === null || typeof candidate[field] === "string";

  return (
    typeof candidate["id"] === "string" &&
    candidate["id"].length > 0 &&
    typeof candidate["email"] === "string" &&
    candidate["email"].length > 0 &&
    typeof candidate["role"] === "string" &&
    candidate["role"].length > 0 &&
    hasNullableString("organizationId") &&
    hasNullableString("siteId")
  );
}

function parseSessionResponsePayload(payload: unknown): SessionResponse | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const user = (payload as { user?: unknown }).user;
  if (!isCurrentUserShape(user)) {
    return null;
  }

  return {
    user,
  };
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
    const payload = parseSessionResponsePayload(await response.json());
    if (!payload) {
      clearSessionCache();
      return null;
    }
    cacheSession(payload);
    return payload;
  } catch {
    clearSessionCache();
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
    let cancelled = false;

    fetchSession(DEFAULT_MIN_TTL_SECONDS)
      .then((session) => {
        if (cancelled) {
          return;
        }
        if (!session) {
          setUser(null);
          return;
        }
        setUser(session.user);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  return user;
}
