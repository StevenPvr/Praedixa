"use client";

import { CreateClientCard } from "./create-client-card";
import { useParametresPageModel } from "./parametres-page-model";
import {
  ParametresConfigSection,
  ParametresOnboardingSection,
  ParametresTabs,
} from "./parametres-sections";

export default function ParametresPage() {
  const {
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
    createOrganizationLoading,
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
  } = useParametresPageModel();

  if (permissionsLoading || section == null) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">Parametres</h1>
          <p className="mt-1 text-sm text-ink-tertiary">
            Supervision de l&apos;onboarding admin et hygiene de configuration
            systeme.
          </p>
        </div>

        <div className="rounded-2xl border border-border-subtle bg-card p-5 text-sm text-ink-tertiary shadow-soft">
          Chargement des permissions...
        </div>
      </div>
    );
  }

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
          disabled={createOrganizationLoading}
          onChange={setCreateClientForm}
          onCreate={handleCreateClient}
        />
      ) : null}

      <ParametresTabs
        section={section}
        canReadOnboarding={canReadOnboarding}
        obTotal={obTotal}
        onChange={setSection}
      />

      {section === "onboarding" ? (
        <ParametresOnboardingSection
          canReadOnboarding={canReadOnboarding}
          obTotal={obTotal}
          obData={obData}
          obError={obError}
          obRefetch={obRefetch}
          obPage={obPage}
          setObPage={setObPage}
          onboardingColumns={onboardingColumns}
        />
      ) : (
        <ParametresConfigSection
          canReadConfigHealth={canReadConfigHealth}
          costLoading={costLoading}
          costError={costError}
          costRefetch={costRefetch}
          totalOrgsWithMissing={totalOrgsWithMissing}
          totalMissingParams={totalMissingParams}
          allConfigured={allConfigured}
          orgs={orgs}
        />
      )}
    </div>
  );
}
