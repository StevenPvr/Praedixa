import { isSemanticallyValidEmailAddress } from "../../lib/security/email-address";
import type { Locale } from "../../lib/i18n/config";
import type {
  DeploymentRequestFormData,
  DeploymentRequestFormDictionary,
  DeploymentRequestFormOptions,
  DeploymentRequestPageUi,
} from "./deployment-request.types";

export function createInitialDeploymentRequestForm(): DeploymentRequestFormData {
  return {
    companyName: "",
    sector: "",
    employeeRange: "",
    siteCount: "",
    firstName: "",
    lastName: "",
    role: "",
    email: "",
    phone: "",
    timeline: "",
    currentStack: "",
    painPoint: "",
    consent: false,
    website: "",
  };
}

export function getDeploymentRequestFormOptions(
  form: DeploymentRequestFormDictionary,
): DeploymentRequestFormOptions {
  return {
    sectors: toList(form.sectors),
    employeeRanges: toList(form.employeeRanges),
    siteCounts: toList(form.siteCounts),
    roles: toList(form.roles),
    timelines: toList(form.timelines),
    valuePoints: toList(form.valuePoints),
  };
}

export function getDeploymentRequestPageUi(
  locale: Locale,
): DeploymentRequestPageUi {
  if (locale === "fr") {
    return {
      backToSite: "Retour au site",
      formKicker: "Déploiement",
      optionFallback: "Option indisponible",
      missingTitle: "Configuration de formulaire indisponible",
      missingBody:
        "Certaines options nécessaires au formulaire sont manquantes. Réessayez dans quelques minutes.",
      requiredHint: "Les champs marqués d'un astérisque sont requis.",
      legalJoinA: "J'accepte les ",
      legalJoinB: " et la ",
      unknownError: "Erreur inconnue.",
      networkError: "Erreur réseau. Veuillez réessayer.",
      offerHint: "Vous pouvez consulter l’offre publique avant la soumission.",
    };
  }

  return {
    backToSite: "Back to site",
    formKicker: "Deployment",
    optionFallback: "No option available",
    missingTitle: "Form configuration unavailable",
    missingBody:
      "Some required form options are missing. Please retry in a few minutes.",
    requiredHint: "Fields marked with an asterisk are required.",
    legalJoinA: "I accept the ",
    legalJoinB: " and the ",
    unknownError: "Unknown error.",
    networkError: "Network error. Please try again.",
    offerHint: "You can review the public offer before submitting.",
  };
}

export function canSubmitDeploymentRequestForm(
  form: DeploymentRequestFormData,
  status: "idle" | "submitting" | "success" | "error",
): boolean {
  return !(
    status === "submitting" ||
    form.companyName.trim().length === 0 ||
    form.sector.length === 0 ||
    form.employeeRange.length === 0 ||
    !isSemanticallyValidEmailAddress(form.email) ||
    !form.consent
  );
}

export function hasDeploymentRequestCoreOptions(
  options: DeploymentRequestFormOptions,
): boolean {
  return options.sectors.length > 0 && options.employeeRanges.length > 0;
}

function toList(value: string[] | null | undefined): string[] {
  return Array.isArray(value) ? value : [];
}
