"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  AdminOrganizationSummary,
  CreateAdminOrganizationRequest,
  OnboardingCaseSummary,
} from "@praedixa/shared-types/api";
import type { DataTableColumn } from "@praedixa/ui";

import { OnboardingStatusBadge } from "@/components/onboarding-status-badge";
import { useApiGet, useApiGetPaginated, useApiPost } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { useCurrentUserState } from "@/lib/auth/client";
import { hasAnyPermission } from "@/lib/auth/permissions";
import {
  DEFAULT_CREATE_CLIENT_FORM_STATE,
  type CreateClientFormState,
} from "./create-client-card";

export interface OrgMissingConfig {
  organizationId: string;
  missingTypes: string[];
  totalMissing: number;
}

export interface MissingCostParams {
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

export type ParametresSection = "onboarding" | "config";

const CLIENT_SLUG_PATTERN = /^[a-z][a-z0-9-]{2,34}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatReadiness(caseItem: OnboardingCaseSummary): string {
  return `${caseItem.lastReadinessStatus} (${caseItem.lastReadinessScore}/100)`;
}

function resolveDefaultSection(canReadOnboarding: boolean): ParametresSection {
  return canReadOnboarding ? "onboarding" : "config";
}

export function useParametresPageModel() {
  const router = useRouter();
  const { user: currentUser, loading: permissionsLoading } =
    useCurrentUserState();
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

  const [section, setSection] = useState<ParametresSection | null>(null);
  const [obPage, setObPage] = useState(1);
  const [createClientForm, setCreateClientForm] =
    useState<CreateClientFormState>(DEFAULT_CREATE_CLIENT_FORM_STATE);

  useEffect(() => {
    if (permissionsLoading) {
      return;
    }

    const defaultSection = resolveDefaultSection(canReadOnboarding);
    setSection((current) => {
      if (current == null) {
        return defaultSection;
      }
      if (current === "onboarding" && !canReadOnboarding) {
        return "config";
      }
      return current;
    });
  }, [permissionsLoading, canReadOnboarding]);

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
        ? "Client test cree, invitation d'activation initialisee, preuve provider en attente, puis ouverture de l'onboarding"
        : "Client cree, invitation d'activation initialisee, preuve provider en attente, puis ouverture de l'onboarding",
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

  return {
    permissionsLoading,
    canReadOnboarding,
    canReadConfigHealth,
    canCreateClient,
    section,
    setSection,
    obPage,
    setObPage,
    createClientForm,
    setCreateClientForm,
    createOrganizationLoading: createOrganization.loading,
    handleCreateClient,
    obData,
    obTotal,
    obError,
    obRefetch,
    onboardingColumns,
    costLoading,
    costError,
    costRefetch,
    orgs,
    totalOrgsWithMissing,
    totalMissingParams,
    allConfigured,
  };
}
