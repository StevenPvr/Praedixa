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

export interface HeroOfferDescriptor {
  badge: string;
  title: string;
  body: string;
  note: string;
}

export interface StackComparisonRow {
  category: string;
  currentCoverage: string;
  stopsAt: string;
  praedixaAdd: string;
}

export interface CredibilityRibbonContent {
  stackChips: string[];
  roleChips: string[];
  trustMarkers: string[];
  stackLabel: string;
  rolesLabel: string;
  rolesMicrocopy: string;
  trustLabel: string;
}

export interface MethodStep {
  id: "voir" | "comparer" | "decider" | "prouver";
  number: string;
  verb: string;
  title: string;
  body: string;
  bullets: string[];
  microproof: string;
}

export interface DeploymentStep {
  marker: string;
  title: string;
  description: string;
}
export interface IntegrationControl {
  badge: string;
  title: string;
  body: string;
}
export interface FaqItem {
  question: string;
  answer: string;
}

export interface FinalCtaContent {
  label: string;
  heading: string;
  body: string;
  promiseItems: string[];
  step1Fields: { name: string; type: "select" | "text"; options?: string[] }[];
  step2Fields: { name: string; type: "text" | "email" | "textarea" }[];
  step1Cta: string;
  step2Cta: string;
  successTitle: string;
  successBody: string;
}

export interface ProblemCard {
  number: string;
  title: string;
  consequence: string;
}
export interface ProofPreviewTab {
  label: string;
  content: string;
}
export interface ProofPreviewMetric {
  value: string;
  label: string;
}

export interface SocialProofContent {
  eyebrow: string;
  statValue: string;
  statLabel: string;
  logosAlt: string;
  marqueeLabel: string;
}

export interface ProductPreviewContent {
  kicker: string;
  heading: string;
  subheading: string;
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
  heroBadgeText?: string;
  heroProofBlockText?: string;
  heroProofRoles?: string[];
  heroProofMicropill?: string;
  heroLogoCaption?: string;
  heroOffer: HeroOfferDescriptor;
  socialProof: SocialProofContent;
  product: ProductPreviewContent;
  footerTagline: string;
  qualificationTitle: string;
  qualificationBody: string;
  fitTitle: string;
  fitItems: string[];
  notFitTitle: string;
  notFitItems: string[];
  stackComparison: {
    kicker: string;
    heading: string;
    subheading: string;
    columnLabels: {
      category: string;
      currentCoverage: string;
      stopsAt: string;
      praedixaAdd: string;
    };
    rows: StackComparisonRow[];
    bottomNote: string;
  };
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
  // V2 sections
  credibilityRibbon: CredibilityRibbonContent;
  problemCards: ProblemCard[];
  method: {
    kicker: string;
    heading: string;
    steps: MethodStep[];
  };
  proofPreview: {
    kicker: string;
    heading: string;
    body: string;
    tabs: ProofPreviewTab[];
    metrics: ProofPreviewMetric[];
  };
  deployment: {
    kicker: string;
    heading: string;
    subheading: string;
    steps: DeploymentStep[];
    notItems: string[];
    ctaMicrocopy: string;
  };
  integrationSecurity: {
    kicker: string;
    heading: string;
    subheading: string;
    controls: IntegrationControl[];
    stackItems: string[];
  };
  faqV2: {
    heading: string;
    items: FaqItem[];
    contactCta: string;
    contactBody: string;
  };
  finalCta: FinalCtaContent;
}

export type ValuePropByLocale = Record<Locale, ValuePropContent>;
