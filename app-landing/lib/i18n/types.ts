/** Typed dictionary structure — both FR and EN must match this shape */
export interface Dictionary {
  meta: {
    title: string;
    description: string;
    ogTitle: string;
    ogDescription: string;
  };

  nav: {
    method: string;
    security: string;
    faq: string;
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
    ctaMeta: string;
    trustBadges: string[];
  };

  problem: {
    kicker: string;
    heading: string;
    subheading: string;
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
    included: { title: string; items: string[] };
    excluded: { title: string; items: string[] };
    kpis: { title: string; items: string[] };
    governance: { title: string; items: string[] };
    urgency: string;
    ctaPrimary: string;
    ctaMeta: string;
  };

  faq: {
    kicker: string;
    heading: string;
    subheading: string;
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
