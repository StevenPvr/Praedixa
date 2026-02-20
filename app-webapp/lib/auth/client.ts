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
    return payload;
  } catch {
    return null;
  }
}

export async function getValidAccessToken(
  options: GetValidAccessTokenOptions = {},
): Promise<string | null> {
  const { minTtlSeconds = 60 } = options;
  const session = await fetchSession(minTtlSeconds);
  return session?.accessToken ?? null;
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
  }
}

export function useCurrentUser(): CurrentUser | null {
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    fetchSession(0).then((session) => {
      if (!session) {
        setUser(null);
        return;
      }
      setUser(session.user);
    });
  }, []);

  return user;
}
