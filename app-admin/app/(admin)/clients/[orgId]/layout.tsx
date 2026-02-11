"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { SkeletonCard } from "@praedixa/ui";
import { useApiGet } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { ErrorFallback } from "@/components/error-fallback";
import { OrgHeader } from "@/components/org-header";
import { ClientTabsNav } from "@/components/client-tabs-nav";
import { SiteTree } from "@/components/site-tree";
import { ClientProvider } from "./client-context";
import type { SiteHierarchy } from "./client-context";
import type { PlanTier } from "@/components/plan-badge";
import type { OrgStatus } from "@/components/org-status-badge";

interface OrgDetail {
  id: string;
  name: string;
  slug: string;
  status: OrgStatus;
  plan: PlanTier;
  contactEmail: string;
  sites: SiteHierarchy[];
}

export default function ClientWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ orgId: string }>();
  const orgId = params.orgId;
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  const { data, loading, error, refetch } = useApiGet<OrgDetail>(
    ADMIN_ENDPOINTS.organization(orgId),
  );

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error || !data) {
    return (
      <ErrorFallback
        message={error ?? "Client introuvable"}
        onRetry={refetch}
      />
    );
  }

  const basePath = `/clients/${encodeURIComponent(orgId)}`;
  const sites = data.sites ?? [];

  return (
    <ClientProvider
      orgId={orgId}
      orgName={data.name}
      selectedSiteId={selectedSiteId}
      setSelectedSiteId={setSelectedSiteId}
      hierarchy={sites}
    >
      <div className="-m-4 sm:-m-6">
        <OrgHeader name={data.name} plan={data.plan} status={data.status} />
        <ClientTabsNav basePath={basePath} />

        <div className="flex">
          {/* Site tree panel */}
          <aside className="hidden w-60 shrink-0 border-r border-neutral-200 p-4 lg:block">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-neutral-400">
              Sites
            </h3>
            <SiteTree
              hierarchy={sites}
              selectedSiteId={selectedSiteId}
              onSelectSite={setSelectedSiteId}
            />
          </aside>

          {/* Tab content */}
          <div className="min-w-0 flex-1 p-4 sm:p-6">{children}</div>
        </div>
      </div>
    </ClientProvider>
  );
}
