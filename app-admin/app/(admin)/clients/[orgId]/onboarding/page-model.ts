import type {
  CompleteOnboardingCaseTaskRequest,
  CreateOnboardingCaseRequest,
  OnboardingCaseBundle as ApiOnboardingCaseBundle,
  OnboardingCaseBlocker,
  OnboardingCaseDetail,
  OnboardingCaseSummary,
  OnboardingCaseTask,
} from "@praedixa/shared-types/api";
import { AlertTriangle, CheckCircle2, CircleDot, Workflow } from "lucide-react";

export type OrgUserItem = {
  id: string;
  fullName?: string;
  email: string;
  role: string;
  status: string;
  siteId?: string | null;
  siteName?: string;
};

export type OnboardingFormState = {
  ownerUserId: string;
  sponsorUserId: string;
  activationMode: CreateOnboardingCaseRequest["activationMode"];
  environmentTarget: CreateOnboardingCaseRequest["environmentTarget"];
  dataResidencyRegion: string;
  subscriptionModules: string[];
  selectedPacks: string[];
  sourceModes: CreateOnboardingCaseRequest["sourceModes"];
  targetGoLiveAt: string;
};

export type CompleteTaskFormState = CompleteOnboardingCaseTaskRequest;
export type { OnboardingCaseBundle } from "@praedixa/shared-types/api";

export type OnboardingTaskDraftPayload = Record<string, unknown>;
export type OnboardingUiStepKey =
  | "dossier"
  | "acces"
  | "sources"
  | "parametrage"
  | "activation";

export const ACTIVATION_MODE_OPTIONS = [
  {
    value: "shadow",
    label: "Simulation",
    hint: "Verifier le cycle decisionnel sans action en production.",
  },
  {
    value: "limited",
    label: "Pilote limite",
    hint: "Activer un perimetre borne avant le deploiement complet.",
  },
  {
    value: "full",
    label: "Perimetre complet",
    hint: "Preparer une activation complete des validation finale.",
  },
] as const;

export const ENVIRONMENT_OPTIONS = [
  {
    value: "sandbox",
    label: "Bac a sable",
    hint: "Branchement fournisseur non destructif et premier cycle de synchronisation de confiance.",
  },
  {
    value: "production",
    label: "Production",
    hint: "Cible technique finale avec activation progressive controlee.",
  },
] as const;

export const SOURCE_MODE_OPTIONS = [
  {
    value: "api",
    label: "API / SaaS",
    hint: "Test fournisseur, authentification et synchronisation initiale.",
  },
  {
    value: "file",
    label: "CSV / Excel",
    hint: "Depot versionne, apercu et correspondance.",
  },
  {
    value: "sftp",
    label: "SFTP",
    hint: "Depot batch gouverne avec cadence et replay.",
  },
] as const;

export const SUBSCRIPTION_MODULE_OPTIONS = [
  { value: "control-tower", label: "Tour de pilotage" },
  { value: "connectors", label: "Connecteurs" },
  { value: "forecasting", label: "Previsions" },
  { value: "decision-runtime", label: "Moteur de decision" },
  { value: "proof-packs", label: "Dossiers de preuve" },
] as const;

export const PACK_OPTIONS = [
  { value: "coverage", label: "Couverture" },
  { value: "flow", label: "Flux" },
  { value: "allocation", label: "Allocation" },
  { value: "core", label: "Socle" },
] as const;

export const DATA_RESIDENCY_OPTIONS = [
  { value: "fr-par", label: "France - Paris" },
  { value: "eu-west-1", label: "Europe de l'Ouest" },
  { value: "eu-central-1", label: "Europe centrale" },
] as const;

export const DEFAULT_FORM_STATE: OnboardingFormState = {
  ownerUserId: "",
  sponsorUserId: "",
  activationMode: "shadow",
  environmentTarget: "sandbox",
  dataResidencyRegion: "fr-par",
  subscriptionModules: ["control-tower", "connectors"],
  selectedPacks: ["coverage", "core"],
  sourceModes: ["api", "file"],
  targetGoLiveAt: "",
};

export const ONBOARDING_UI_STEPS: readonly {
  key: OnboardingUiStepKey;
  label: string;
  description: string;
}[] = [
  {
    key: "dossier",
    label: "Dossier",
    description: "Creer ou choisir le dossier d'activation.",
  },
  {
    key: "acces",
    label: "Acces",
    description: "Inviter le client et verrouiller les droits.",
  },
  {
    key: "sources",
    label: "Sources",
    description: "Brancher les fichiers et les flux de donnees.",
  },
  {
    key: "parametrage",
    label: "Parametrage",
    description: "Finaliser mappings, indicateurs et perimetre produit.",
  },
  {
    key: "activation",
    label: "Activation",
    description: "Passer la revue finale et cloturer la mise en service.",
  },
] as const;

