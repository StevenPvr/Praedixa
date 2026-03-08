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
    permissions: string[];
    organizationId: string | null;
    siteId: string | null;
  };
}

interface CurrentUser {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  organizationId: string | null;
  siteId: string | null;
}

interface CurrentUserState {
  user: CurrentUser | null;
  loading: boolean;
}

const DEFAULT_MIN_TTL_SECONDS = 60;
const inFlightByMinTtl = new Map<number, Promise<SessionResponse | null>>();
let cachedSession: SessionResponse | null = null;

function clampMinTtl(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_MIN_TTL_SECONDS;
  return Math.max(0, Math.min(3600, Math.floor(value)));
}

function cacheSession(payload: SessionResponse): void {
  cachedSession = payload;
}

function clearSessionCache(): void {
  cachedSession = null;
  inFlightByMinTtl.clear();
}

function getCachedSession(minTtlSeconds: number): SessionResponse | null {
  void minTtlSeconds;
  return cachedSession;
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
    const normalizedPayload: SessionResponse = {
      user: {
        ...payload.user,
        permissions: Array.isArray(payload.user.permissions)
          ? payload.user.permissions.filter(
              (permission): permission is string =>
                typeof permission === "string" && permission.length > 0,
            )
          : [],
      },
    };
    cacheSession(normalizedPayload);
    return normalizedPayload;
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
    return null;
  }

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

export function useCurrentUserState(): CurrentUserState {
  const [state, setState] = useState<CurrentUserState>(() => {
    const cachedUser = cachedSession?.user ?? null;
    return {
      user: cachedUser,
      loading: cachedUser == null,
    };
  });

  useEffect(() => {
    fetchSession(DEFAULT_MIN_TTL_SECONDS).then((session) => {
      if (!session) {
        setState({ user: null, loading: false });
        return;
      }
      setState({ user: session.user, loading: false });
    });
  }, []);

  return state;
}

export function useCurrentUser(): CurrentUser | null {
  return useCurrentUserState().user;
}
