"use client";

import { useEffect } from "react";

interface ProviderAutoRetryProps {
  isReauth: boolean;
  safeNext: string;
  shouldAttempt: boolean;
}

export function ProviderAutoRetry({
  isReauth,
  safeNext,
  shouldAttempt,
}: ProviderAutoRetryProps) {
  useEffect(() => {
    if (!shouldAttempt) {
      return;
    }

    let cancelled = false;

    void globalThis
      .fetch("/auth/provider-status", {
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }

        const parsed = (await response.json()) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          return null;
        }

        return parsed as { healthy?: boolean };
      })
      .then((payload) => {
        if (cancelled || payload?.healthy !== true) {
          return;
        }

        const loginUrl = new URL("/auth/login", globalThis.location.origin);
        loginUrl.searchParams.set("next", safeNext);
        if (isReauth) {
          loginUrl.searchParams.set("prompt", "login");
        }
        globalThis.location.assign(loginUrl.toString());
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [isReauth, safeNext, shouldAttempt]);

  return null;
}
