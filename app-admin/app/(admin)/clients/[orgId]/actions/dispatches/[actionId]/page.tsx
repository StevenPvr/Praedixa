"use client";

import { useParams } from "next/navigation";
import type { ActionDispatchDetailResponse } from "@praedixa/shared-types/api";
import { SkeletonCard } from "@praedixa/ui";

import { ErrorFallback } from "@/components/error-fallback";
import { useApiGet } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { useCurrentUser } from "@/lib/auth/client";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { useClientContext } from "../../../client-context";
import { ReadOnlyDetailHeader } from "../../../read-only-detail";
import { ActionDispatchDetailContent } from "./action-dispatch-detail-view";

function buildHeader(orgId: string) {
  return {
    backHref: `/clients/${encodeURIComponent(orgId)}/actions`,
    backLabel: "Retour aux actions",
    title: "Detail d'action",
    description: "Pilotage du dispatch, des retries et du fallback humain.",
  };
}

export default function ActionDispatchDetailPage() {
  const { orgId } = useClientContext();
  const currentUser = useCurrentUser();
  const canManageDispatch = hasAnyPermission(currentUser?.permissions, [
    "admin:org:write",
  ]);
  const actionId = useParams<{ actionId: string }>().actionId;
  const { data, loading, error, refetch } =
    useApiGet<ActionDispatchDetailResponse>(
      actionId
        ? ADMIN_ENDPOINTS.orgActionDispatchDetail(orgId, actionId)
        : null,
    );

  return (
    <div className="space-y-6">
      <ReadOnlyDetailHeader {...buildHeader(orgId)} />
      {!actionId ? (
        <ErrorFallback message="Aucun dispatch n'a ete selectionne." />
      ) : loading ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : error || !data ? (
        <ErrorFallback
          message={error ?? "Impossible de charger le detail d'action"}
          onRetry={refetch}
        />
      ) : (
        <ActionDispatchDetailContent
          orgId={orgId}
          data={data}
          currentPermissions={currentUser?.permissions}
          canManageDispatch={canManageDispatch}
          onRefresh={refetch}
        />
      )}
    </div>
  );
}
