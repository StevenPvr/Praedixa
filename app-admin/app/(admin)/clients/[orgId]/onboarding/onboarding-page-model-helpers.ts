"use client";

import type {
  CreateOnboardingCaseRequest,
  OnboardingCaseBundle,
  OnboardingCaseDetail,
  OnboardingCaseSummary,
} from "@praedixa/shared-types/api";

import type { OnboardingFormState } from "./page-model";
import { normalizeIsoDate, statsSourceFromCases } from "./page-model";

type IntegrationConnectionOption = {
  id: string;
  displayName: string;
  vendor: string;
};

type SelectOption = {
  value: string;
  label: string;
};

export function getCaseSelection(
  cases: readonly OnboardingCaseSummary[],
  selectedCaseId: string | null,
) {
  if (cases.length === 0) {
    return null;
  }

  return cases.some((item) => item.id === selectedCaseId)
    ? selectedCaseId
    : (cases[0]?.id ?? null);
}

export function getCreateCaseValidationError(
  form: OnboardingFormState,
): string | null {
  if (form.sourceModes.length === 0) {
    return "Selectionne au moins une source critique.";
  }
  if (form.subscriptionModules.length === 0) {
    return "Selectionne au moins un module souscrit.";
  }
  if (form.selectedPacks.length === 0) {
    return "Selectionne au moins un pack DecisionOps.";
  }
  return null;
}

export function buildCreateCaseRequest(
  form: OnboardingFormState,
): CreateOnboardingCaseRequest {
  return {
    ownerUserId: form.ownerUserId || null,
    sponsorUserId: form.sponsorUserId || null,
    activationMode: form.activationMode,
    environmentTarget: form.environmentTarget,
    dataResidencyRegion: form.dataResidencyRegion,
    subscriptionModules: form.subscriptionModules,
    selectedPacks: form.selectedPacks,
    sourceModes: form.sourceModes,
    targetGoLiveAt: normalizeIsoDate(form.targetGoLiveAt),
    metadataJson: {
      createdFrom: "client-onboarding-workspace",
    },
  };
}

export function buildIntegrationOptions(
  integrationConnections:
    | readonly IntegrationConnectionOption[]
    | null
    | undefined,
): SelectOption[] {
  return (integrationConnections ?? []).map((connection) => ({
    value: connection.id,
    label: `${connection.displayName} · ${connection.vendor}`,
  }));
}

export function getUsersAccessError(args: {
  currentUserLoading: boolean;
  canReadOrgUsers: boolean;
  usersError: string | null;
}) {
  if (!args.currentUserLoading && !args.canReadOrgUsers) {
    return "Le profil courant ne peut pas charger les comptes client. Owner, sponsor et invitations restent masques tant que `admin:users:*` n'est pas accorde.";
  }
  return args.usersError;
}

export function getEffectiveUsersLoading(args: {
  currentUserLoading: boolean;
  canReadOrgUsers: boolean;
  usersLoading: boolean;
}) {
  return args.currentUserLoading || (args.canReadOrgUsers && args.usersLoading);
}

export function getStatsSource(
  caseBundle: OnboardingCaseBundle | null | undefined,
  cases: readonly OnboardingCaseSummary[],
): OnboardingCaseSummary | OnboardingCaseDetail | null {
  return statsSourceFromCases(caseBundle ?? null, cases);
}
