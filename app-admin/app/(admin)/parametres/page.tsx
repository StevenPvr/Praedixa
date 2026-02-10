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
import { getValidAccessToken } from "@/lib/auth/client";
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
  const toast = useToast();
  const [section, setSection] = useState<Section>("onboarding");

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
    ADMIN_ENDPOINTS.onboardingList,
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
  } = useApiGet<MissingCostParams>(ADMIN_ENDPOINTS.monitoringCostParamsMissing);

  async function handleStartOnboarding() {
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
        <span className="font-mono text-xs text-gray-500">
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
          <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-amber-500 transition-all"
              style={{
                width: `${(row.currentStep / TOTAL_STEPS) * 100}%`,
              }}
            />
          </div>
          <span className="text-xs text-gray-500">
            {row.currentStep}/{TOTAL_STEPS}
          </span>
        </div>
      ),
    },
    {
      key: "createdAt",
      label: "Demarre le",
      render: (row) => (
        <span className="text-sm text-gray-500">
          {new Date(row.createdAt).toLocaleDateString("fr-FR")}
        </span>
      ),
    },
    {
      key: "completedAt",
      label: "Termine le",
      render: (row) =>
        row.completedAt ? (
          <span className="text-sm text-gray-500">
            {new Date(row.completedAt).toLocaleDateString("fr-FR")}
          </span>
        ) : (
          <span className="text-sm text-gray-300">En cours</span>
        ),
    },
    {
      key: "actions",
      label: "Action",
      render: (row) => (
        <button
          onClick={() => void handleNextStep(row)}
          disabled={
            row.currentStep >= TOTAL_STEPS ||
            row.status === "completed" ||
            actionLoadingId === row.id
          }
          className="rounded border border-gray-200 px-2 py-1 text-xs text-charcoal hover:bg-gray-50 disabled:opacity-50"
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
        <h1 className="font-serif text-2xl font-bold text-neutral-900">
          Parametres
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Onboarding et configuration systeme
        </p>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 border-b border-neutral-200">
        <button
          onClick={() => setSection("onboarding")}
          className={`relative px-4 py-2.5 text-sm transition-colors ${
            section === "onboarding"
              ? "font-medium text-amber-600"
              : "text-neutral-500 hover:text-neutral-700"
          }`}
        >
          <Rocket className="mr-1.5 inline-block h-4 w-4" />
          Onboarding ({obTotal})
          {section === "onboarding" && (
            <span className="absolute inset-x-0 bottom-0 h-0.5 bg-amber-500" />
          )}
        </button>
        <button
          onClick={() => setSection("config")}
          className={`relative px-4 py-2.5 text-sm transition-colors ${
            section === "config"
              ? "font-medium text-amber-600"
              : "text-neutral-500 hover:text-neutral-700"
          }`}
        >
          <Settings className="mr-1.5 inline-block h-4 w-4" />
          Configuration
          {section === "config" && (
            <span className="absolute inset-x-0 bottom-0 h-0.5 bg-amber-500" />
          )}
        </button>
      </div>

      {/* Onboarding section */}
      {section === "onboarding" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-soft">
            <h2 className="mb-3 text-sm font-medium text-gray-500">
              Demarrer un onboarding
            </h2>
            <div className="grid gap-3 md:grid-cols-4">
              <input
                value={orgName}
                onChange={(event) => setOrgName(event.target.value)}
                placeholder="Nom organisation"
                className="min-h-[44px] rounded-lg border border-gray-200 px-3 py-2 text-sm text-charcoal placeholder:text-gray-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <input
                value={orgSlug}
                onChange={(event) => setOrgSlug(event.target.value)}
                placeholder="slug"
                className="min-h-[44px] rounded-lg border border-gray-200 px-3 py-2 text-sm text-charcoal placeholder:text-gray-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <input
                type="email"
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                placeholder="email contact"
                className="min-h-[44px] rounded-lg border border-gray-200 px-3 py-2 text-sm text-charcoal placeholder:text-gray-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <div className="flex gap-2">
                <select
                  value={plan}
                  onChange={(event) => setPlan(event.target.value)}
                  className="min-h-[44px] flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-charcoal focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="free">free</option>
                  <option value="starter">starter</option>
                  <option value="professional">professional</option>
                  <option value="enterprise">enterprise</option>
                </select>
                <button
                  onClick={() => void handleStartOnboarding()}
                  disabled={
                    startOnboardingMutation.loading ||
                    !orgName ||
                    !orgSlug ||
                    !contactEmail
                  }
                  className="inline-flex min-h-[44px] items-center rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
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
          {costLoading ? (
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
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                  Toutes les organisations ont leurs parametres de cout
                  configures.
                </div>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {totalOrgsWithMissing} organisation
                  {totalOrgsWithMissing > 1 ? "s" : ""} avec des parametres
                  manquants.
                </div>
              )}

              {orgs.length > 0 && (
                <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-soft">
                  <h2 className="mb-4 text-sm font-medium text-gray-500">
                    Configurations manquantes par organisation
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-xs text-gray-400">
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
                            <td className="py-2 font-mono text-xs text-gray-600">
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
                                    className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700"
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
