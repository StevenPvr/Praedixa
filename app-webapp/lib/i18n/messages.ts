export type AppLocale = "fr" | "en";

type MessageTree = {
  [key: string]: string | MessageTree;
};

export const FALLBACK_LOCALE: AppLocale = "fr";

export const messages: Record<AppLocale, MessageTree> = {
  fr: {
    appShell: {
      organization: "Compte client",
      openMenu: "Ouvrir la navigation",
      closeMenu: "Fermer la navigation",
      languageLabel: "Langue",
      workspace: "Espace de travail",
      tenant: "Tenant",
      environment: "Environnement",
      timezone: "Fuseau",
      updatedAt: "Mise a jour",
      production: "Production",
      statusLive: "Flux en direct",
      statusReview: "Revue executive",
      profileMenu: {
        open: "Ouvrir le compte",
        title: "Compte",
        noEmail: "Utilisateur",
        roleFallback: "Role inconnu",
        dashboard: "Accueil",
        settings: "Reglages",
        support: "Support",
        logout: "Se deconnecter",
        loggingOut: "Deconnexion...",
      },
    },
    sidebar: {
      title: "Priorite immediate",
      subtitle: "Traitez d'abord ce qui bloque l'operationnel.",
      cta: "Ouvrir le centre de traitement",
      groups: {
        pilotage: "Pilotage",
        donnees: "Donnees",
        anticipation: "Prevoir",
        traitement: "Agir",
        support: "Support",
      },
      items: {
        dashboard: "Accueil",
        donnees: "Donnees",
        donneesSites: "Sites",
        donneesDatasets: "Imports",
        donneesCanonique: "Qualite",
        donneesGold: "Gold",
        previsions: "Previsions",
        previsionsVue: "Vue",
        previsionsAlertes: "Alertes",
        previsionsModeles: "Modeles",
        actions: "Actions",
        actionsTraitement: "A traiter",
        actionsHistorique: "Historique",
        messages: "Support",
        rapports: "Rapports",
        onboarding: "Mise en route",
        parametres: "Reglages",
      },
      siteFallback: "Tous les sites",
      expand: "Etendre la navigation",
      collapse: "Reduire la navigation",
    },
    actions: {
      title: "Decisions a prendre",
      subtitle:
        "Traitez les alertes par impact et validez l'option la plus sure.",
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
      title: "Vue d'ensemble",
      subtitle: "Risque, couverture et actions prioritaires du jour.",
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
      label: "Recherche rapide",
      placeholder: "Aller a une page...",
      noResults: "Aucun resultat.",
      navigate: "Parcourir",
      select: "Ouvrir",
      close: "Fermer",
      recent: "Recents",
      sections: {
        navigation: "Pages",
      },
    },
  },
  en: {
    appShell: {
      organization: "Client account",
      openMenu: "Open navigation",
      closeMenu: "Close navigation",
      languageLabel: "Language",
      workspace: "Workspace",
      tenant: "Tenant",
      environment: "Environment",
      timezone: "Timezone",
      updatedAt: "Updated",
      production: "Production",
      statusLive: "Live feed",
      statusReview: "Executive review",
      profileMenu: {
        open: "Open account",
        title: "Account",
        noEmail: "Signed in user",
        roleFallback: "Unknown role",
        dashboard: "Home",
        settings: "Settings",
        support: "Support",
        logout: "Sign out",
        loggingOut: "Signing out...",
      },
    },
    sidebar: {
      title: "Immediate priority",
      subtitle: "Handle the most blocking issues first.",
      cta: "Open treatment center",
      groups: {
        pilotage: "Control",
        donnees: "Data",
        anticipation: "Forecast",
        traitement: "Actions",
        support: "Support",
      },
      items: {
        dashboard: "Home",
        donnees: "Data",
        donneesSites: "Sites",
        donneesDatasets: "Imports",
        donneesCanonique: "Quality",
        donneesGold: "Gold",
        previsions: "Forecasts",
        previsionsVue: "View",
        previsionsAlertes: "Alerts",
        previsionsModeles: "Models",
        actions: "Actions",
        actionsTraitement: "Queue",
        actionsHistorique: "History",
        messages: "Support",
        rapports: "Reports",
        onboarding: "Setup",
        parametres: "Settings",
      },
      siteFallback: "All sites",
      expand: "Expand navigation",
      collapse: "Collapse navigation",
    },
    actions: {
      title: "Decisions to make",
      subtitle: "Process alerts by impact and validate the safest option",
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
      title: "Overview",
      subtitle: "Risk, coverage and the next actions for today.",
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
      label: "Quick search",
      placeholder: "Go to a page...",
      noResults: "No results.",
      navigate: "Move",
      select: "Open",
      close: "Close",
      recent: "Recent",
      sections: {
        navigation: "Pages",
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
