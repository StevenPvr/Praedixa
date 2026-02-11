"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { UserUxPreferences } from "@praedixa/shared-types";
import { apiGet, apiPatch } from "@/lib/api/client";
import { getValidAccessToken } from "@/lib/auth/client";
import { AppLocale, FALLBACK_LOCALE, translate } from "@/lib/i18n/messages";

const LOCALE_STORAGE_KEY = "praedixa_locale";

async function getToken() {
  return getValidAccessToken();
}

interface I18nContextValue {
  locale: AppLocale;
  setLocale: (next: AppLocale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: FALLBACK_LOCALE,
  setLocale: () => undefined,
  t: (key: string) => translate(FALLBACK_LOCALE, key),
});

function parseLocale(value: string | null): AppLocale | null {
  if (value === "fr" || value === "en") return value;
  return null;
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  const candidate = window.localStorage as Partial<Storage> | undefined;
  if (!candidate) return null;
  if (
    typeof candidate.getItem !== "function" ||
    typeof candidate.setItem !== "function"
  ) {
    return null;
  }
  return candidate as Storage;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(FALLBACK_LOCALE);

  useEffect(() => {
    const storage = getStorage();
    const storedLocale = parseLocale(
      storage?.getItem(LOCALE_STORAGE_KEY) ?? null,
    );
    if (storedLocale) {
      setLocaleState(storedLocale);
    }

    let cancelled = false;
    void (async () => {
      try {
        const response = await apiGet<UserUxPreferences>(
          "/api/v1/users/me/preferences",
          getToken,
        );
        if (cancelled) return;
        const serverLocale = parseLocale(response.data.language ?? null);
        if (!serverLocale) return;
        setLocaleState(serverLocale);
        storage?.setItem(LOCALE_STORAGE_KEY, serverLocale);
      } catch {
        // Keep local fallback when preferences endpoint is unavailable.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const setLocale = useCallback((next: AppLocale) => {
    setLocaleState(next);
    const storage = getStorage();
    storage?.setItem(LOCALE_STORAGE_KEY, next);
    void apiPatch<UserUxPreferences>(
      "/api/v1/users/me/preferences",
      { language: next },
      getToken,
    ).catch(() => undefined);
  }, []);

  const t = useCallback((key: string) => translate(locale, key), [locale]);

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
