"use client";

import { Button } from "@praedixa/ui";
import { PlanBadge, type PlanTier } from "@/components/plan-badge";
import { OrgStatusBadge, type OrgStatus } from "@/components/org-status-badge";

interface OrgHeaderProps {
  name: string;
  plan?: PlanTier;
  status?: OrgStatus;
  onSuspend?: () => void;
  onReactivate?: () => void;
  onChangePlan?: () => void;
}

export function OrgHeader({
  name,
  plan,
  status,
  onSuspend,
  onReactivate,
  onChangePlan,
}: OrgHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
      <div className="flex items-center gap-3">
        <h1 className="font-serif text-xl font-bold text-neutral-900">
          {name}
        </h1>
        {plan && <PlanBadge plan={plan} />}
        {status && <OrgStatusBadge status={status} />}
      </div>

      <div className="flex items-center gap-2">
        {status === "active" && onSuspend && (
          <Button variant="outline" size="sm" onClick={onSuspend}>
            Suspendre
          </Button>
        )}
        {status === "suspended" && onReactivate && (
          <Button variant="outline" size="sm" onClick={onReactivate}>
            Reactiver
          </Button>
        )}
        {onChangePlan && (
          <Button variant="outline" size="sm" onClick={onChangePlan}>
            Changer plan
          </Button>
        )}
      </div>
    </div>
  );
}
