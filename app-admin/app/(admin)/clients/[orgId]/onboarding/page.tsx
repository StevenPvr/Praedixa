"use client";

import { useMemo, useState } from "react";
import { useClientContext } from "../client-context";
import { useApiGet, useApiGetPaginated, useApiPost } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { Card, CardContent, Button, StatCard, SkeletonCard } from "@praedixa/ui";
import { OnboardingStatusBadge, type OnboardingStatus } from "@/components/onboarding-status-badge";
import { ErrorFallback } from "@/components/error-fallback";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, ClipboardList, Rocket, Workflow } from "lucide-react";

interface OrgDetail {
  id: string;
  name: string;
  slug: string;
  contactEmail: string;
  plan?: string;
}

interface OnboardingListItem {
  id: string;
  organizationId: string;
  status: OnboardingStatus;
  currentStep: number;
  stepsCompleted: unknown[];
  initiatedBy: string;
  createdAt: string;
  completedAt: string | null;
}

const TOTAL_STEPS = 5;

function normalizePlan(plan: string | undefined): string {
  if (!plan) return "starter";
  if (plan === "pro" || plan === "professional") return "professional";
  if (plan === "enterprise") return "enterprise";
  if (plan === "pilot") return "starter";
  return "starter";
}

export default function OnboardingPage() {
  const { orgId } = useClientContext();
  const toast = useToast();
  const [page, setPage] = useState(1);

  const {
    data: org,
    loading: orgLoading,
    error: orgError,
    refetch: orgRefetch,
  } = useApiGet<OrgDetail>(ADMIN_ENDPOINTS.organization(orgId));

  const {
    data: onboardingEntries,
    total,
    loading: onboardingLoading,
    error: onboardingError,
    refetch: onboardingRefetch,
  } = useApiGetPaginated<OnboardingListItem>(ADMIN_ENDPOINTS.onboardingList, page, 20);

  const startOnboarding = useApiPost<
    { orgName: string; orgSlug: string; contactEmail: string; plan: string },
    OnboardingListItem
  >(ADMIN_ENDPOINTS.onboardingStart);

  const orgEntries = useMemo(
    () => (onboardingEntries ?? []).filter((entry) => entry.organizationId === orgId),
    [onboardingEntries, orgId],
  );

  const latestEntry = orgEntries[0] ?? null;

  async function handleStart() {
    if (!org) return;
    const created = await startOnboarding.mutate({
      orgName: org.name,
      orgSlug: org.slug,
      contactEmail: org.contactEmail,
      plan: normalizePlan(org.plan),
    });

    if (created) {
      toast.success("Onboarding demarre");
      onboardingRefetch();
      return;
    }

    toast.error(startOnboarding.error ?? "Impossible de demarrer l'onboarding");
  }

  if (orgError) {
    return <ErrorFallback message={orgError} onRetry={orgRefetch} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-lg font-semibold text-ink">Onboarding</h2>
        <p className="text-sm text-ink-tertiary">
          Suivi de readiness et orchestration des etapes de mise en service client.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Sessions onboarding"
          value={String(orgEntries.length)}
          icon={<ClipboardList className="h-4 w-4" />}
        />
        <StatCard
          label="Etape actuelle"
          value={String(latestEntry?.currentStep ?? 0)}
          icon={<Workflow className="h-4 w-4" />}
        />
        <StatCard
          label="Statut"
          value={latestEntry?.status ?? "absent"}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <StatCard
          label="Total entrees"
          value={String(total)}
          icon={<Rocket className="h-4 w-4" />}
        />
      </div>

      {orgLoading || onboardingLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : null}

      {onboardingError ? (
        <ErrorFallback message={onboardingError} onRetry={onboardingRefetch} />
      ) : (
        <Card className="rounded-2xl shadow-soft">
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-medium text-ink-secondary">
                  Dernier onboarding pour {org?.name ?? orgId}
                </h3>
                <p className="text-xs text-ink-tertiary">
                  Suivi centralise des etapes (objectif {TOTAL_STEPS} etapes)
                </p>
              </div>

              <Button
                size="sm"
                onClick={handleStart}
                disabled={startOnboarding.loading || !org}
              >
                <Rocket className="mr-1.5 h-3.5 w-3.5" />
                {startOnboarding.loading ? "Demarrage..." : "Demarrer un onboarding"}
              </Button>
            </div>

            {latestEntry ? (
              <div className="space-y-3 rounded-xl border border-border bg-surface-sunken/60 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <OnboardingStatusBadge status={latestEntry.status} />
                  <span className="text-xs text-ink-tertiary">
                    Cree le {new Date(latestEntry.createdAt).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${(latestEntry.currentStep / TOTAL_STEPS) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-ink-tertiary">
                    Etape {latestEntry.currentStep}/{TOTAL_STEPS}
                    {latestEntry.completedAt
                      ? ` - Termine le ${new Date(latestEntry.completedAt).toLocaleDateString("fr-FR")}`
                      : " - En cours"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-ink-tertiary">
                Aucun onboarding actif pour cette organisation.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {total > 20 ? (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={page <= 1}
          >
            Precedent
          </Button>
          <span className="text-xs text-ink-tertiary">Page {page}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((value) => value + 1)}
          >
            Suivant
          </Button>
        </div>
      ) : null}
    </div>
  );
}
