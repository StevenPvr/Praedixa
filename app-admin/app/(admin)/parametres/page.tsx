"use client";

import { useState } from "react";
import {
  Settings,
  AlertCircle,
  CheckCircle,
  Building2,
  Rocket,
} from "lucide-react";
import {
  StatCard,
  SkeletonCard,
  DataTable,
  type DataTableColumn,
} from "@praedixa/ui";
import { useApiGet, useApiGetPaginated, useApiPost } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { ErrorFallback } from "@/components/error-fallback";
import { ApiError, apiPatch } from "@/lib/api/client";
import { getValidAccessToken, useCurrentUser } from "@/lib/auth/client";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { useToast } from "@/hooks/use-toast";
import {
  OnboardingStatusBadge,
  type OnboardingStatus,
} from "@/components/onboarding-status-badge";

/* ────────────────────────────────────────────── */
/*  Types                                         */
/* ────────────────────────────────────────────── */

interface OrgMissingConfig {
  organizationId: string;
  missingTypes: string[];
  totalMissing: number;
}

interface MissingCostParams {
  totalOrgsWithMissing?: number;
  totalMissingParams?: number;
  orgs?: OrgMissingConfig[];
  orgsWithoutConfig?: number;
  missing?: Array<{
    organizationId: string;
    name: string;
    missingTypes: string[];
    totalMissing: number;
  }>;
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

const TYPE_LABELS: Record<string, string> = {
  c_int: "Cout interne",
  maj_hs: "Majoration heures sup.",
  c_interim: "Cout interim",
  premium_urgence: "Prime urgence",
  c_backlog: "Cout backlog",
  cap_hs_shift: "Cap HS / shift",
  cap_interim_site: "Cap interim / site",
  lead_time_jours: "Lead time (jours)",
};

type Section = "onboarding" | "config";

/* ────────────────────────────────────────────── */
/*  Component                                     */
/* ────────────────────────────────────────────── */

export default function ParametresPage() {
  const currentUser = useCurrentUser();
  const toast = useToast();
  const canReadOnboarding = hasAnyPermission(currentUser?.permissions, [
    "admin:onboarding:read",
    "admin:onboarding:write",
  ]);
  const canManageOnboarding = hasAnyPermission(currentUser?.permissions, [
    "admin:onboarding:write",
  ]);
  const canReadConfigHealth = hasAnyPermission(currentUser?.permissions, [
    "admin:monitoring:read",
  ]);
  const [section, setSection] = useState<Section>(
    canReadOnboarding ? "onboarding" : "config",
  );

  // Onboarding state
  const [obPage, setObPage] = useState(1);
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [plan, setPlan] = useState("starter");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const {
    data: obData,
    total: obTotal,
    error: obError,
    refetch: obRefetch,
  } = useApiGetPaginated<OnboardingListItem>(
    canReadOnboarding ? ADMIN_ENDPOINTS.onboardingList : null,
    obPage,
    20,
  );
  const startOnboardingMutation = useApiPost<
    { orgName: string; orgSlug: string; contactEmail: string; plan: string },
    OnboardingListItem
  >(ADMIN_ENDPOINTS.onboardingStart);

  // Cost params state
  const {
    data: costData,
    loading: costLoading,
    error: costError,
    refetch: costRefetch,
  } = useApiGet<MissingCostParams>(
    canReadConfigHealth ? ADMIN_ENDPOINTS.monitoringCostParamsMissing : null,
  );

  async function handleStartOnboarding() {
    if (!canManageOnboarding) {
      toast.error("Permission requise: admin:onboarding:write");
      return;
    }
    if (!orgName || !orgSlug || !contactEmail) return;
    const created = await startOnboardingMutation.mutate({
      orgName,
      orgSlug,
      contactEmail,
      plan,
    });
    if (created) {
      setOrgName("");
      setOrgSlug("");
      setContactEmail("");
      toast.success("Onboarding demarre");
      obRefetch();
      return;
    }
    if (startOnboardingMutation.error) {
      toast.error(startOnboardingMutation.error);
    }
  }

  async function handleNextStep(row: OnboardingListItem) {
    if (!canManageOnboarding) {
      toast.error("Permission requise: admin:onboarding:write");
      return;
    }
    if (row.currentStep >= TOTAL_STEPS || row.status === "completed") return;
    const nextStep = Math.min(row.currentStep + 1, TOTAL_STEPS);
    setActionLoadingId(row.id);
    try {
      await apiPatch(
        ADMIN_ENDPOINTS.onboardingStep(row.id, nextStep),
        { data: { source: "admin_console" } },
        getValidAccessToken,
      );
      toast.success(`Etape ${nextStep} validee`);
      obRefetch();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Impossible de valider l'etape",
      );
    } finally {
      setActionLoadingId(null);
    }
  }

