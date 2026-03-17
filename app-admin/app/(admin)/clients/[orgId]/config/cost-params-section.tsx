"use client";

import { useApiGet } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";

import { AsyncDataTableBlock } from "./async-data-table-block";
import { buildCostColumns } from "./config-columns";
import type { CostParam } from "./config-types";

interface CostParamsSectionProps {
  orgId: string;
  selectedSiteId: string | null;
}

export function CostParamsSection({
  orgId,
  selectedSiteId,
}: CostParamsSectionProps) {
  const costUrl = selectedSiteId
    ? `${ADMIN_ENDPOINTS.orgCostParams(orgId)}?site_id=${encodeURIComponent(selectedSiteId)}`
    : ADMIN_ENDPOINTS.orgCostParams(orgId);

  const { data, loading, error, refetch } = useApiGet<CostParam[]>(costUrl);

  return (
    <AsyncDataTableBlock
      title="Parametres de cout"
      loading={loading}
      error={error}
      onRetry={refetch}
      columns={buildCostColumns()}
      data={data ?? []}
      getRowKey={(row) => row.id}
    />
  );
}
