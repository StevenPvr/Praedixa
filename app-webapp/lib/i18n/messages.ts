export type AppLocale = "fr" | "en";

type MessageTree = {
  [key: string]: string | MessageTree;
};

export const FALLBACK_LOCALE: AppLocale = "fr";

export const messages: Record<AppLocale, MessageTree> = {
  fr: {
    appShell: {
      organization: "Organisation",
      openMenu: "Ouvrir le menu",
      closeMenu: "Fermer le menu",
      languageLabel: "Langue",
    },
    sidebar: {
      title: "Priorite du jour",
      subtitle: "Valider les alertes les plus critiques",
      cta: "Ouvrir la file de decision",
      groups: {
        pilotage: "Pilotage",
        decider: "Decider",
        collaborer: "Collaborer",
        admin: "Admin",
      },
      items: {
        dashboard: "Vue d'ensemble",
        donnees: "Donnees",
        previsions: "Analyse",
        actions: "File de decision",
        messages: "Support",
        rapports: "Rapports",
        parametres: "Parametres",
      },
      siteFallback: "Tous les sites",
      expand: "Agrandir le menu",
      collapse: "Reduire le menu",
    },
    actions: {
      title: "Decision Queue",
      subtitle: "Traitez les alertes dans l'ordre d'impact",
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
      title: "Pilotage",
      subtitle: "Statut actuel, priorites du jour et performance recente",
      nowTitle: "Etat maintenant",
      todoTitle: "A traiter aujourd'hui",
      trendTitle: "Performance recente",
      queueCta: "Traiter dans la file de decision",
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
        decision: "Traiter une alerte dans la file de decision",
        support: "Demarrer une conversation support",
        report: "Exporter un rapport hebdomadaire",
      },
    },
  },
  en: {
    appShell: {
      organization: "Organization",
      openMenu: "Open menu",
      closeMenu: "Close menu",
      languageLabel: "Language",
    },
    sidebar: {
      title: "Top priority",
      subtitle: "Resolve the most critical alerts first",
      cta: "Open decision queue",
      groups: {
        pilotage: "Operate",
        decider: "Decide",
        collaborer: "Collaborate",
        admin: "Admin",
      },
      items: {
        dashboard: "Overview",
        donnees: "Data",
        previsions: "Analysis",
        actions: "Decision queue",
        messages: "Support",
        rapports: "Reports",
        parametres: "Settings",
      },
      siteFallback: "All sites",
      expand: "Expand sidebar",
      collapse: "Collapse sidebar",
    },
    actions: {
      title: "Decision Queue",
      subtitle: "Process alerts by impact priority",
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
      title: "Operations",
      subtitle: "Current status, today's priorities, and recent performance",
      nowTitle: "Current status",
      todoTitle: "To handle today",
      trendTitle: "Recent performance",
      queueCta: "Handle in decision queue",
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
        decision: "Process one alert in the decision queue",
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
