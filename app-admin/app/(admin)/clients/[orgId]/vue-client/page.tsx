"use client";

import { ErrorFallback } from "@/components/error-fallback";
import { SkeletonCard } from "@praedixa/ui";

import { useVueClientPageModel } from "./vue-client-page-model";
import {
  VueClientBillingSection,
  VueClientMirrorSection,
  VueClientOrganizationSection,
  VueClientQuickActionsSection,
} from "./vue-client-sections";

export default function VueClientPage() {
  const model = useVueClientPageModel();

  if (model.orgLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (model.orgError || !model.org) {
    return (
      <ErrorFallback
        message={model.orgError ?? "Client introuvable"}
        onRetry={model.orgRefetch}
      />
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-lg font-semibold text-ink">Vue client</h2>

      <VueClientOrganizationSection org={model.org} />
      <VueClientMirrorSection
        loading={model.mirrorLoading}
        error={model.mirrorError}
        mirror={model.mirror}
      />
      <VueClientBillingSection
        canReadBilling={model.canReadBilling}
        loading={model.billingLoading}
        error={model.billingError}
        billing={model.billing}
      />
      <VueClientQuickActionsSection
        status={model.org.status}
        canManageLifecycle={model.canManageLifecycle}
        suspendLoading={model.suspendLoading}
        reactivateLoading={model.reactivateLoading}
        onSuspend={model.handleSuspend}
        onReactivate={model.handleReactivate}
      />
    </div>
  );
}
