import type { Dictionary } from "../types";

export const en: Dictionary = {
  meta: {
    title:
      "Praedixa | Multi-site coverage decisions | Impact measured monthly",
    description:
      "A free historical audit to estimate potential gains. Praedixa helps Ops and Finance compare coverage scenarios (teams, schedules, reinforcements), record decisions, and measure impact every month. Simple read-only integration (exports/APIs).",
    ogTitle:
      "Praedixa | Multi-site coverage decisions | Impact proof",
    ogDescription:
      "Praedixa makes trade-offs defensible: options compared, decisions recorded (what, why), and monthly impact proof.",
  },

  nav: {
    problem: "Problem",
    method: "Method",
    services: "Services",
    howItWorks: "How it works",
    useCases: "Decisions covered",
    security: "Integration & data",
    faq: "FAQ",
    contact: "Contact",
    ctaPrimary: "Get the free historical audit",
    backToSite: "Back to site",
  },

  hero: {
    kicker: "Praedixa Signature Service · Multi-site networks",
    headline: "Coverage decisions, comparable across sites.",
    headlineHighlight: "Impact measured monthly.",
    subtitle:
      "Praedixa connects read-only to your existing exports/APIs. We compare concrete coverage scenarios (capacity, schedules, reinforcements), record the rationale, and deliver a monthly proof you can use in reviews — to align Ops, Finance, and IT.",
    bullets: [
      {
        metric: "Free audit",
        text: "historical: potential & priorities",
      },
      {
        metric: "3 months",
        text: "method + monthly proof",
      },
      {
        metric: "Read-only",
        text: "exports/API, no heavy IT project",
      },
    ],
    ctaPrimary: "Request the free historical audit",
    ctaSecondary: "See the proof protocol",
    previewTitle: "A preview of what awaits you",
    ctaMeta:
      "Ops & Finance aligned from day one · Start on a focused scope",
    trustBadges: [
      "Guided decisions + decision journal + monthly proof",
      "Option: KPI forecasting only",
      "Indicators: capacity, demand, inventory/supply… (as needed)",
      "Read-only integration (exports/APIs)",
      "Multi-site comparability, governance, and standardization",
      "Hosted in France (Scaleway)",
    ],
  },

  preview: {
    kicker: "A preview",
    heading: "The Praedixa interface",
    subheading:
      "See how the decision protocol takes shape in the interface.",
    overlayTitle: "Discover the web app",
    overlayBody:
      "Open a public preview (same UI, fictitious data).",
    overlayCta: "Discover the web app",
    overlayBackCta: "Back to video",
    loadingLabel: "Loading preview video...",
    liveBadge: "Public preview",
  },

  demo: {
    title: "Praedixa interactive preview",
    subtitle:
      "Product walkthrough in a preview environment powered by fictitious data only.",
    mockBanner:
      "Preview environment — all data is fictitious, no customer data is used.",
    backToLanding: "Back to landing page",
    screenAriaLabel: "Interactive preview of the Praedixa interface",
    updatedAtLabel: "Latest preview update",
    loading: "Loading preview data...",
    empty: "No preview data available for this screen.",
    error: "Unable to load this preview screen.",
    retry: "Retry",
    openAction: "Open",
    nav: {
      dashboard: "Dashboard",
      forecasts: "Forecasts",
      actions: "Actions",
      datasets: "Datasets",
      settings: "Settings",
    },
    sections: {
      kpis: "Key indicators",
      alerts: "Priority alerts",
      forecastWindow: "Forecast window (7 days)",
      decisions: "Recommended decisions",
      datasetsHealth: "Dataset health",
      governance: "Governance framework",
    },
  },

  problem: {
    kicker: "Operational problem",
    heading:
      "Cost/service trade-offs happen daily — rarely with proof.",
    subheading:
      "Without a shared Ops/Finance protocol, decisions stay defensive, vary by site, and are hard to defend economically.",
    cta: "Request the free historical audit",
    ctaHint:
      "Reply within 48 business hours. Free historical audit. Ops + Finance framing from week 1.",
    states: {
      loadingTitle: "Reading operational signals",
      loadingBody:
        "We are structuring your friction points before cost/service arbitration.",
      emptyTitle: "No signal available",
      emptyBody:
        "Add operational cases to prioritize and build the arbitration log.",
      errorTitle: "Section unavailable",
      errorBody:
        "The operational problem framing cannot be displayed right now.",
    },
    pains: [
      {
        title: "Late trade-offs",
        description:
          "Useful signals arrive when room for maneuver is already limited.",
        consequence:
          "Emergency staffing, team overload, unstable service quality",
        cost: "Reacting often costs more than anticipating",
      },
      {
        title: "Different rules across sites",
        description:
          "Each site applies local logic with no shared reference.",
        consequence:
          "Harder comparisons and fragile network governance",
        cost: "Less controlled operations budget at network level",
      },
      {
        title: "Economic impact is hard to attribute",
        description:
          "Actions are launched, but real impact stays unclear.",
        consequence:
          "Reviews lack clear evidence of what works",
        cost: "Budgets and priorities are challenged without proof",
      },
    ],
    diagnostic: {
      title: "Does this sound familiar?",
      signals: [
        "You have forecasts, but no usable decision journal",
        "Field adjustments are poorly documented (or not reusable)",
        "Baseline / recommended / actual is not standardized",
        "Multi-site reviews rely on ad-hoc explanations",
      ],
    },
  },

  solution: {
    kicker: "Praedixa method",
    heading: "We improve decisions, not just forecasts.",
    subheading:
      "Forecasting helps. Value comes from decisions you can compare, record, and quantify. The goal: clearer cost/service trade-offs and repeatable impact proof.",
    principles: [
      {
        title: "The right signals, at the right level",
        subtitle: "Understand the situation",
        description:
          "Capacity, demand, inventory/supply… based on your priorities. Team/site level only (not individual).",
      },
      {
        title: "Concrete options to compare",
        subtitle: "Choose with your rules",
        description:
          "We put real options on the table (reinforcement, reallocation, schedule adjustment, etc.) and make the trade-off explicit before acting.",
      },
      {
        title: "Decision journal + monthly proof",
        subtitle: "Record, then measure",
        description:
          "What was chosen, why, and what changed. Then a monthly proof you can use in reviews.",
      },
    ],
    differentiators: {
      title: "What Praedixa does (and doesn't)",
      description:
        "One product: the complete Signature Service. Optionally, KPI forecasting only if you need it.",
      items: [
        {
          is: "Signature Service (decisions + journal + proof)",
          isNot: "Forecasting only, no decision protocol",
        },
        {
          is: "Adds on top of your tools (read-only)",
          isNot: "A WFM/scheduling/ERP replacement",
        },
        {
          is: "Monthly proof (baseline / recommended / actual)",
          isNot: "Dashboards disconnected from decisions",
        },
      ],
    },
  },

  howItWorks: {
    kicker: "Pilot protocol",
    heading: "A 4-step pilot with clear milestones.",
    subheading:
      "Free historical audit, proof milestone in week 8, consolidation in 3 months.",
    steps: [
      {
        number: "01",
        title: "Framing + free audit",
        subtitle: "History & starting point",
        description:
          "Month 1: audit your historical data to estimate potential and pick the priority decisions to cover.",
      },
      {
        number: "02",
        title: "Read-only connection",
        subtitle: "Existing exports/APIs",
        description:
          "Read-only connection via CSV/Excel/APIs. We set up the indicators you need (capacity, demand, inventory/supply… as needed).",
      },
      {
        number: "03",
        title: "Guided decisions + journal",
        subtitle: "Options, choices, reasons",
        description:
          "Compare options with your rules. Each decision is recorded: proposed option, final choice, reason, outcome.",
      },
      {
        number: "04",
        title: "Impact proof & governance",
        subtitle: "Week 8 then month 3",
        description:
          "Monthly proof, Ops + Finance reviews, multi-site standardization, and scale-up plan.",
      },
    ],
  },

  useCases: {
    kicker: "Decisions covered",
    heading: "One engine, many decisions.",
    subheading:
      "One protocol across multi-site verticals: restaurants, retail, hospitality, dealerships/workshops, logistics, healthcare, industry, call centers.",
    labels: {
      context: "Context",
      action: "Decision lever",
      impact: "Expected proof",
    },
    cases: [
      {
        id: "volatility",
        title: "Multi-site demand peaks",
        context:
          "Rush periods and volume swings destabilize field capacity.",
        action:
          "Forecasts + capacity, reinforcement/reallocation options, documented cost/service trade-off.",
        result:
          "Less last-minute urgency and more stable service levels and schedules.",
      },
      {
        id: "absenteeism",
        title: "Rare skills and absences",
        context:
          "Planning fragility from critical absences and workshop/clinical/maintenance dependencies.",
        action:
          "Criticality-based prioritization, alternative coverage options, recorded choices.",
        result:
          "More robust continuity and reduced emergency mode.",
        callout:
          "No individual data — only team/site-level steering.",
      },
      {
        id: "crosssite",
        title: "Cross-site capacity arbitrage",
        context:
          "Limited resources must be allocated across competing sites.",
        action:
          "Compare options across sites with local constraints and network-level goals.",
        result:
          "Comparable decisions, standardized governance, defensible executive trade-offs.",
        callout:
          "Praedixa structures the decision. The company keeps final decision authority.",
      },
      {
        id: "roi",
        title: "Monthly Ops/Finance review",
        context:
          "Hard to connect field decisions to real economic impact.",
        action:
          "Decision journal + before / recommended / actual comparison protocol.",
        result:
          "A monthly pack usable for priorities, budgets, and renewal.",
      },
    ],
  },

  deliverables: {
    kicker: "Economic impact proof",
    heading: "Differentiator: decision journal + proof.",
    subheading:
      "No vague promises: a simple, comparable, repeatable protocol.",
    roiFrames: [
      {
        label: "Baseline (reference)",
        value: "Your current operating baseline",
        note: "Stable comparison point: what would happen without Praedixa recommendations.",
        sourceLabel: "Source: Praedixa pilot protocol",
        sourceUrl: "/en/pilot-protocol",
      },
      {
        label: "Recommended (potential)",
        value: "The recommended scenario",
        note: "Potential under your constraints (cost, service, business rules).",
        sourceLabel: "Source: Praedixa pilot protocol",
        sourceUrl: "/en/pilot-protocol",
      },
      {
        label: "Actual (field)",
        value: "What was done, and why",
        note: "Captures what was executed in the field to attribute net impact.",
        sourceLabel: "Source: Praedixa pilot protocol",
        sourceUrl: "/en/pilot-protocol",
      },
    ],
    checklist: [
      "Decision journal: options, choice, rationale, outcome",
      "Indicators: operating cost, service level, emergencies, schedule stability",
      "Baseline / recommended / actual comparison (site + network)",
      "Monthly Ops + Finance ritual",
      "Monthly pack usable in exec reviews",
    ],
  },

  security: {
    kicker: "Integration & data",
    heading: "Read-only setup, fast launch, clear governance.",
    subheading:
      "Praedixa sits on top of your existing systems: read-only connection first, then standardized decisions and impact measurement across sites.",
    tiles: [
      {
        title: "Read-only via exports/APIs",
        description:
          "Kickoff with existing CSV/Excel/APIs. Praedixa does not replace your WFM/scheduling/ERP/CRM tools.",
      },
      {
        title: "Only the indicators you need",
        description:
          "Capacity, demand, inventory/supply… based on your priorities.",
      },
      {
        title: "Aggregated data (team/site)",
        description:
          "No individual prediction. Team/site-level steering to reduce exposure and simplify governance.",
      },
      {
        title: "Encryption & access control",
        description:
          "Encryption in transit and at rest. Role-based access control (RBAC). Activity logs.",
      },
      {
        title: "Comparable multi-site governance",
        description:
          "Common reference to compare decisions and impact across sites, workshops, or networks.",
      },
      {
        title: "Hosted in France (Scaleway)",
        description:
          "Platform and data hosted in France (Paris), with a transparent security posture for qualification.",
      },
    ],
    compatibility: {
      title: "Compatible with your stack",
      description:
        "Praedixa complements your tools and adds a decision + proof protocol for Ops and Finance.",
      tools: ["WFM", "Scheduling", "ERP", "CRM", "BI", "Excel"],
    },
    honesty:
      "A KPI forecasting-only mode is available, but our core value is Signature Service: guided decisions + decision journal + monthly proof.",
  },

  pilot: {
    kicker: "Pilot offer",
    heading:
      "Praedixa Signature pilot: free audit, proof in 3 months.",
    subheading:
      "Multi-vertical program for multi-site companies: restaurants, retail, hospitality, dealerships/workshops, logistics, healthcare, industry, call centers.",
    statusLabels: ["Free audit (M1)", "Proof milestone (S8)", "Consolidation (M3)"],
    included: {
      title: "What you receive",
      items: [
        "Free historical audit and potential estimate",
        "Useful indicators/forecasts (capacity, demand, inventory/supply… as needed)",
        "Compared decision options (cost, service, business rules)",
        "Shared decision journal: option, choice, reason, outcome",
        "Monthly proof: baseline / recommended / actual",
        "Ops + Finance governance cadence",
      ],
    },
    excluded: {
      title: "What it does not include",
      items: [
        "Replacement of your WFM/scheduling tool",
        "Public predefined quantified outcome guarantee",
        "Immediate global multi-country deployment",
        "Unlimited custom development",
      ],
    },
    kpis: {
      title: "KPIs tracked",
      items: [
        "Coverage quality and service-level performance",
        "Operating cost (emergency usage, reallocations, reinforcement options)",
        "Rate and reasons for “not following the recommended option” in the journal",
        "Before / recommended / actual gap by site and network",
      ],
    },
    governance: {
      title: "Governance",
      items: [
        "Weekly operations working session",
        "Monthly Ops + Finance review",
        "Client-side operations sponsor",
        "Shared decision journal and monthly proof",
      ],
    },
    selection: {
      title: "Eligibility criteria",
      items: [
        "Multi-site organization with demand variability and daily trade-offs",
        "Available operations and finance sponsors",
        "Usable exports (demand/workload, capacity/workforce, inventory/supply, absences)",
      ],
    },
    upcoming: {
      title: "Post-pilot path",
      description:
        "Progressive extension to more sites, more decisions, and more KPIs without replacing your existing stack.",
    },
    urgency:
      "Applications reviewed within 48 business hours. Focused-scope kickoff possible.",
    ctaPrimary: "Apply for the Praedixa Signature pilot",
    ctaMeta:
      "Free historical audit · Read-only exports/APIs · Monthly proof",
  },

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
    emptyBody:
      "Select another category to display actionable answers.",
    errorTitle: "The FAQ section cannot be rendered",
    errorBody:
      "The active category is invalid. Reset to the first category.",
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
          "A service that helps you arbitrate coverage (teams, schedules, reinforcements) and deliver a monthly impact proof.",
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
        question: "How is this different from WFM/ERP/scheduling tools?",
        answer:
          "Praedixa does not replace them. It sits on top of what you already use to support decisions and measure impact.",
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
        question:
          "What happens if we stay in KPI forecasting-only mode?",
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
      title:
        "Praedixa | Signature Service vs KPI forecasting only",
      description:
        "Clear comparison between Praedixa Signature Service (guided decisions + monthly proof) and KPI forecasting-only mode (capacity, demand, inventory/supply…).",
      ogTitle:
        "Praedixa | Signature Service and KPI forecasting only",
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
            "KPI forecasting (Workforce, demand, inventory, supply, others on request)",
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
          criterion:
            "Decision journal (option, choice, reason, outcome)",
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
      "Multi-site coverage decisions, a decision journal, and monthly impact proof.",
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
        placeholder: "E.g.: WFM + ERP + CRM",
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
      "Restaurants / Retail / Hospitality",
      "Auto dealerships / Workshops",
      "Logistics / Warehouses",
      "Healthcare / Clinics",
      "Industry / Maintenance",
      "Call centers",
      "Transport",
      "Services",
      "Other",
    ],
    employeeRanges: ["50-100", "100-250", "250-500", "500-1,000", "1,000+"],
    siteCounts: ["1-3", "4-10", "11-30", "31+"],
    roles: [
      "COO / Operations Director",
      "Multi-site Network Manager",
      "Planning / Workshop Manager",
      "Supply / Inventory Manager",
      "CFO / Finance Director",
      "General Manager",
      "Other",
    ],
    timelines: ["0-3 months", "3-6 months", "6-12 months", "Exploration"],
  },
};
