"use client";

import { useApiGet } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";

import { AsyncDataTableBlock } from "./async-data-table-block";
import { buildProofColumns } from "./config-columns";
import type { ProofPack } from "./config-types";

interface ProofPacksSectionProps {
  orgId: string;
}

export function ProofPacksSection({ orgId }: ProofPacksSectionProps) {
  const { data, loading, error, refetch } = useApiGet<ProofPack[]>(
    ADMIN_ENDPOINTS.orgProofPacks(orgId),
  );

  return (
    <AsyncDataTableBlock
      title="Packs de preuves"
      loading={loading}
      error={error}
      onRetry={refetch}
      columns={buildProofColumns()}
      data={data ?? []}
      getRowKey={(row) => row.id}
    />
  );
}
