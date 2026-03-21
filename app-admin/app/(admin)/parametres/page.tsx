"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Building2,
  CheckCircle,
  Rocket,
  Settings,
} from "lucide-react";
import type {
  AdminOrganizationSummary,
  CreateAdminOrganizationRequest,
  OnboardingCaseSummary,
} from "@praedixa/shared-types/api";
import {
  DataTable,
  SkeletonCard,
  StatCard,
  type DataTableColumn,
} from "@praedixa/ui";

import { ErrorFallback } from "@/components/error-fallback";
import { OnboardingStatusBadge } from "@/components/onboarding-status-badge";
import { useApiGet, useApiGetPaginated, useApiPost } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { useCurrentUser } from "@/lib/auth/client";
import { hasAnyPermission } from "@/lib/auth/permissions";
import {
  CreateClientCard,
  DEFAULT_CREATE_CLIENT_FORM_STATE,
  type CreateClientFormState,
} from "./create-client-card";

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
const CLIENT_SLUG_PATTERN = /^[a-z][a-z0-9-]{2,34}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatReadiness(caseItem: OnboardingCaseSummary): string {
  return `${caseItem.lastReadinessStatus} (${caseItem.lastReadinessScore}/100)`;
}

export default function ParametresPage() {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const toast = useToast();
  const canReadOnboarding = hasAnyPermission(currentUser?.permissions, [
    "admin:onboarding:read",
    "admin:onboarding:write",
  ]);
  const canReadConfigHealth = hasAnyPermission(currentUser?.permissions, [
    "admin:monitoring:read",
  ]);
  const canCreateClient = hasAnyPermission(currentUser?.permissions, [
    "admin:org:write",
  ]);
  const [section, setSection] = useState<Section>(
    canReadOnboarding ? "onboarding" : "config",
  );
  const [obPage, setObPage] = useState(1);
  const [createClientForm, setCreateClientForm] =
    useState<CreateClientFormState>(DEFAULT_CREATE_CLIENT_FORM_STATE);

  const {
    data: obData,
    total: obTotal,
    error: obError,
    refetch: obRefetch,
  } = useApiGetPaginated<OnboardingCaseSummary>(
    canReadOnboarding ? ADMIN_ENDPOINTS.onboardingList : null,
    obPage,
    20,
  );

  const {
    data: costData,
    loading: costLoading,
    error: costError,
    refetch: costRefetch,
  } = useApiGet<MissingCostParams>(
    canReadConfigHealth ? ADMIN_ENDPOINTS.monitoringCostParamsMissing : null,
  );
  const createOrganization = useApiPost<
    CreateAdminOrganizationRequest,
    AdminOrganizationSummary
  >(ADMIN_ENDPOINTS.organizations);

  useEffect(() => {
    if (createOrganization.error) {
      toast.error(createOrganization.error);
    }
  }, [createOrganization.error, toast]);

  async function handleCreateClient() {
    if (!canCreateClient) {
      toast.error("Permission requise: admin:org:write");
      return;
    }

    const name = createClientForm.name.trim();
    const slug = createClientForm.slug.trim().toLowerCase();
    const contactEmail = createClientForm.contactEmail.trim().toLowerCase();

    if (name.length < 2) {
      toast.error("Renseigne le nom du client.");
      return;
    }

    if (!CLIENT_SLUG_PATTERN.test(slug)) {
      toast.error(
        "Le slug doit commencer par une lettre et n'utiliser que des lettres minuscules, chiffres ou tirets.",
      );
      return;
    }

    if (!EMAIL_PATTERN.test(contactEmail)) {
      toast.error("Renseigne un email contact valide.");
      return;
    }

    const created = await createOrganization.mutate({
      name,
      slug,
      contactEmail,
      isTest: createClientForm.isTest,
    });

    if (!created) {
      return;
    }

    setCreateClientForm(DEFAULT_CREATE_CLIENT_FORM_STATE);
    toast.success(
      created.isTest
        ? "Client test cree, invitation envoyee et ouverture de l'onboarding"
        : "Client cree, invitation envoyee et ouverture de l'onboarding",
    );
    router.push(`/clients/${created.id}/onboarding`);
  }

  const onboardingColumns: DataTableColumn<OnboardingCaseSummary>[] = [
    {
      key: "organizationName",
      label: "Organisation",
      render: (row) => (
        <div>
          <p className="font-medium text-ink">
            {row.organizationName ?? row.organizationSlug ?? row.organizationId}
          </p>
          <p className="text-xs text-ink-tertiary">
            {row.organizationSlug ?? row.organizationId}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      label: "Statut",
      render: (row) => <OnboardingStatusBadge status={row.status} />,
    },
    {
      key: "phase",
      label: "Phase",
      render: (row) => (
        <span className="text-sm text-ink-secondary">
          {typeof row.phase === "string"
            ? row.phase.replaceAll("_", " ")
            : "Non renseignée"}
        </span>
      ),
    },
    {
      key: "readiness",
      label: "Readiness",
      render: (row) => (
        <span className="text-sm text-ink-secondary">
          {formatReadiness(row)}
        </span>
      ),
    },
    {
      key: "workload",
      label: "Charge ouverte",
      render: (row) => (
        <span className="text-xs text-ink-tertiary">
          {row.openTaskCount} taches / {row.openBlockerCount} blockers
        </span>
      ),
    },
    {
      key: "startedAt",
      label: "Ouvert le",
      render: (row) => (
        <span className="text-sm text-ink-tertiary">
          {new Date(row.startedAt).toLocaleDateString("fr-FR")}
        </span>
      ),
    },
    {
      key: "action",
      label: "Action",
      render: (row) => (
        <button
          onClick={() =>
            router.push(`/clients/${row.organizationId}/onboarding`)
          }
          className="rounded border border-border px-2 py-1 text-xs text-charcoal hover:bg-surface-sunken"
        >
          Ouvrir
        </button>
      ),
    },
  ];

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
          Supervision de l&apos;onboarding admin et hygiene de configuration
          systeme.
        </p>
      </div>

      {canCreateClient ? (
        <CreateClientCard
          form={createClientForm}
          disabled={createOrganization.loading}
          onChange={setCreateClientForm}
          onCreate={handleCreateClient}
        />
      ) : null}

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
          {section === "onboarding" ? (
            <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />
          ) : null}
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
          {section === "config" ? (
            <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />
          ) : null}
        </button>
      </div>

      {section === "onboarding" ? (
        <div className="space-y-4">
          {!canReadOnboarding ? (
            <div className="rounded-xl border border-border-subtle bg-card px-4 py-3 text-sm text-ink-tertiary">
              Permission requise pour consulter cette section:{" "}
              <span className="font-medium text-ink">
                admin:onboarding:read
              </span>
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-3">
            <StatCard
              label="Cases visibles"
              value={String(obTotal)}
              icon={<Rocket className="h-4 w-4" />}
            />
            <StatCard
              label="Cases bloques"
              value={String(
                obData.filter((item) => item.status === "blocked").length,
              )}
              icon={<AlertCircle className="h-4 w-4" />}
            />
            <StatCard
              label="Activation full"
              value={String(
                obData.filter((item) => item.status === "active_full").length,
              )}
              icon={<CheckCircle className="h-4 w-4" />}
            />
          </div>

          <div className="rounded-2xl border border-border-subtle bg-card p-5 shadow-soft">
            <h2 className="mb-2 text-sm font-medium text-ink-tertiary">
              Supervision cross-org
            </h2>
            <p className="text-sm text-ink-secondary">
              Les nouveaux cases se demarrent depuis le workspace client dedie.
              Cette vue sert a surveiller les phases, blockers et readiness de
              bout en bout.
            </p>
          </div>

          {obError ? (
            <ErrorFallback message={obError} onRetry={obRefetch} />
          ) : (
            <DataTable
              columns={onboardingColumns}
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
      ) : (
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
              {Array.from({ length: 3 }).map((_, index) => (
                <SkeletonCard key={`param-skel-${index}`} />
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
                  icon={<Building2 className="h-4 w-4" />}
                />
                <StatCard
                  label="Parametres manquants"
                  value={String(totalMissingParams)}
                  icon={<AlertCircle className="h-4 w-4" />}
                />
                <StatCard
                  label="Etat global"
                  value={allConfigured ? "OK" : "A corriger"}
                  icon={
                    allConfigured ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )
                  }
                />
              </div>

              <div className="rounded-2xl border border-border-subtle bg-card p-5 shadow-soft">
                {allConfigured ? (
                  <div className="flex items-start gap-3">
                    <CheckCircle className="mt-0.5 h-5 w-5 text-success" />
                    <div>
                      <h2 className="text-sm font-medium text-ink-secondary">
                        Configuration saine
                      </h2>
                      <p className="mt-1 text-sm text-ink-tertiary">
                        Toutes les organisations ont leurs parametres de cout
                        configures.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="mt-0.5 h-5 w-5 text-warning" />
                      <div>
                        <h2 className="text-sm font-medium text-ink-secondary">
                          Hygiene incomplete
                        </h2>
                        <p className="mt-1 text-sm text-ink-tertiary">
                          {totalOrgsWithMissing} organisation
                          {totalOrgsWithMissing > 1 ? "s" : ""} avec des
                          parametres manquants.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {orgs.map((org) => (
                        <div
                          key={org.organizationId}
                          className="rounded-xl border border-border-subtle bg-surface-sunken/40 p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-medium text-ink">
                                {"name" in org &&
                                typeof org.name === "string" &&
                                org.name.length > 0
                                  ? org.name
                                  : org.organizationId}
                              </p>
                              <p className="text-xs text-ink-tertiary">
                                {org.organizationId}
                              </p>
                            </div>
                            <span className="rounded-full bg-warning-light px-2.5 py-1 text-xs font-medium text-warning-text">
                              {org.totalMissing} manque
                              {org.totalMissing > 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {org.missingTypes.map((type) => (
                              <span
                                key={type}
                                className="rounded-full bg-card px-2.5 py-1 text-xs text-ink-secondary"
                              >
                                {TYPE_LABELS[type] ?? type}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
