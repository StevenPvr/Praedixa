import type { Locale } from "../../i18n/locale";

export interface OfferTimelineStep {
  title: string;
  body: string;
}

export interface ProofComparisonRow {
  option: string;
  actionCost: string;
  inactionCost: string;
  serviceRisk: string;
  decision: string;
  observedEffect: string;
  limitation: string;
}

export interface ValuePropContent {
  icp: string;
  promise: string;
  mechanism: string;
  reassurance: string[];
  ctaPrimary: string;
  ctaSecondary: string;
  heroKicker: string;
  heroHeading: string;
  heroHeadingHighlight: string;
  heroSubheading: string;
  footerTagline: string;
  qualificationTitle: string;
  qualificationBody: string;
  fitTitle: string;
  fitItems: string[];
  notFitTitle: string;
  notFitItems: string[];
  servicesMeta: {
    title: string;
    description: string;
    ogTitle: string;
    ogDescription: string;
  };
  services: {
    kicker: string;
    heading: string;
    subheading: string;
    timelineTitle: string;
    timeline: OfferTimelineStep[];
    deliveredTitle: string;
    delivered: string[];
    notDeliveredTitle: string;
    notDelivered: string[];
    clientNeedsTitle: string;
    clientNeeds: string[];
    participantsTitle: string;
    participants: string[];
    reviewTitle: string;
    reviewItems: string[];
    primaryCtaLabel: string;
    secondaryCtaLabel: string;
    bottomNote: string;
  };
  contact: {
    heading: string;
    intro: string;
    promiseTitle: string;
    promiseItems: string[];
    proofIntentKicker: string;
    proofIntentHeading: string;
    proofIntentIntro: string;
    proofIntentPromiseItems: string[];
    scopingIntentKicker: string;
    scopingIntentHeading: string;
    scopingIntentIntro: string;
    scopingIntentPromiseItems: string[];
    reassuranceTitle: string;
    reassuranceItems: string[];
    secondaryPanelTitle: string;
    secondaryPanelBody: string;
    secondaryPanelCta: string;
    formTitle: string;
    formSubtitle: string;
    company: string;
    role: string;
    email: string;
    siteCount: string;
    sector: string;
    mainTradeOff: string;
    timeline: string;
    currentStack: string;
    message: string;
    mainTradeOffPlaceholder: string;
    currentStackPlaceholder: string;
    messagePlaceholder: string;
    send: string;
    sending: string;
    successTitle: string;
    successBody: string;
    successCta: string;
    fixErrors: string;
    unknownError: string;
    networkError: string;
    requiredCompany: string;
    requiredRole: string;
    requiredEmail: string;
    invalidEmail: string;
    requiredSiteCount: string;
    requiredSector: string;
    requiredMainTradeOff: string;
    requiredTimeline: string;
    antiSpam: string;
    challengeLoading: string;
    challengeUnavailable: string;
    challengeRetry: string;
    requiredConsent: string;
    requiredCaptcha: string;
    consentPrefix: string;
    termsLabel: string;
    consentJoin: string;
    privacyLabel: string;
  };
  proofMeta: {
    title: string;
    description: string;
    ogTitle: string;
    ogDescription: string;
  };
  proof: {
    kicker: string;
    title: string;
    lead: string;
    situationTitle: string;
    situationBody: string[];
    optionsTitle: string;
    optionsBody: string[];
    decisionTitle: string;
    decisionBody: string[];
    impactTitle: string;
    impactBody: string[];
    limitsTitle: string;
    limitsBody: string[];
    dataTitle: string;
    dataBody: string[];
    nextTitle: string;
    nextBody: string[];
    tableTitle: string;
    tableColumns: {
      option: string;
      actionCost: string;
      inactionCost: string;
      serviceRisk: string;
      decision: string;
      observedEffect: string;
      limitation: string;
    };
    rows: ProofComparisonRow[];
    primaryCtaLabel: string;
    secondaryCtaLabel: string;
  };
}

export type ValuePropByLocale = Record<Locale, ValuePropContent>;
