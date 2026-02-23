"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  UiDensity,
  UserUxPreferences,
  UserUxPreferencesPatch,
} from "@praedixa/shared-types";
import { apiGet, apiPatch } from "@/lib/api/client";
import { getValidAccessToken } from "@/lib/auth/client";

const UX_PREFS_STORAGE_KEY = "praedixa_ux_preferences_v2";
const PATCH_DEBOUNCE_MS = 300;
const SIDEBAR_MIN = 236;
const SIDEBAR_MAX = 360;

interface UxPreferencesState {
  density: UiDensity;
  nav: {
    sidebarCollapsed: boolean;
    sidebarWidth: number;
  };
  theme: {
    mode: "light" | "dark" | "system";
  };
}

const DEFAULT_PREFERENCES: UxPreferencesState = {
  density: "compact",
  nav: {
    sidebarCollapsed: false,
    sidebarWidth: 268,
  },
  theme: {
    mode: "light",
  },
};

function clampSidebarWidth(value: unknown): number {
  const width = Number(value);
  if (!Number.isFinite(width)) return DEFAULT_PREFERENCES.nav.sidebarWidth;
  return Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, Math.round(width)));
}

function parseDensity(value: unknown): UiDensity {
  return value === "comfortable" ? "comfortable" : "compact";
}

function parseThemeMode(value: unknown): "light" | "dark" | "system" {
  if (value === "dark" || value === "system") return value;
  return "light";
}

function fromUnknown(source: unknown): Partial<UxPreferencesState> {
  if (!source || typeof source !== "object") return {};
  const value = source as Record<string, unknown>;
  const nav =
    value.nav && typeof value.nav === "object"
      ? (value.nav as Record<string, unknown>)
      : null;
  const theme =
    value.theme && typeof value.theme === "object"
      ? (value.theme as Record<string, unknown>)
      : null;

  const next: Partial<UxPreferencesState> = {};
  if ("density" in value) {
    next.density = parseDensity(value.density);
  }
  if (nav) {
    next.nav = {
      sidebarCollapsed:
        nav.sidebarCollapsed === true
          ? true
          : DEFAULT_PREFERENCES.nav.sidebarCollapsed,
      sidebarWidth: clampSidebarWidth(nav.sidebarWidth),
    };
  }
  if (theme) {
    next.theme = {
      mode: parseThemeMode(theme.mode),
    };
  }
  return next;
}

function mergePreferences(
  base: UxPreferencesState,
  update: Partial<UxPreferencesState>,
): UxPreferencesState {
  return {
    density: update.density ?? base.density,
    nav: {
      sidebarCollapsed:
        update.nav?.sidebarCollapsed ?? base.nav.sidebarCollapsed,
      sidebarWidth: clampSidebarWidth(
        update.nav?.sidebarWidth ?? base.nav.sidebarWidth,
      ),
    },
    theme: {
      mode: update.theme?.mode ?? base.theme.mode,
    },
  };
}

function toPatchPayload(state: UxPreferencesState): UserUxPreferencesPatch {
  return {
    density: state.density,
  };
}

function toStoragePayload(state: UxPreferencesState): string {
  return JSON.stringify(state);
}

function fromStoragePayload(raw: string | null): Partial<UxPreferencesState> {
  if (!raw) return {};
  try {
    return fromUnknown(JSON.parse(raw));
  } catch {
    return {};
  }
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

export function useUxPreferences() {
  const [state, setState] = useState<UxPreferencesState>(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const patchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const patchServer = useCallback(async (next: UxPreferencesState) => {
    const token = await getValidAccessToken();
    if (!token) return;
    await apiPatch<UserUxPreferences>(
      "/api/v1/users/me/preferences",
      toPatchPayload(next),
      async () => token,
    );
  }, []);

  const scheduleServerPatch = useCallback(
    (next: UxPreferencesState) => {
      if (patchTimerRef.current) {
        clearTimeout(patchTimerRef.current);
      }
      patchTimerRef.current = setTimeout(() => {
        void patchServer(next).catch(() => undefined);
      }, PATCH_DEBOUNCE_MS);
    },
    [patchServer],
  );

  const persist = useCallback(
    (next: UxPreferencesState, options?: { skipServer?: boolean }) => {
      try {
        getStorage()?.setItem(UX_PREFS_STORAGE_KEY, toStoragePayload(next));
      } catch {
        // Best effort local persistence.
      }
      if (!options?.skipServer) {
        scheduleServerPatch(next);
      }
    },
    [scheduleServerPatch],
  );

  useEffect(() => {
    const local = fromStoragePayload(
      getStorage()?.getItem(UX_PREFS_STORAGE_KEY) ?? null,
    );
    const merged = mergePreferences(DEFAULT_PREFERENCES, local);
    setState(merged);

    let cancelled = false;
    void (async () => {
      try {
        const token = await getValidAccessToken();
        if (!token) {
          if (!cancelled) setLoaded(true);
          return;
        }
        const response = await apiGet<UserUxPreferences>(
          "/api/v1/users/me/preferences",
          async () => token,
        );
        if (cancelled) return;

        const server = fromUnknown(response.data);
        const next = mergePreferences(merged, server);
        setState(next);
        persist(next, { skipServer: true });
        setLoaded(true);
      } catch {
        if (!cancelled) {
          setError("Impossible de synchroniser les preferences utilisateur.");
          setLoaded(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (patchTimerRef.current) {
        clearTimeout(patchTimerRef.current);
      }
    };
  }, [persist]);

  const update = useCallback(
    (updater: (prev: UxPreferencesState) => UxPreferencesState) => {
      setState((prev) => {
        const next = updater(prev);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const setSidebarCollapsed = useCallback(
    (sidebarCollapsed: boolean) => {
      update((prev) => ({
        ...prev,
        nav: { ...prev.nav, sidebarCollapsed },
      }));
    },
    [update],
  );

  const setSidebarWidth = useCallback(
    (sidebarWidth: number) => {
      update((prev) => ({
        ...prev,
        nav: { ...prev.nav, sidebarWidth: clampSidebarWidth(sidebarWidth) },
      }));
    },
    [update],
  );

  const setThemeMode = useCallback(
    (mode: "light" | "dark" | "system") => {
      update((prev) => ({
        ...prev,
        theme: { mode },
      }));
    },
    [update],
  );

  return useMemo(
    () => ({
      preferences: state,
      loaded,
      error,
      setSidebarCollapsed,
      setSidebarWidth,
      setThemeMode,
    }),
    [state, loaded, error, setSidebarCollapsed, setSidebarWidth, setThemeMode],
  );
}