export function toggleListValue(values: string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((entry) => entry !== value)
    : [...values, value];
}

export function normalizeIsoDate(dateOnly: string): string | null {
  if (!dateOnly) {
    return null;
  }

  return new Date(`${dateOnly}T09:00:00.000Z`).toISOString();
}

export function taskTone(task: OnboardingCaseTask): {
  icon: typeof CheckCircle2;
  className: string;
  label: string;
} {
  if (task.status === "done") {
    return {
      icon: CheckCircle2,
      className: "text-success",
      label: "Terminee",
    };
  }
  if (task.status === "blocked") {
    return {
      icon: AlertTriangle,
      className: "text-danger",
      label: "Bloquee",
    };
  }
  if (task.status === "in_progress") {
    return {
      icon: Workflow,
      className: "text-info-text",
      label: "En cours",
    };
  }

  return {
    icon: CircleDot,
    className: "text-ink-tertiary",
    label: "A faire",
  };
}

export function blockerTone(blocker: OnboardingCaseBlocker): string {
  if (blocker.status === "resolved") {
    return "text-success";
  }
  if (blocker.severity === "critical") {
    return "text-danger";
  }
  if (blocker.severity === "warning") {
    return "text-warning";
  }
  return "text-ink-tertiary";
}

export function isTaskActionable(task: OnboardingCaseTask): boolean {
  const workflowTaskKey = task.detailsJson["workflowTaskKey"];
  return (
    task.status !== "done" &&
    typeof workflowTaskKey === "string" &&
    workflowTaskKey.trim().length > 0
  );
}

export function taskSurfaceLink(
  orgId: string,
  taskKey: string,
): { href: string; label: string } | null {
  switch (taskKey) {
    case "access-model":
      return {
        href: `/clients/${encodeURIComponent(orgId)}/equipe`,
        label: "Ouvrir l'equipe client",
      };
    case "activate-api-sources":
    case "configure-file-sources":
    case "publish-mappings":
    case "configure-product-scope":
    case "activation-review":
    case "execute-activation":
    case "close-hypercare":
      return {
        href: `/clients/${encodeURIComponent(orgId)}/config`,
        label: "Ouvrir la configuration client",
      };
    default:
      return null;
  }
}

export function userLabel(user: OrgUserItem): string {
  return user.fullName?.trim().length
    ? `${user.fullName} - ${user.email}`
    : user.email;
}

export function statsSourceFromCases(
  caseBundle: ApiOnboardingCaseBundle | null,
  cases: readonly OnboardingCaseSummary[],
): OnboardingCaseSummary | OnboardingCaseDetail | null {
  return caseBundle?.case ?? cases[0] ?? null;
}

export function stepFromTaskKey(taskKey: string): OnboardingUiStepKey {
  switch (taskKey) {
    case "scope-contract":
      return "dossier";
    case "access-model":
      return "acces";
    case "source-strategy":
    case "activate-api-sources":
    case "configure-file-sources":
      return "sources";
    case "publish-mappings":
    case "configure-product-scope":
      return "parametrage";
    case "activation-review":
    case "execute-activation":
    case "close-hypercare":
      return "activation";
    default:
      return "dossier";
  }
}

export function tasksForStep(
  tasks: readonly OnboardingCaseTask[],
  stepKey: OnboardingUiStepKey,
): OnboardingCaseTask[] {
  return tasks.filter((task) => stepFromTaskKey(task.taskKey) === stepKey);
}

export function firstRelevantStep(
  bundle: ApiOnboardingCaseBundle | null,
): OnboardingUiStepKey {
  if (!bundle) {
    return "dossier";
  }
  const nextTask = bundle.tasks.find((task) => task.status !== "done");
  if (!nextTask) {
    return "activation";
  }
  return stepFromTaskKey(nextTask.taskKey);
}

export function labelForActivationMode(value: string): string {
  return (
    ACTIVATION_MODE_OPTIONS.find((option) => option.value === value)?.label ??
    value
  );
}

export function labelForEnvironment(value: string): string {
  return (
    ENVIRONMENT_OPTIONS.find((option) => option.value === value)?.label ?? value
  );
}
