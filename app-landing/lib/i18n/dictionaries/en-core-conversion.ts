import type { Dictionary } from "../types";

export const enCoreConversion: Partial<Dictionary> = {
  faq: {
    kicker: "FAQ",
    heading: "Frequently asked questions",
    subheading:
      "Clear answers for COO/Ops, CFO teams, and multi-site decision owners.",
    signalLabel: "Pointers",
    signalBody:
      "Each answer is shaped to support fast decisions across operations, finance, and IT.",
    categoryHint: "Choose a category, then open a question",
    liveLabel: "Dynamic FAQ block",
    loadingLabel: "Loading answers...",
    emptyTitle: "No questions in this category",
    emptyBody: "Select another category to display actionable answers.",
    errorTitle: "The FAQ section cannot be rendered",
    errorBody: "The active category is invalid. Reset to the first category.",
    retryLabel: "Reset category",
    categories: [
      "Understanding Praedixa",
      "Pilot & pricing",
      "Technical & data",
    ],
    items: [
      {
        question: "What is Praedixa in one sentence?",
        answer:
          "The French DecisionOps platform that turns critical trade-offs into calculated, executable, auditable decisions.",
        category: "Understanding Praedixa",
      },
      {
        question:
          "What is the difference between Praedixa Signature Service and KPI forecasting only?",
        answer:
          "Signature Service includes guided decisions, a decision journal, and monthly proof. KPI forecasting-only covers forecasts and signals only.",
        category: "Understanding Praedixa",
      },
      {
        question: "Which KPIs can you forecast?",
        answer:
          "Teams/capacity, demand, inventory/supply… and other indicators based on your context and priorities.",
        category: "Understanding Praedixa",
      },
      {
        question: "Who makes the final decision?",
        answer:
          "Always your company. Praedixa compares options and helps you record the choice (and its impact).",
        category: "Understanding Praedixa",
      },
      {
        question: "How is this different from ERP/scheduling/BI tools?",
        answer:
          "Praedixa does not replace them. It governs the trade-offs that cut across those tools, logs the choice, and measures the impact.",
        category: "Understanding Praedixa",
      },
      {
        question: "What is included in the free 1-month audit?",
        answer:
          "A historical audit to estimate potential gains and scope the priority decisions to cover.",
        category: "Pilot & pricing",
      },
      {
        question: "How is the 3-month pilot structured?",
        answer:
          "M1: free audit + read-only kickoff. Week 8: first proof milestone. Month 3: consolidation and full proof.",
        category: "Pilot & pricing",
      },
      {
        question: "How do you prove ROI?",
        answer:
          "By comparing three situations: before (reference), recommended (potential), and actual (field). With a clear decision journal for choices and reasons.",
        category: "Pilot & pricing",
      },
      {
        question: "What data do you need to start?",
        answer:
          "Your existing exports (CSV/Excel/API): demand/workload, teams/capacity, inventory/supply, absences, plus key business rules.",
        category: "Technical & data",
      },
      {
        question: "Do we need heavy IT integration?",
        answer:
          "No. Kickoff is read-only through exports/API, then light automation if needed.",
        category: "Technical & data",
      },
      {
        question: "Do you process individual data?",
        answer:
          "No. Praedixa works on aggregated team/site data and does not perform individual forecasting.",
        category: "Technical & data",
      },
      {
        question: "What happens if we stay in KPI forecasting-only mode?",
        answer:
          "You keep the forecasting deliverables. You can activate Signature Service later to add guided decisions, the decision journal, and monthly proof.",
        category: "Pilot & pricing",
      },
    ],
  },

  contact: {
    kicker: "Contact",
    heading: "Request the free historical audit.",
    subheading:
      "We frame your multi-site scope, run the historical audit, then set up the decision protocol and monthly proof.",
    trustItems: [
      "Response within 48 business hours",
      "Free historical audit",
      "Read-only via exports/APIs",
      "No mandatory post-pilot commitment",
    ],
    ctaPrimary: "Request the free historical audit",
    ctaSecondary: "See the proof protocol",
  },

  servicesPage: {
    meta: {
      title: "Praedixa | Signature Service vs KPI forecasting only",
      description:
        "Clear comparison between Praedixa Signature Service (guided decisions + monthly proof) and KPI forecasting-only mode (capacity, demand, inventory/supply…).",
      ogTitle: "Praedixa | Signature Service and KPI forecasting only",
      ogDescription:
        "Two service levels, one product: Signature Service (decisions + journal + monthly proof) or KPI forecasting only.",
    },
    kicker: "Services",
    heading: "Praedixa Signature Service vs KPI forecasting only.",
    subheading:
      "One product. Two service levels. Signature Service is the complete offer. KPI forecasting-only is an entry mode.",
    fullPackage: {
      badge: "Praedixa Signature Service",
      title: "Full package (decisions + proof)",
      summary:
        "Praedixa core value: decide better day-to-day and measure impact.",
      includesTitle: "What is included",
      includes: [
        "Useful indicators/forecasts: capacity, demand, inventory/supply…",
        "Options compared under cost/service/business-rule constraints.",
        "Optimal decision recommendation with explicit trade-offs.",
        "Decision journal: option, choice, reason, outcome.",
        "Proof: baseline / recommended / actual.",
        "Multi-site governance: comparability and standardization.",
      ],
      cta: "Request a Praedixa Signature pilot",
    },
    forecastsOnly: {
      badge: "KPI forecasting only",
      title: "Focused forecasting mode",
      summary:
        "An entry mode to structure indicator forecasting before activating the full decision + proof layer.",
      includesTitle: "What is included",
      includes: [
        "Indicator forecasts: capacity, demand, inventory/supply…",
        "Operational forecasting deliverables for your teams.",
        "Read-only kickoff via exports/APIs.",
      ],
      limitsTitle: "What is not included",
      limits: [
        "No guided decisions under constraints.",
        "No full decision journal.",
        "No full proof (baseline / recommended / actual).",
      ],
      cta: "Discuss my forecasting needs",
    },
    comparison: {
      title: "Quick comparison",
      columns: [
        {
          criterion:
            "KPI forecasting (capacity, demand, inventory, supply, others on request)",
          fullPackage: "Included",
          forecastsOnly: "Included",
        },
        {
          criterion: "Cost/service-constrained option comparison",
          fullPackage: "Included",
          forecastsOnly: "Not included",
        },
        {
          criterion: "Optimal decision recommendation",
          fullPackage: "Included",
          forecastsOnly: "Not included",
        },
        {
          criterion: "Decision journal (option, choice, reason, outcome)",
          fullPackage: "Included",
          forecastsOnly: "Not included",
        },
        {
          criterion: "Proof (baseline / recommended / actual)",
          fullPackage: "Included",
          forecastsOnly: "Not included",
        },
      ],
    },
    decisionGuide: {
      title: "When to choose each mode",
      items: [
        "Choose Signature Service when decision quality and monthly proof are top priorities.",
        "Choose KPI forecasting-only if you first need a stronger forecasting baseline.",
        "You can start in KPI forecasting-only and activate Signature Service later without changing product.",
      ],
    },
    bottomNote:
      "Praedixa remains one decision product. Forecasting-only is a step; Signature Service is the differentiator.",
  },

  footer: {
    tagline:
      "Multi-site decisions, a decision journal, and monthly impact proof.",
    badges: ["Decision journal", "Monthly proof"],
    navigation: "Navigation",
    legalContact: "Legal & contact",
    copyright: "Designed and hosted in France",
    ctaBanner: {
      kicker: "Praedixa",
      heading:
        "Free historical audit, then decisions compared + monthly proof.",
      cta: "Request the free historical audit",
    },
  },

  stickyCta: {
    text: "Request the free historical audit",
  },

  form: {
    pageTitle: "Praedixa Signature pilot request",
    pageSubtitle:
      "This request qualifies your 3-month pilot (decisions + proof), including a free historical audit.",
    pill: "Praedixa Signature pilot (3 months)",
    valuePoints: [
      "Free historical audit",
      "COO/Ops and CFO-focused qualification",
      "Response within 48 business hours",
    ],
    estimatedTime: "Estimated time",
    estimatedTimeValue: "A few minutes",
    fieldsets: {
      organisation: "Organisation",
      contact: "Contact",
      challenges: "Challenges",
    },
    fields: {
      companyName: { label: "Company", placeholder: "E.g.: Atlas Group" },
      sector: { label: "Sector" },
      employeeRange: { label: "Headcount" },
      siteCount: { label: "Number of sites" },
      firstName: { label: "First name" },
      lastName: { label: "Last name" },
      role: { label: "Role" },
      email: { label: "Professional email", placeholder: "you@company.com" },
      phone: { label: "Phone", placeholder: "+33 6 00 00 00 00" },
      timeline: { label: "Project horizon" },
      currentStack: {
        label: "Current stack (optional)",
        placeholder: "E.g.: ERP + CRM + BI",
      },
      painPoint: {
        label: "Main decision to optimize",
        placeholder:
          "Describe the most critical cost/service trade-off you need to improve first.",
      },
    },
    select: "Select",
    consent: "I accept the {cgu} and the {privacy}.",
    cguLabel: "Terms",
    privacyLabel: "privacy policy",
    submit: "Submit application",
    submitting: "Submitting...",
    success: {
      title: "Application submitted",
      description:
        "We will reply within 48 business hours with a tailored framing and historical audit plan.",
      backToSite: "Back to site",
      checkEmail: "View pilot protocol",
    },
    error: "Something went wrong. Please try again.",
    sectors: [
      "Hospitality / Food service",
      "Higher education",
      "Logistics / Transport / Retail",
      "Automotive / dealerships / workshops",
      "Construction",
      "Services",
      "Other",
    ],
    employeeRanges: ["50-100", "100-250", "250-500", "500-1,000", "1,000+"],
    siteCounts: ["1-3", "4-10", "11-30", "31+"],
    roles: [
      "COO / Operations Director",
      "Multi-site Network Manager",
      "Operations / Workshop Manager",
      "Supply / Inventory Manager",
      "CFO / Finance Director",
      "General Manager",
      "Other",
    ],
    timelines: ["0-3 months", "3-6 months", "6-12 months", "Exploration"],
  },
};
