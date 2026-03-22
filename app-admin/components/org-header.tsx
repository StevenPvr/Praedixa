"use client";

import { Button } from "@praedixa/ui";
import { PlanBadge, type PlanTier } from "@/components/plan-badge";
import { OrgStatusBadge, type OrgStatus } from "@/components/org-status-badge";

type OrgHeaderProps = Readonly<{
  name: string;
  plan?: PlanTier;
  status?: OrgStatus;
  isTest?: boolean;
  onSuspend?: () => void;
  onReactivate?: () => void;
  onChangePlan?: () => void;
}>;

export function OrgHeader({
  name,
  plan,
  status,
  isTest = false,
  onSuspend,
  onReactivate,
  onChangePlan,
}: OrgHeaderProps) {
  const hasPlan = plan !== undefined;
  const hasStatus = status !== undefined;
  const isTestBadgeVisible = isTest === true;
  const canSuspend = status === "active" && onSuspend !== undefined;
  const canReactivate = status === "suspended" && onReactivate !== undefined;
  const canChangePlan = onChangePlan !== undefined;
  const planBadge = hasPlan ? <PlanBadge plan={plan} /> : null;
  const statusBadge = hasStatus ? <OrgStatusBadge status={status} /> : null;
  const testBadge = isTestBadgeVisible ? (
    <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900">
      Client test
    </span>
  ) : null;
  const suspendAction = canSuspend ? (
    <Button variant="outline" size="sm" onClick={onSuspend}>
      Suspendre
    </Button>
  ) : null;
  const reactivateAction = canReactivate ? (
    <Button variant="outline" size="sm" onClick={onReactivate}>
      Reactiver
    </Button>
  ) : null;
  const changePlanAction = canChangePlan ? (
    <Button variant="outline" size="sm" onClick={onChangePlan}>
      Changer plan
    </Button>
  ) : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
      <div className="flex items-center gap-3">
        <h1 className="font-serif text-xl font-bold text-ink">{name}</h1>
        {planBadge}
        {statusBadge}
        {testBadge}
      </div>

      <div className="flex items-center gap-2">
        {suspendAction}
        {reactivateAction}
        {changePlanAction}
      </div>
    </div>
  );
}
