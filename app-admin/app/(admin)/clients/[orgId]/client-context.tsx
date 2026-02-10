"use client";

import { createContext, useContext } from "react";

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

export { ClientContext };
export type { ClientContextValue, SiteHierarchy };
