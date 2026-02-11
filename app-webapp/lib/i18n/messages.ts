export type AppLocale = "fr" | "en";

type MessageTree = {
  [key: string]: string | MessageTree;
};

export const FALLBACK_LOCALE: AppLocale = "fr";

export const messages: Record<AppLocale, MessageTree> = {
  fr: {
    appShell: {
      organization: "Compte client",
      openMenu: "Ouvrir le menu",
      closeMenu: "Fermer le menu",
      languageLabel: "Langue",
      statusLive: "Flux en direct",
      statusReview: "Revue executive",
    },
    sidebar: {
      title: "Priorite immediate",
      subtitle:
        "Traiter les alertes qui menacent la continuité opérationnelle.",
      cta: "Ouvrir le centre de traitement",
      groups: {
        voir: "Voir",
        anticiper: "Anticiper",
        decider: "Decider",
        suivre: "Suivre",
        gouvernance: "Gouvernance",
      },
      items: {
        dashboard: "War room",
        donnees: "Donnees",
        previsions: "Anticipation",
        actions: "Traitement",
        messages: "Support",
        rapports: "Rapports",
        parametres: "Reglages",
      },
      siteFallback: "Tous les sites",
      expand: "Agrandir le menu",
      collapse: "Reduire le menu",
    },
    actions: {
      title: "Centre de traitement",
      subtitle: "Traitez les alertes dans l'ordre d'impact operationnel",
      queueTitle: "Alertes prioritaires",
      queueEmptyTitle: "Aucune alerte active",
      queueEmptyDescription: "Tous vos sites sont couverts.",
      diagnosticTitle: "Diagnostic",
      optionsTitle: "Options recommandees",
      paretoTitle: "Compromis cout / couverture",
      paretoSubtitle:
        "Selectionnez un point pour aligner niveau de service et cout.",
      validate: "Valider cette solution",
      validating: "Validation...",
      successTitle: "Decision enregistree",
      successDescription: "La solution a ete validee et historisee.",
      risk: "Risque",
      impact: "Impact estime",
      breach: "Avant rupture",
      noWorkspace: "Selectionnez une alerte pour afficher son diagnostic.",
    },
    dashboard: {
      title: "War room",
      subtitle:
        "Priorites critiques, niveau de couverture et decisions a enclencher",
      nowTitle: "Etat instantane",
      todoTitle: "A traiter aujourd'hui",
      trendTitle: "Tendance operationnelle",
      queueCta: "Basculer vers le centre de traitement",
      noAction: "Aucune action urgente pour aujourd'hui.",
      onboardingTitle: "Mise en route",
      onboardingSubtitle:
        "Finalisez ces etapes pour accelerer vos decisions quotidiennes.",
      onboardingDone: "Onboarding termine",
      onboardingMarkDone: "Marquer comme fait",
      onboardingReset: "Reinitialiser la checklist",
      onboardingSteps: {
        data: "Verifier la qualite des donnees",
        forecast: "Valider la lecture des previsions",
        decision: "Traiter une alerte dans le centre de traitement",
        support: "Demarrer une conversation support",
        report: "Exporter un rapport hebdomadaire",
      },
    },
  },
  en: {
    appShell: {
      organization: "Client account",
      openMenu: "Open menu",
      closeMenu: "Close menu",
      languageLabel: "Language",
      statusLive: "Live feed",
      statusReview: "Executive review",
    },
    sidebar: {
      title: "Immediate priority",
      subtitle: "Resolve alerts that threaten operational continuity first.",
      cta: "Open treatment center",
      groups: {
        voir: "See",
        anticiper: "Anticipate",
        decider: "Decide",
        suivre: "Follow",
        gouvernance: "Governance",
      },
      items: {
        dashboard: "War room",
        donnees: "Data",
        previsions: "Anticipation",
        actions: "Treatment",
        messages: "Support",
        rapports: "Reports",
        parametres: "Settings",
      },
      siteFallback: "All sites",
      expand: "Expand sidebar",
      collapse: "Collapse sidebar",
    },
    actions: {
      title: "Treatment center",
      subtitle: "Process alerts by operational impact",
      queueTitle: "Priority alerts",
      queueEmptyTitle: "No active alerts",
      queueEmptyDescription: "All sites are covered.",
      diagnosticTitle: "Diagnosis",
      optionsTitle: "Recommended options",
      paretoTitle: "Cost / service trade-off",
      paretoSubtitle: "Select a point to balance service level and cost.",
      validate: "Validate this option",
      validating: "Validating...",
      successTitle: "Decision recorded",
      successDescription: "The selected option has been saved.",
      risk: "Risk",
      impact: "Estimated impact",
      breach: "Before breach",
      noWorkspace: "Select an alert to display its diagnostic context.",
    },
    dashboard: {
      title: "War room",
      subtitle: "Critical priorities, coverage level, and decisions to execute",
      nowTitle: "Current status",
      todoTitle: "To handle today",
      trendTitle: "Operational trend",
      queueCta: "Move to treatment center",
      noAction: "No urgent action needed today.",
      onboardingTitle: "Getting started",
      onboardingSubtitle:
        "Complete these steps to accelerate your daily decisions.",
      onboardingDone: "Onboarding completed",
      onboardingMarkDone: "Mark as done",
      onboardingReset: "Reset checklist",
      onboardingSteps: {
        data: "Check data quality",
        forecast: "Review forecast outputs",
        decision: "Process one alert in treatment center",
        support: "Start a support conversation",
        report: "Export a weekly report",
      },
    },
  },
};

function getFromTree(tree: MessageTree, key: string): string | undefined {
  const segments = key.split(".");
  let current: string | MessageTree | undefined = tree;
  for (const segment of segments) {
    if (!current || typeof current === "string") {
      return undefined;
    }
    current = current[segment];
  }
  return typeof current === "string" ? current : undefined;
}

export function translate(locale: AppLocale, key: string): string {
  return (
    getFromTree(messages[locale], key) ??
    getFromTree(messages[FALLBACK_LOCALE], key) ??
    key
  );
}
