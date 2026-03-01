/** Typed dictionary structure — both FR and EN must match this shape */
export interface Dictionary {
  meta: {
    title: string;
    description: string;
    ogTitle: string;
    ogDescription: string;
  };

  nav: {
    problem: string;
    method: string;
    services: string;
    howItWorks: string;
    useCases: string;
    security: string;
    faq: string;
    contact: string;
    ctaPrimary: string;
    backToSite: string;
  };

  hero: {
    kicker: string;
    headline: string;
    headlineHighlight: string;
    subtitle: string;
    bullets: { metric: string; text: string }[];
    ctaPrimary: string;
    ctaSecondary: string;
    previewTitle: string;
    ctaMeta: string;
    trustBadges: string[];
  };

  preview: {
    kicker: string;
    heading: string;
    subheading: string;
    overlayTitle: string;
    overlayBody: string;
    overlayCta: string;
    overlayBackCta: string;
    loadingLabel: string;
    liveBadge: string;
  };

  demo: {
    title: string;
    subtitle: string;
    mockBanner: string;
    backToLanding: string;
    screenAriaLabel: string;
    updatedAtLabel: string;
    loading: string;
    empty: string;
    error: string;
    retry: string;
    openAction: string;
    nav: {
      dashboard: string;
      forecasts: string;
      actions: string;
      datasets: string;
      settings: string;
    };
    sections: {
      kpis: string;
      alerts: string;
      forecastWindow: string;
      decisions: string;
      datasetsHealth: string;
      governance: string;
    };
  };

  problem: {
    kicker: string;
    heading: string;
    subheading: string;
    cta: string;
    ctaHint: string;
    states: {
      loadingTitle: string;
      loadingBody: string;
      emptyTitle: string;
      emptyBody: string;
      errorTitle: string;
      errorBody: string;
    };
    pains: {
      title: string;
      description: string;
      consequence: string;
      cost: string;
    }[];
    diagnostic: {
      title: string;
      signals: string[];
    };
  };

  solution: {
    kicker: string;
    heading: string;
    subheading: string;
    principles: {
      title: string;
      subtitle: string;
      description: string;
    }[];
    differentiators: {
      title: string;
      description: string;
      items: { is: string; isNot: string }[];
    };
  };

  howItWorks: {
    kicker: string;
    heading: string;
    subheading: string;
    steps: {
      number: string;
      title: string;
      subtitle: string;
      description: string;
    }[];
  };

  useCases: {
    kicker: string;
    heading: string;
    subheading: string;
    labels: {
      context: string;
      action: string;
      impact: string;
    };
    cases: {
      id: string;
      title: string;
      context: string;
      action: string;
      result: string;
      callout?: string;
    }[];
  };

  deliverables: {
    kicker: string;
    heading: string;
    subheading: string;
    roiFrames: {
      label: string;
      value: string;
      note: string;
      sourceLabel: string;
      sourceUrl: string;
    }[];
    checklist: string[];
  };

  security: {
    kicker: string;
    heading: string;
    subheading: string;
    tiles: {
      title: string;
      description: string;
    }[];
    compatibility: {
      title: string;
      description: string;
      tools: string[];
    };
    honesty: string;
  };

  pilot: {
    kicker: string;
    heading: string;
    subheading: string;
    statusLabels: string[];
    included: { title: string; items: string[] };
    excluded: { title: string; items: string[] };
    kpis: { title: string; items: string[] };
    governance: { title: string; items: string[] };
    selection: { title: string; items: string[] };
    upcoming: { title: string; description: string };
    urgency: string;
    ctaPrimary: string;
    ctaMeta: string;
  };

  faq: {
    kicker: string;
    heading: string;
    subheading: string;
    signalLabel: string;
    signalBody: string;
    categoryHint: string;
    liveLabel: string;
    loadingLabel: string;
    emptyTitle: string;
    emptyBody: string;
    errorTitle: string;
    errorBody: string;
    retryLabel: string;
    categories: string[];
    items: {
      question: string;
      answer: string;
      category: string;
    }[];
  };

  contact: {
    kicker: string;
    heading: string;
    subheading: string;
    trustItems: string[];
    ctaPrimary: string;
    ctaSecondary: string;
  };

  servicesPage: {
    meta: {
      title: string;
      description: string;
      ogTitle: string;
      ogDescription: string;
    };
    kicker: string;
    heading: string;
    subheading: string;
    fullPackage: {
      badge: string;
      title: string;
      summary: string;
      includesTitle: string;
      includes: string[];
      cta: string;
    };
    forecastsOnly: {
      badge: string;
      title: string;
      summary: string;
      includesTitle: string;
      includes: string[];
      limitsTitle: string;
      limits: string[];
      cta: string;
    };
    comparison: {
      title: string;
      columns: {
        criterion: string;
        fullPackage: string;
        forecastsOnly: string;
      }[];
    };
    decisionGuide: {
      title: string;
      items: string[];
    };
    bottomNote: string;
  };

  footer: {
    tagline: string;
    badges: string[];
    navigation: string;
    legalContact: string;
    copyright: string;
    ctaBanner: {
      kicker: string;
      heading: string;
      cta: string;
    };
  };

  stickyCta: {
    text: string;
  };

  form: {
    pageTitle: string;
    pageSubtitle: string;
    pill: string;
    valuePoints: string[];
    estimatedTime: string;
    estimatedTimeValue: string;
    fieldsets: {
      organisation: string;
      contact: string;
      challenges: string;
    };
    fields: Record<string, { label: string; placeholder?: string }>;
    select: string;
    consent: string;
    cguLabel: string;
    privacyLabel: string;
    submit: string;
    submitting: string;
    success: {
      title: string;
      description: string;
      backToSite: string;
      checkEmail: string;
    };
    error: string;
    sectors: string[];
    employeeRanges: string[];
    siteCounts: string[];
    roles: string[];
    timelines: string[];
  };
}
