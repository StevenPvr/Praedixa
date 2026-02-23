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
      workspace: "Espace de travail",
      tenant: "Tenant",
      environment: "Environnement",
      timezone: "Fuseau",
      updatedAt: "Derniere sync",
      production: "Production",
      statusLive: "Flux en direct",
      statusReview: "Revue executive",
      profileMenu: {
        open: "Ouvrir le menu profil",
        title: "Menu profil",
        noEmail: "Utilisateur connecte",
        roleFallback: "role inconnu",
        dashboard: "Tableau de bord",
        settings: "Reglages",
        support: "Support",
        logout: "Se deconnecter",
        loggingOut: "Deconnexion...",
      },
    },
    sidebar: {
      title: "Priorite immediate",
      subtitle:
        "Traiter les alertes qui menacent la continuité opérationnelle.",
      cta: "Ouvrir le centre de traitement",
      groups: {
        pilotage: "Pilotage",
        donnees: "Donnees",
        anticipation: "Anticipation",
        traitement: "Traitement",
        support: "Support & gouvernance",
      },
      items: {
        dashboard: "Tableau de bord",
        donnees: "Donnees operationnelles",
        donneesSites: "Mes sites",
        donneesDatasets: "Fichiers importes",
        donneesCanonique: "Donnees consolidees",
        donneesGold: "Gold Explorer",
        previsions: "Anticipation",
        previsionsVue: "Vue par site",
        previsionsAlertes: "Toutes les alertes",
        previsionsModeles: "Monitoring IA/ML",
        actions: "Traitement",
        actionsTraitement: "Alertes a traiter",
        actionsHistorique: "Decisions passees",
        messages: "Support",
        rapports: "Rapports",
        onboarding: "Onboarding",
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
    commandPalette: {
      label: "Palette de commandes",
      placeholder: "Rechercher une page, une action…",
      noResults: "Aucun résultat trouvé.",
      navigate: "Naviguer",
      select: "Ouvrir",
      close: "Fermer",
      sections: {
        navigation: "Navigation",
      },
    },
  },
  en: {
    appShell: {
      organization: "Client account",
      openMenu: "Open menu",
      closeMenu: "Close menu",
      languageLabel: "Language",
      workspace: "Workspace",
      tenant: "Tenant",
      environment: "Environment",
      timezone: "Timezone",
      updatedAt: "Last sync",
      production: "Production",
      statusLive: "Live feed",
      statusReview: "Executive review",
      profileMenu: {
        open: "Open profile menu",
        title: "Profile menu",
        noEmail: "Signed-in user",
        roleFallback: "unknown role",
        dashboard: "Dashboard",
        settings: "Settings",
        support: "Support",
        logout: "Sign out",
        loggingOut: "Signing out...",
      },
    },
    sidebar: {
      title: "Immediate priority",
      subtitle: "Resolve alerts that threaten operational continuity first.",
      cta: "Open treatment center",
      groups: {
        pilotage: "Control",
        donnees: "Data",
        anticipation: "Anticipation",
        traitement: "Treatment",
        support: "Support & governance",
      },
      items: {
        dashboard: "Control room",
        donnees: "Operational data",
        donneesSites: "Sites",
        donneesDatasets: "Imported files",
        donneesCanonique: "Consolidated data",
        donneesGold: "Gold explorer",
        previsions: "Anticipation",
        previsionsVue: "Site overview",
        previsionsAlertes: "All alerts",
        previsionsModeles: "AI/ML monitoring",
        actions: "Treatment",
        actionsTraitement: "Active alerts",
        actionsHistorique: "Past decisions",
        messages: "Support",
        rapports: "Reports",
        onboarding: "Onboarding",
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
    commandPalette: {
      label: "Command palette",
      placeholder: "Search for a page, an action…",
      noResults: "No results found.",
      navigate: "Navigate",
      select: "Open",
      close: "Close",
      sections: {
        navigation: "Navigation",
      },
    },
  },
};

function getFromTree(tree: MessageTree, key: string): string | undefined {
  const blockedSegments = new Set(["__proto__", "prototype", "constructor"]);
  const segments = key.split(".");
  let current: string | MessageTree | undefined = tree;
  for (const segment of segments) {
    if (blockedSegments.has(segment)) {
      return undefined;
    }
    if (!current || typeof current === "string") {
      return undefined;
    }
    // nosemgrep: javascript.lang.security.audit.prototype-pollution.prototype-pollution-loop.prototype-pollution-loop
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
