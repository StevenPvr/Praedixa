"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { UserUxPreferences } from "@praedixa/shared-types";
import { apiGet, apiPatch } from "@/lib/api/client";
import { AppLocale, FALLBACK_LOCALE, translate } from "@/lib/i18n/messages";

const PREFERENCES_SYNC_UNAVAILABLE_MESSAGE =
  "Preferences indisponibles. La langue reste sur la derniere valeur confirmee tant que la persistance serveur n'est pas retablie.";
const PREFERENCES_SAVE_FAILED_MESSAGE =
  "Enregistrement impossible. La preference a ete restauree a la derniere valeur confirmee.";

export type PreferencesSyncState =
  | "idle"
  | "loading"
  | "ready"
  | "saving"
  | "unavailable"
  | "error";

interface I18nContextValue {
  locale: AppLocale;
  preferencesSyncError: string | null;
  preferencesSyncState: PreferencesSyncState;
  setLocale: (next: AppLocale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: FALLBACK_LOCALE,
  preferencesSyncError: null,
  preferencesSyncState: "idle",
  setLocale: () => undefined,
  t: (key: string) => translate(FALLBACK_LOCALE, key),
});

function parseLocale(value: string | null): AppLocale | null {
  if (value === "fr" || value === "en") return value;
  return null;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(FALLBACK_LOCALE);
  const [preferencesSyncState, setPreferencesSyncState] =
    useState<PreferencesSyncState>("loading");
  const [preferencesSyncError, setPreferencesSyncError] = useState<
    string | null
  >(null);
  const confirmedLocaleRef = useRef<AppLocale>(FALLBACK_LOCALE);

  useEffect(() => {
    let cancelled = false;
    setPreferencesSyncState("loading");
    setPreferencesSyncError(null);
    void (async () => {
      try {
        const response = await apiGet<UserUxPreferences>(
          "/api/v1/users/me/preferences",
        );
        if (cancelled) return;
        const serverLocale =
          parseLocale(response.data.language ?? null) ??
          confirmedLocaleRef.current;
        const nextLocale = serverLocale;
        confirmedLocaleRef.current = nextLocale;
        setLocaleState(nextLocale);
        setPreferencesSyncState("ready");
      } catch {
        if (cancelled) return;
        setLocaleState(confirmedLocaleRef.current);
        setPreferencesSyncState("unavailable");
        setPreferencesSyncError(PREFERENCES_SYNC_UNAVAILABLE_MESSAGE);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const setLocale = useCallback(
    (next: AppLocale) => {
      if (
        preferencesSyncState === "loading" ||
        preferencesSyncState === "saving"
      ) {
        return;
      }

      if (preferencesSyncState === "unavailable") {
        setPreferencesSyncError(PREFERENCES_SYNC_UNAVAILABLE_MESSAGE);
        return;
      }

      const previousLocale = confirmedLocaleRef.current;
      if (next === previousLocale) {
        return;
      }

      setLocaleState(next);
      setPreferencesSyncState("saving");
      setPreferencesSyncError(null);
      void (async () => {
        const response = await apiPatch<UserUxPreferences>(
          "/api/v1/users/me/preferences",
          { language: next },
        );
        const persistedLocale =
          parseLocale(response.data.language ?? null) ?? next;
        confirmedLocaleRef.current = persistedLocale;
        setLocaleState(persistedLocale);
        setPreferencesSyncState("ready");
      })().catch(() => {
        confirmedLocaleRef.current = previousLocale;
        setLocaleState(previousLocale);
        setPreferencesSyncState("error");
        setPreferencesSyncError(PREFERENCES_SAVE_FAILED_MESSAGE);
      });
    },
    [preferencesSyncState],
  );

  const t = useCallback((key: string) => translate(locale, key), [locale]);

  const value = useMemo(
    () => ({
      locale,
      preferencesSyncError,
      preferencesSyncState,
      setLocale,
      t,
    }),
    [locale, preferencesSyncError, preferencesSyncState, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
