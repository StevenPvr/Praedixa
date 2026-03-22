"use client";

import { useState } from "react";

import { useCurrentUser } from "@/lib/auth/client";
import { hasAnyPermission } from "@/lib/auth/permissions";

import { useClientContext } from "../client-context";
import { ConfigReadonlyNotice } from "./config-readonly-notice";
import { CostParamsSection } from "./cost-params-section";
import { DecisionConfigSection } from "./decision-config-section";
import { IntegrationsSection } from "./integrations-section";
import { ProofPacksSection } from "./proof-packs-section";

type ActionFeedbackBannerProps = {
  actionError: string | null;
  actionSuccess: string | null;
};

function ActionFeedbackBanner(props: Readonly<ActionFeedbackBannerProps>) {
  const { actionError, actionSuccess } = props;
  if (!actionError && !actionSuccess) return null;
  const toneClassName = actionError
    ? "border-warning-light bg-warning-light/20 text-warning-text"
    : "border-success/40 bg-success/10 text-success";
  const className = `rounded-xl border px-4 py-3 text-sm ${toneClassName}`;

  return <div className={className}>{actionError ?? actionSuccess}</div>;
}

export default function ConfigPage() {
  const { orgId, selectedSiteId } = useClientContext();
  const currentUser = useCurrentUser();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const canManageConfig = hasAnyPermission(currentUser?.permissions, [
    "admin:org:write",
  ]);
  const canReadIntegrations = hasAnyPermission(currentUser?.permissions, [
    "admin:integrations:read",
  ]);
  const canManageIntegrations = hasAnyPermission(currentUser?.permissions, [
    "admin:integrations:write",
  ]);
  const isReadonlyConfig = canManageConfig === false;
  const readonlyNotice = isReadonlyConfig ? (
    <ConfigReadonlyNotice
      message="Mode lecture seule. Permission requise pour planifier, annuler, rollbacker ou recalculer une configuration:"
      permission="admin:org:write"
    />
  ) : null;

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-lg font-semibold text-ink">
        Configuration
      </h2>
      <ActionFeedbackBanner
        actionError={actionError}
        actionSuccess={actionSuccess}
      />
      {readonlyNotice}
      <CostParamsSection orgId={orgId} selectedSiteId={selectedSiteId} />
      <DecisionConfigSection
        orgId={orgId}
        selectedSiteId={selectedSiteId}
        canManageConfig={canManageConfig}
        actionLoading={actionLoading}
        actionError={actionError}
        actionSuccess={actionSuccess}
        setActionLoading={setActionLoading}
        setActionError={setActionError}
        setActionSuccess={setActionSuccess}
      />
      <IntegrationsSection
        orgId={orgId}
        canReadIntegrations={canReadIntegrations}
        canManageIntegrations={canManageIntegrations}
        actionLoading={actionLoading}
        actionError={actionError}
        actionSuccess={actionSuccess}
        setActionLoading={setActionLoading}
        setActionError={setActionError}
        setActionSuccess={setActionSuccess}
      />
      <ProofPacksSection orgId={orgId} />
    </div>
  );
}
