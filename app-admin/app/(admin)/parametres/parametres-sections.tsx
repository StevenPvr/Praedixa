"use client";

import {
  AlertCircle,
  Building2,
  CheckCircle,
  Rocket,
  Settings,
} from "lucide-react";
import {
  DataTable,
  SkeletonCard,
  StatCard,
  type DataTableColumn,
} from "@praedixa/ui";
import type { OnboardingCaseSummary } from "@praedixa/shared-types/api";

import { ErrorFallback } from "@/components/error-fallback";
import type { ParametresSection } from "./parametres-page-model";

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

const PARAMETRES_CONFIG_SKELETON_KEYS = [
  "orgs-missing",
  "params-missing",
  "global-status",
] as const;

type ParametresTabsProps = Readonly<{
  section: ParametresSection;
  canReadOnboarding: boolean;
  obTotal: number;
  onChange: (section: ParametresSection) => void;
}>;

export function ParametresTabs({
  section,
  canReadOnboarding,
  obTotal,
  onChange,
}: ParametresTabsProps) {
  const onboardingTabDisabled = canReadOnboarding === false;
  const onboardingTabClassName =
    section === "onboarding"
      ? "font-medium text-primary"
      : "text-ink-tertiary hover:text-ink-secondary";
  const configTabClassName =
    section === "config"
      ? "font-medium text-primary"
      : "text-ink-tertiary hover:text-ink-secondary";

  return (
    <div className="flex gap-1 border-b border-border-subtle">
      <button
        onClick={() => onChange("onboarding")}
        disabled={onboardingTabDisabled}
        className={`relative px-4 py-2.5 text-sm transition-colors ${onboardingTabClassName}`}
      >
        <Rocket className="mr-1.5 inline-block h-4 w-4" />
        Onboarding ({obTotal})
        {section === "onboarding" ? (
          <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />
        ) : null}
      </button>
      <button
        onClick={() => onChange("config")}
        className={`relative px-4 py-2.5 text-sm transition-colors ${configTabClassName}`}
      >
        <Settings className="mr-1.5 inline-block h-4 w-4" />
        Configuration
        {section === "config" ? (
          <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />
        ) : null}
      </button>
    </div>
  );
}

type ParametresOnboardingSectionProps = Readonly<{
  canReadOnboarding: boolean;
  obTotal: number;
  obData: OnboardingCaseSummary[];
  obError: string | null;
  obRefetch: () => void;
  obPage: number;
  setObPage: (page: number) => void;
  onboardingColumns: DataTableColumn<OnboardingCaseSummary>[];
}>;

export function ParametresOnboardingSection({
  canReadOnboarding,
  obTotal,
  obData,
  obError,
  obRefetch,
  obPage,
  setObPage,
  onboardingColumns,
}: ParametresOnboardingSectionProps) {
  const canShowOnboardingSection = canReadOnboarding;
  const blockedCases = obData.filter(
    (item) => item.status === "blocked",
  ).length;
  const fullActivationCases = obData.filter(
    (item) => item.status === "active_full",
  ).length;
  const onboardingContent = obError ? (
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
  );

  return (
    <div className="space-y-4">
      {canShowOnboardingSection ? null : (
        <div className="rounded-xl border border-border-subtle bg-card px-4 py-3 text-sm text-ink-tertiary">
          Permission requise pour consulter cette section:{" "}
          <span className="font-medium text-ink">admin:onboarding:read</span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard
          label="Cases visibles"
          value={String(obTotal)}
          icon={<Rocket className="h-4 w-4" />}
        />
        <StatCard
          label="Cases bloques"
          value={String(blockedCases)}
          icon={<AlertCircle className="h-4 w-4" />}
        />
        <StatCard
          label="Activation full"
          value={String(fullActivationCases)}
          icon={<CheckCircle className="h-4 w-4" />}
        />
      </div>

      <div className="rounded-2xl border border-border-subtle bg-card p-5 shadow-soft">
        <h2 className="mb-2 text-sm font-medium text-ink-tertiary">
          Supervision cross-org
        </h2>
        <p className="text-sm text-ink-secondary">
          Les nouveaux cases se demarrent depuis le workspace client dedie.
          Cette vue sert a surveiller les phases, blockers et readiness de bout
          en bout.
        </p>
      </div>

      {onboardingContent}
    </div>
  );
}

type ParametresConfigOrg = Readonly<{
  organizationId: string;
  missingTypes: string[];
  totalMissing: number;
  name?: string;
}>;

type ParametresConfigSectionProps = Readonly<{
  canReadConfigHealth: boolean;
  costLoading: boolean;
  costError: string | null;
  costRefetch: () => void;
  totalOrgsWithMissing: number;
  totalMissingParams: number;
  allConfigured: boolean;
  orgs: ParametresConfigOrg[];
}>;

export function ParametresConfigSection({
  canReadConfigHealth,
  costLoading,
  costError,
  costRefetch,
  totalOrgsWithMissing,
  totalMissingParams,
  allConfigured,
  orgs,
}: ParametresConfigSectionProps) {
  const globalStatusLabel = allConfigured ? "OK" : "A corriger";
  const globalStatusIcon = allConfigured ? (
    <CheckCircle className="h-4 w-4" />
  ) : (
    <AlertCircle className="h-4 w-4" />
  );

  if (canReadConfigHealth === false) {
    return (
      <div className="rounded-xl border border-border-subtle bg-card px-4 py-3 text-sm text-ink-tertiary">
        Permission requise pour consulter cette section:{" "}
        <span className="font-medium text-ink">admin:monitoring:read</span>
      </div>
    );
  }

  if (costLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {PARAMETRES_CONFIG_SKELETON_KEYS.map((key) => (
          <SkeletonCard key={key} />
        ))}
      </div>
    );
  }

  if (costError) {
    return <ErrorFallback message={costError} onRetry={costRefetch} />;
  }

  return (
    <div className="space-y-4">
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
          value={globalStatusLabel}
          icon={globalStatusIcon}
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
                  {totalOrgsWithMissing > 1 ? "s" : ""} avec des parametres
                  manquants.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {orgs.map((org) => (
                <ParametresConfigOrgCard key={org.organizationId} org={org} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type ParametresConfigOrgCardProps = Readonly<{
  org: ParametresConfigOrg;
}>;

function ParametresConfigOrgCard({ org }: ParametresConfigOrgCardProps) {
  const hasOrgName = typeof org.name === "string" && org.name.length > 0;
  const displayName = hasOrgName ? org.name : org.organizationId;
  const hasMultipleMissingParams =
    org.totalMissing > 1 || org.totalMissing === 0;

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-sunken/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-ink">{displayName}</p>
          <p className="text-xs text-ink-tertiary">{org.organizationId}</p>
        </div>
        <span className="rounded-full bg-warning-light px-2.5 py-1 text-xs font-medium text-warning-text">
          {org.totalMissing} manque{hasMultipleMissingParams ? "s" : ""}
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
  );
}