  const obColumns: DataTableColumn<OnboardingListItem>[] = [
    {
      key: "organizationId",
      label: "Organisation",
      render: (row) => (
        <span className="font-mono text-xs text-ink-tertiary">
          {row.organizationId.substring(0, 8)}...
        </span>
      ),
    },
    {
      key: "status",
      label: "Statut",
      render: (row) => <OnboardingStatusBadge status={row.status} />,
    },
    {
      key: "currentStep",
      label: "Progression",
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="h-2 w-24 overflow-hidden rounded-full bg-surface-sunken">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{
                width: `${(row.currentStep / TOTAL_STEPS) * 100}%`,
              }}
            />
          </div>
          <span className="text-xs text-ink-tertiary">
            {row.currentStep}/{TOTAL_STEPS}
          </span>
        </div>
      ),
    },
    {
      key: "createdAt",
      label: "Demarre le",
      render: (row) => (
        <span className="text-sm text-ink-tertiary">
          {new Date(row.createdAt).toLocaleDateString("fr-FR")}
        </span>
      ),
    },
    {
      key: "completedAt",
      label: "Termine le",
      render: (row) =>
        row.completedAt ? (
          <span className="text-sm text-ink-tertiary">
            {new Date(row.completedAt).toLocaleDateString("fr-FR")}
          </span>
        ) : (
          <span className="text-sm text-ink-placeholder">En cours</span>
        ),
    },
    {
      key: "actions",
      label: "Action",
      render: (row) => (
        <button
          onClick={() => void handleNextStep(row)}
          disabled={
            !canManageOnboarding ||
            row.currentStep >= TOTAL_STEPS ||
            row.status === "completed" ||
            actionLoadingId === row.id
          }
          className="rounded border border-border px-2 py-1 text-xs text-charcoal hover:bg-surface-sunken disabled:opacity-50"
        >
          {row.currentStep >= TOTAL_STEPS || row.status === "completed"
            ? "Termine"
            : "Valider etape"}
        </button>
      ),
    },
  ];

  // Cost params derived values
  const orgs = costData?.orgs ?? costData?.missing ?? [];
  const totalOrgsWithMissing =
    costData?.totalOrgsWithMissing ??
    costData?.orgsWithoutConfig ??
    orgs.length ??
    0;
  const totalMissingParams =
    costData?.totalMissingParams ??
    orgs.reduce((sum, org) => sum + (org.totalMissing ?? 0), 0);
  const allConfigured = totalOrgsWithMissing === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-ink">Parametres</h1>
        <p className="mt-1 text-sm text-ink-tertiary">
          Onboarding et configuration systeme
        </p>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 border-b border-border-subtle">
        <button
          onClick={() => setSection("onboarding")}
          disabled={!canReadOnboarding}
          className={`relative px-4 py-2.5 text-sm transition-colors ${
            section === "onboarding"
              ? "font-medium text-primary"
              : "text-ink-tertiary hover:text-ink-secondary"
          }`}
        >
          <Rocket className="mr-1.5 inline-block h-4 w-4" />
          Onboarding ({obTotal})
          {section === "onboarding" && (
            <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />
          )}
        </button>
        <button
          onClick={() => setSection("config")}
          className={`relative px-4 py-2.5 text-sm transition-colors ${
            section === "config"
              ? "font-medium text-primary"
              : "text-ink-tertiary hover:text-ink-secondary"
          }`}
        >
          <Settings className="mr-1.5 inline-block h-4 w-4" />
          Configuration
          {section === "config" && (
            <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />
          )}
        </button>
      </div>

      {/* Onboarding section */}
      {section === "onboarding" && (
        <div className="space-y-4">
          {!canReadOnboarding ? (
            <div className="rounded-xl border border-border-subtle bg-card px-4 py-3 text-sm text-ink-tertiary">
              Permission requise pour consulter cette section:{" "}
              <span className="font-medium text-ink">
                admin:onboarding:read
              </span>
            </div>
          ) : null}
          <div className="rounded-2xl border border-border-subtle bg-card p-5 shadow-soft">
            <h2 className="mb-3 text-sm font-medium text-ink-tertiary">
              Demarrer un onboarding
            </h2>
            <div className="grid gap-3 md:grid-cols-4">
              <input
                value={orgName}
                onChange={(event) => setOrgName(event.target.value)}
                placeholder="Nom organisation"
                disabled={!canManageOnboarding}
                className="min-h-[44px] rounded-lg border border-border px-3 py-2 text-sm text-charcoal placeholder:text-ink-placeholder focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <input
                value={orgSlug}
                onChange={(event) => setOrgSlug(event.target.value)}
                placeholder="slug"
                disabled={!canManageOnboarding}
                className="min-h-[44px] rounded-lg border border-border px-3 py-2 text-sm text-charcoal placeholder:text-ink-placeholder focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <input
                type="email"
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                placeholder="email contact"
                disabled={!canManageOnboarding}
                className="min-h-[44px] rounded-lg border border-border px-3 py-2 text-sm text-charcoal placeholder:text-ink-placeholder focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="flex gap-2">
                <select
                  value={plan}
                  onChange={(event) => setPlan(event.target.value)}
                  disabled={!canManageOnboarding}
                  className="min-h-[44px] flex-1 rounded-lg border border-border px-3 py-2 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="free">free</option>
                  <option value="starter">starter</option>
                  <option value="professional">professional</option>
                  <option value="enterprise">enterprise</option>
                </select>
                <button
                  onClick={() => void handleStartOnboarding()}
                  disabled={
                    !canManageOnboarding ||
                    startOnboardingMutation.loading ||
                    !orgName ||
                    !orgSlug ||
                    !contactEmail
                  }
                  className="inline-flex min-h-[44px] items-center rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
                >
                  Lancer
                </button>
              </div>
            </div>
          </div>

          {obError ? (
            <ErrorFallback message={obError} onRetry={obRefetch} />
          ) : (
            <DataTable
              columns={obColumns}
              data={obData}
              getRowKey={(row) => row.id}
              pagination={{
                page: obPage,
                pageSize: 20,
                total: obTotal,
                onPageChange: setObPage,
              }}
            />
          )}
        </div>
      )}

      {/* Config section */}
      {section === "config" && (
        <div className="space-y-4">
          {!canReadConfigHealth ? (
            <div className="rounded-xl border border-border-subtle bg-card px-4 py-3 text-sm text-ink-tertiary">
              Permission requise pour consulter cette section:{" "}
              <span className="font-medium text-ink">
                admin:monitoring:read
              </span>
            </div>
          ) : costLoading ? (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={`param-skel-${i}`} />
              ))}
            </div>
          ) : costError ? (
            <ErrorFallback message={costError} onRetry={costRefetch} />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                <StatCard
                  label="Organisations avec manques"
                  value={String(totalOrgsWithMissing)}
                  icon={<Building2 className="h-5 w-5" />}
                />
                <StatCard
                  label="Parametres manquants"
                  value={String(totalMissingParams)}
                  icon={<Settings className="h-5 w-5" />}
                />
                <StatCard
                  label="Statut global"
                  value={allConfigured ? "Complet" : "Incomplet"}
                  icon={
                    allConfigured ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <AlertCircle className="h-5 w-5" />
                    )
                  }
                />
              </div>

              {allConfigured ? (
                <div className="rounded-lg border border-success bg-success-light px-4 py-3 text-sm text-success-text">
                  Toutes les organisations ont leurs parametres de cout
                  configures.
                </div>
              ) : (
                <div className="rounded-lg border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-700">
                  {totalOrgsWithMissing} organisation
                  {totalOrgsWithMissing > 1 ? "s" : ""} avec des parametres
                  manquants.
                </div>
              )}

              {orgs.length > 0 && (
                <div className="rounded-2xl border border-border-subtle bg-card p-5 shadow-soft">
                  <h2 className="mb-4 text-sm font-medium text-ink-tertiary">
                    Configurations manquantes par organisation
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-border-subtle text-xs text-ink-placeholder">
                          <th className="pb-2 font-medium">Organisation</th>
                          <th className="pb-2 text-right font-medium">
                            Manquants
                          </th>
                          <th className="pb-2 font-medium">Types manquants</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {orgs.map((org) => (
                          <tr key={org.organizationId}>
                            <td className="py-2 font-mono text-xs text-ink-secondary">
                              {org.organizationId.slice(0, 8)}...
                            </td>
                            <td className="py-2 text-right text-charcoal">
                              {org.totalMissing}
                            </td>
                            <td className="py-2">
                              <div className="flex flex-wrap gap-1">
                                {org.missingTypes.map((type) => (
                                  <span
                                    key={type}
                                    className="rounded bg-primary-100 px-1.5 py-0.5 text-xs text-primary-700"
                                  >
                                    {TYPE_LABELS[type] ?? type}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
