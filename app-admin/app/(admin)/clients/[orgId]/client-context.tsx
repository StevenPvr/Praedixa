"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

interface SiteHierarchy {
  id: string;
  name: string;
  city?: string;
  departments: Array<{
    id: string;
    name: string;
    employeeCount: number;
  }>;
}

interface ClientContextValue {
  orgId: string;
  orgName: string;
  selectedSiteId: string | null;
  setSelectedSiteId: (id: string | null) => void;
  hierarchy: SiteHierarchy[];
}

const ClientContext = createContext<ClientContextValue | null>(null);

export function useClientContext(): ClientContextValue {
  const ctx = useContext(ClientContext);
  if (!ctx)
    throw new Error("useClientContext must be used within ClientProvider");
  return ctx;
}

type ClientProviderProps = Readonly<{
  orgId: string;
  orgName: string;
  selectedSiteId: string | null;
  setSelectedSiteId: (id: string | null) => void;
  hierarchy: SiteHierarchy[];
  children: ReactNode;
}>;

export function ClientProvider({
  orgId,
  orgName,
  selectedSiteId,
  setSelectedSiteId,
  hierarchy,
  children,
}: ClientProviderProps) {
  const value = useMemo(
    () => ({ orgId, orgName, selectedSiteId, setSelectedSiteId, hierarchy }),
    [orgId, orgName, selectedSiteId, setSelectedSiteId, hierarchy],
  );

  return (
    <ClientContext.Provider value={value}>{children}</ClientContext.Provider>
  );
}

export type { ClientContextValue, SiteHierarchy };
