"use client";

import { useEffect, useState } from "react";
import { isDirectAdminApiMode } from "@/lib/api/client";

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
  accessToken?: string;
  accessTokenExpiresAt: number;
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

interface CachedSession {
  accessToken: string | null;
  accessTokenExpiresAt: number | null;
  user: CurrentUser;
}

interface FetchSessionOptions {
  includeAccessToken?: boolean;
}

const DEFAULT_MIN_TTL_SECONDS = 60;
const inFlightRequests = new Map<string, Promise<CachedSession | null>>();
let cachedSession: CachedSession | null = null;

function clampMinTtl(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_MIN_TTL_SECONDS;
  return Math.max(0, Math.min(3600, Math.floor(value)));
}

function cacheSession(payload: CachedSession): void {
  cachedSession = payload;
}

function clearSessionCache(): void {
  cachedSession = null;
  inFlightRequests.clear();
}

function hasRequiredTtl(
  accessTokenExpiresAt: number | null,
  minTtlSeconds: number,
): boolean {
  if (accessTokenExpiresAt == null) {
    return false;
  }

  const nowEpochSeconds = Math.floor(Date.now() / 1000);
  return accessTokenExpiresAt - nowEpochSeconds > minTtlSeconds;
}

function getCachedSession(input: {
  minTtlSeconds: number;
  requireAccessToken: boolean;
}): CachedSession | null {
  if (!cachedSession) {
    return null;
  }

  if (
    !hasRequiredTtl(cachedSession.accessTokenExpiresAt, input.minTtlSeconds)
  ) {
    return null;
  }

  if (input.requireAccessToken && !cachedSession.accessToken) {
    return null;
  }

  return cachedSession;
}

function getInFlightKey(input: {
  minTtlSeconds: number;
  includeAccessToken: boolean;
}): string {
  return `${input.minTtlSeconds}:${input.includeAccessToken ? "token" : "user"}`;
}

async function fetchSession(
  minTtlSeconds: number,
  options: FetchSessionOptions = {},
): Promise<CachedSession | null> {
  const includeAccessToken = options.includeAccessToken ?? false;
  const searchParams = new URLSearchParams({
    min_ttl: `${minTtlSeconds}`,
  });
  if (includeAccessToken) {
    searchParams.set("include_access_token", "1");
  }

  try {
    const response = await fetch(`/auth/session?${searchParams.toString()}`, {
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
    const accessTokenExpiresAt =
      Number.isFinite(payload.accessTokenExpiresAt) &&
      payload.accessTokenExpiresAt > 0
        ? Math.floor(payload.accessTokenExpiresAt)
        : null;

    const normalizedPayload: CachedSession = {
      accessToken:
        accessTokenExpiresAt != null &&
        typeof payload.accessToken === "string" &&
        payload.accessToken.length > 0
          ? payload.accessToken
          : null,
      accessTokenExpiresAt,
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
  const requireAccessToken = isDirectAdminApiMode();
  const minTtlSeconds = clampMinTtl(
    options.minTtlSeconds ?? DEFAULT_MIN_TTL_SECONDS,
  );

  const cached = getCachedSession({
    minTtlSeconds,
    requireAccessToken,
  });
  if (cached) {
    return requireAccessToken ? cached.accessToken : null;
  }

  const inFlightKey = getInFlightKey({
    minTtlSeconds,
    includeAccessToken: requireAccessToken,
  });
  const existingInFlight = inFlightRequests.get(inFlightKey);
  if (existingInFlight) {
    const session = await existingInFlight;
    return requireAccessToken ? (session?.accessToken ?? null) : null;
  }

  const inFlight = fetchSession(minTtlSeconds, {
    includeAccessToken: requireAccessToken,
  });
  inFlightRequests.set(inFlightKey, inFlight);

  try {
    const session = await inFlight;
    return requireAccessToken ? (session?.accessToken ?? null) : null;
  } finally {
    if (inFlightRequests.get(inFlightKey) === inFlight) {
      inFlightRequests.delete(inFlightKey);
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
    const cached = getCachedSession({
      minTtlSeconds: DEFAULT_MIN_TTL_SECONDS,
      requireAccessToken: false,
    });
    if (cached) {
      setState({ user: cached.user, loading: false });
      return;
    }

    const inFlightKey = getInFlightKey({
      minTtlSeconds: DEFAULT_MIN_TTL_SECONDS,
      includeAccessToken: false,
    });
    const inFlight =
      inFlightRequests.get(inFlightKey) ??
      fetchSession(DEFAULT_MIN_TTL_SECONDS, { includeAccessToken: false });

    if (!inFlightRequests.has(inFlightKey)) {
      inFlightRequests.set(inFlightKey, inFlight);
    }

    inFlight
      .then((session) => {
        if (!session) {
          setState({ user: null, loading: false });
          return;
        }
        setState({ user: session.user, loading: false });
      })
      .finally(() => {
        if (inFlightRequests.get(inFlightKey) === inFlight) {
          inFlightRequests.delete(inFlightKey);
        }
      })
      .catch(() => undefined);
  }, []);

  return state;
}

export function useCurrentUser(): CurrentUser | null {
  return useCurrentUserState().user;
}
