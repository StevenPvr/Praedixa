"use client";

import type { ActionDispatchDetailResponse } from "@praedixa/shared-types/api";

import {
  buildDispatchViewModel,
  collectMissingPermissions,
} from "./action-dispatch-detail-model";
import {
  DispatchDegradedState,
  DispatchExecutionCard,
  DispatchPayloadRefsCard,
  DispatchRuntimePanels,
  DispatchStatusCards,
  DispatchTimelineCard,
} from "./action-dispatch-detail-sections";

type ActionDispatchDetailContentProps = Readonly<{
  orgId: string;
  data: ActionDispatchDetailResponse;
  currentPermissions: readonly string[] | undefined;
  canManageDispatch: boolean;
  onRefresh: () => void;
}>;

export function ActionDispatchDetailContent({
  orgId,
  data,
  currentPermissions,
  canManageDispatch,
  onRefresh,
}: ActionDispatchDetailContentProps) {
  const viewModel = buildDispatchViewModel(data);
  const missingWritebackPermissions = collectMissingPermissions(
    currentPermissions,
    data.permissions.permissionKeys,
  );
  const contractAllowsWriteback = data.permissions.allowedByContract;

  return (
    <>
      <DispatchStatusCards data={data} />
      <DispatchDegradedState reasons={viewModel.degradedReasons} />
      <DispatchRuntimePanels
        orgId={orgId}
        data={data}
        canManageDispatch={canManageDispatch}
        contractAllowsWriteback={contractAllowsWriteback}
        missingWritebackPermissions={missingWritebackPermissions}
        onRefresh={onRefresh}
      />
      <DispatchExecutionCard
        data={data}
        contractAllowsWriteback={contractAllowsWriteback}
      />
      <DispatchTimelineCard data={data} hasTimeline={viewModel.hasTimeline} />
      <DispatchPayloadRefsCard
        data={data}
        hasPayloadRefs={viewModel.hasPayloadRefs}
      />
    </>
  );
}
