"use client";

import { createContext, useContext, type ReactNode } from "react";

export interface SiteScopeOption {
  id: string;
  label: string;
  code: string | null;
}

export interface SiteScopeContextValue {
  selectedSiteId: string | null;
  isSiteLocked: boolean;
  canSelectAllSites: boolean;
  sites: SiteScopeOption[];
  setSelectedSiteId: (siteId: string | null) => void;
  appendSiteParam: (
    url: string,
    options?: { forceWhenLocked?: boolean },
  ) => string;
}

const SiteScopeContext = createContext<SiteScopeContextValue>({
  selectedSiteId: null,
  isSiteLocked: false,
  canSelectAllSites: false,
  sites: [],
  setSelectedSiteId: () => undefined,
  appendSiteParam: (url: string) => url,
});

export function SiteScopeProvider({
  value,
  children,
}: {
  value: SiteScopeContextValue;
  children: ReactNode;
}) {
  return (
    <SiteScopeContext.Provider value={value}>
      {children}
    </SiteScopeContext.Provider>
  );
}

export function useSiteScope(): SiteScopeContextValue {
  return useContext(SiteScopeContext);
}
