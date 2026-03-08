import type { Locale } from "../../lib/i18n/config";
import type {
  PilotFormData,
  PilotFormDictionary,
  PilotFormOptions,
  PilotPageUi,
} from "./pilot-application.types";

export function createInitialPilotForm(): PilotFormData {
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

export function getPilotFormOptions(form: PilotFormDictionary): PilotFormOptions {
  return {
    sectors: toList(form.sectors),
    employeeRanges: toList(form.employeeRanges),
    siteCounts: toList(form.siteCounts),
    roles: toList(form.roles),
    timelines: toList(form.timelines),
    valuePoints: toList(form.valuePoints),
  };
}

export function getPilotPageUi(locale: Locale): PilotPageUi {
  if (locale === "fr") {
    return {
      backToSite: "Retour au site",
      formKicker: "Demande de pilote",
      optionFallback: "Option indisponible",
      missingTitle: "Configuration de formulaire indisponible",
      missingBody:
        "Certaines options nécessaires au formulaire sont manquantes. Réessayez dans quelques minutes.",
      requiredHint: "Les champs marqués d'un astérisque sont requis.",
      legalJoinA: "J'accepte les ",
      legalJoinB: " et la ",
      unknownError: "Erreur inconnue.",
      networkError: "Erreur réseau. Veuillez réessayer.",
      protocolHint: "Vous pouvez consulter le protocole complet avant la soumission.",
    };
  }

  return {
    backToSite: "Back to site",
    formKicker: "Pilot request",
    optionFallback: "No option available",
    missingTitle: "Form configuration unavailable",
    missingBody:
      "Some required form options are missing. Please retry in a few minutes.",
    requiredHint: "Fields marked with an asterisk are required.",
    legalJoinA: "I accept the ",
    legalJoinB: " and the ",
    unknownError: "Unknown error.",
    networkError: "Network error. Please try again.",
    protocolHint: "You can review the complete pilot protocol before submitting.",
  };
}

export function canSubmitPilotForm(
  form: PilotFormData,
  status: "idle" | "submitting" | "success" | "error",
): boolean {
  return !(
    status === "submitting" ||
    form.companyName.trim().length === 0 ||
    form.sector.length === 0 ||
    form.employeeRange.length === 0 ||
    form.email.trim().length === 0 ||
    !form.consent
  );
}

export function hasPilotCoreOptions(options: PilotFormOptions): boolean {
  return options.sectors.length > 0 && options.employeeRanges.length > 0;
}

function toList(value: string[] | null | undefined): string[] {
  return Array.isArray(value) ? value : [];
}
