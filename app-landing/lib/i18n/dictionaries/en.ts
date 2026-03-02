import type { Dictionary } from "../types";

export const en: Dictionary = {
  meta: {
    title:
      "Praedixa | Multi-site coverage decisions | Monthly ROI proof",
    description:
      "One month of free historical audit to quantify potential gains. Praedixa helps you choose better coverage decisions (teams, schedules, reinforcements) and prove business impact every month. Simple, read-only integration (exports/APIs).",
    ogTitle:
      "Praedixa | Multi-site coverage decisions | ROI proof",
    ogDescription:
      "Praedixa makes decisions defensible: options compared, choices recorded (who decided what and why), and monthly business impact proof.",
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
    kicker: "Praedixa Signature Service · Multi-site",
    headline: "Decide better on coverage.",
    headlineHighlight: "Prove ROI every month.",
    subtitle:
      "Praedixa connects read-only to what you already have (exports/APIs). We compare real-world scenarios (protect service, reduce emergencies, stabilize schedules), then document decisions and outcomes to align Ops, Finance, and IT.",
    bullets: [
      {
        metric: "1 month free",
        text: "historical audit: what you could have saved",
      },
      {
        metric: "3 months",
        text: "to install the decision + ROI proof loop",
      },
      {
        metric: "Read-only",
        text: "exports/API, no heavy IT project",
      },
    ],
    ctaPrimary: "Get the free historical audit",
    ctaSecondary: "View ROI protocol",
    previewTitle: "A preview of what awaits you",
    ctaMeta:
      "COO/Ops and CFO alignment from framing · Focused-scope kickoff possible",
    trustBadges: [
      "Decisions + decision journal + monthly ROI proof",
      "Alternative mode: indicator forecasting only",
      "Indicators: teams/capacity, demand, inventory/supply… (as needed)",
      "Read-only via exports/API",
      "Multi-site comparability, governance, and standardization",
      "100% Scaleway hosting, 100% French",
    ],
  },

  preview: {
    kicker: "A preview",
    heading: "The Praedixa interface",
    subheading:
      "See how decision intelligence turns into operational execution.",
    overlayTitle: "Discover the web app",
    overlayBody:
      "Open the real web app interface in public preview mode with matching UI.",
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
      "Cost/service decisions are made every day, but rarely proven.",
    subheading:
      "Without a shared COO/CFO protocol, trade-offs stay defensive, inconsistent across sites, and hard to defend economically.",
    cta: "Get the free historical audit",
    ctaHint:
      "Free historical audit, COO/Ops + CFO framing from week one.",
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
        cost: "Reaction cost often exceeds anticipation cost",
      },
      {
        title: "Inconsistent decisions across sites",
        description:
          "Each site applies local logic with no common decision reference.",
        consequence:
          "Hard to compare sites and standardize governance",
        cost: "Operations budget becomes difficult to steer at network level",
      },
      {
        title: "Economic impact not attributable",
        description:
          "Actions are launched, but real impact stays unclear.",
        consequence:
          "COO/CFO reviews lack clear evidence of what works",
        cost: "Budgets and priorities are challenged",
      },
    ],
    diagnostic: {
      title: "Does this sound familiar?",
      signals: [
        "You have forecasts but no traced decision protocol",
        "Manual adjustments are poorly documented or not reusable",
        "You do not clearly compare before / recommended / actual",
        "Multi-site reviews rely on ad-hoc explanations",
      ],
    },
  },

  solution: {
    kicker: "Praedixa method",
    heading: "We improve decisions, not just charts.",
    subheading:
      "Forecasting helps, but value comes from consistent decisions you can trace and quantify. The goal: clearer cost/service trade-offs and a repeatable proof of impact.",
    principles: [
      {
        title: "The right signals, at the right level",
        subtitle: "Understand the situation",
        description:
          "Teams/capacity, demand, inventory/supply… based on your priorities. We work at team/site level (not individual).",
      },
      {
        title: "Concrete options to compare",
        subtitle: "Choose with your rules",
        description:
          "We put real options on the table (reinforcement, reallocation, schedule adjustment, etc.) and make the trade-off explicit before acting.",
      },
      {
        title: "Decision journal + ROI proof",
        subtitle: "Trace, then prove",
        description:
          "Who decided what, why, and what changed. Then a monthly proof you can use in leadership reviews.",
      },
    ],
    differentiators: {
      title: "What we optimize / what we use",
      description:
        "One Praedixa product with a complete Signature Service and an “indicator forecasting only” mode if needed.",
      items: [
        {
          is: "Praedixa Signature Service (full package)",
          isNot: "Forecasting only, without decision support",
        },
        {
          is: "A decision method on top of your tools",
          isNot: "A WFM/scheduling/ERP replacement",
        },
        {
          is: "Monthly ROI proof (before / recommended / actual)",
          isNot: "Dashboards without a link to decisions",
        },
      ],
    },
  },

  howItWorks: {
    kicker: "Pilot protocol",
    heading: "Praedixa Signature pilot in 4 steps.",
    subheading:
      "1 month free historical audit, S8 proof milestone, consolidation at month 3.",
    steps: [
      {
        number: "01",
        title: "Framing + free audit",
        subtitle: "History & starting point",
        description:
          "Month 1: audit historical data to estimate potential gains and scope the priority decisions.",
      },
      {
        number: "02",
        title: "Read-only initialization",
        subtitle: "Existing exports/API",
        description:
          "Read-only connection via CSV/Excel/API. We set up the useful indicators (teams/capacity, demand, inventory/supply… as needed).",
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
        title: "ROI proof & governance",
        subtitle: "S8 then M3",
        description:
          "Monthly ROI proof, COO/Ops + CFO reviews, multi-site standardization, and scale-up plan.",
      },
    ],
  },

  useCases: {
    kicker: "Decisions covered",
    heading: "One product, multiple operational outcomes.",
    subheading:
      "Same decision engine across verticals: restaurants, retail, hospitality, dealerships/workshops, logistics, healthcare, industry, call centers.",
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
          "Demand + Workforce forecasts, reinforcement/reallocation options, explicit cost/service trade-off.",
        result:
          "Fewer last-minute decisions and better service-level stability.",
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
        title: "Monthly COO/CFO review",
        context:
          "Hard to connect field decisions to real economic impact.",
        action:
          "Decision journal + before / recommended / actual comparison protocol.",
        result:
          "Monthly proof usable for priorities, budgets, and renewal.",
      },
    ],
  },

  deliverables: {
    kicker: "ROI proof",
    heading: "Differentiator: decision journal + proof.",
    subheading:
      "No vague promises: a simple, comparable, repeatable method.",
    roiFrames: [
      {
        label: "Before (reference)",
        value: "What usually happens in your operations",
        note: "Stable comparison point: what would have happened without Praedixa recommendations.",
        sourceLabel: "Source: Praedixa pilot protocol",
        sourceUrl: "/en/pilot-protocol",
      },
      {
        label: "Recommended (potential)",
        value: "Potential impact if recommendations are followed",
        note: "Measures potential value of constrained decision optimization under your business rules.",
        sourceLabel: "Source: Praedixa pilot protocol",
        sourceUrl: "/en/pilot-protocol",
      },
      {
        label: "Actual (field)",
        value: "What was actually done + why",
        note: "Captures what was really executed in the field to prove net business impact.",
        sourceLabel: "Source: Praedixa pilot protocol",
        sourceUrl: "/en/pilot-protocol",
      },
    ],
    checklist: [
      "Decision journal: proposed option, final choice, reason, outcome",
      "Proof KPIs: operating cost, service level, emergency usage, planning stability",
      "Before / recommended / actual comparison at site and network level",
      "Monthly COO/Ops + CFO cadence",
      "Proof pack ready for executive committee",
    ],
  },

  security: {
    kicker: "Integration & data",
    heading: "Read-only setup, fast launch, clear governance.",
    subheading:
      "Praedixa sits on top of your existing systems without heavy IT projects and standardizes multi-site decision steering.",
    tiles: [
      {
        title: "Read-only connection via exports/API",
        description:
          "Kickoff with existing CSV/Excel/API flows. No replacement of WFM/scheduling/ERP/CRM tools.",
      },
      {
        title: "Useful indicators, not more",
        description:
          "Teams/capacity, demand, inventory/supply… based on your priorities.",
      },
      {
        title: "Aggregated data only",
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
        title: "100% Scaleway hosting — France",
        description:
          "Platform and data hosted in France (Paris), with transparent security posture for qualification.",
      },
    ],
    compatibility: {
      title: "Compatible with your stack",
      description:
        "Praedixa complements your tools and adds a decision + proof method for Ops and Finance.",
      tools: ["WFM", "Scheduling", "ERP", "CRM", "BI", "Excel"],
    },
    honesty:
      "An “indicator forecasting only” mode is available, but Praedixa’s differentiator is the Signature Service: guided decisions + ROI proof + decision journal.",
  },

  pilot: {
    kicker: "Pilot offer",
    heading:
      "Praedixa Signature pilot: 1 month free audit, then proof over 3 months.",
    subheading:
      "Multi-vertical program for multi-site companies: restaurants, retail, hospitality, dealerships/workshops, logistics, healthcare, industry, call centers.",
    statusLabels: ["Free audit (M1)", "Proof milestone (S8)", "Consolidation (M3)"],
    included: {
      title: "What you receive",
      items: [
        "Free month 1: historical audit and potential savings estimate",
        "Useful indicators/forecasts (teams/capacity, demand, inventory/supply… as needed)",
        "Compared decision options (cost, service, business rules)",
        "Shared decision journal: option, choice, reason, outcome",
        "Monthly ROI proof: before / recommended / actual",
        "COO/Ops + CFO governance cadence",
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
        "Monthly COO/Ops + CFO review",
        "Client-side operations sponsor",
        "Shared decision journal and ROI proof",
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
    ctaPrimary: "Request a Praedixa Signature pilot",
    ctaMeta:
      "1 month free historical audit · Read-only exports/API · Monthly ROI proof",
  },

  faq: {
    kicker: "FAQ",
    heading: "Frequently asked questions",
    subheading:
      "Clear answers for COO/Ops, CFO teams, and multi-site decision owners.",
    signalLabel: "FAQ cadence",
    signalBody:
      "Each answer is shaped to support fast decisions across operations, finance, and IT.",
    categoryHint: "Pick an angle, then expand a question",
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
          "A service that helps you make better coverage decisions (teams, schedules, reinforcements) and prove business impact every month.",
        category: "Understanding Praedixa",
      },
      {
        question:
          "What is the difference between Praedixa Signature Service and KPI forecasting only?",
        answer:
          "Signature Service includes guided decisions, a decision journal, and monthly ROI proof. The “indicator forecasting only” mode covers forecasts/signals only.",
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
          "Praedixa does not replace them. It sits on top of what you already use to support decisions and prove impact.",
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
          "M1: free audit + read-only kickoff. S8: first proof milestone. M3: consolidation and full ROI proof.",
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
          "You keep the forecasting deliverables. You can activate Signature Service later to add guided decisions, the decision journal, and ROI proof.",
        category: "Pilot & pricing",
      },
    ],
  },

  contact: {
    kicker: "Take action",
    heading: "Get the free historical audit.",
    subheading:
      "We frame your multi-site scope, run the historical audit, then install the decision method and monthly ROI proof.",
    trustItems: [
      "Response within 48 business hours",
      "1 month free historical audit",
      "Read-only via exports/API",
      "No mandatory post-pilot commitment",
    ],
    ctaPrimary: "Get the free historical audit",
    ctaSecondary: "View ROI protocol",
  },

  servicesPage: {
    meta: {
      title:
        "Praedixa | Signature Service vs KPI forecasting only",
      description:
        "Clear comparison between Praedixa Signature Service (guided decisions + ROI proof) and “indicator forecasting only” mode (teams/capacity, demand, inventory/supply…).",
      ogTitle:
        "Praedixa | Signature Service and KPI forecasting only",
      ogDescription:
        "Two service levels, one product: Signature Service (decisions + journal + ROI proof) or indicator forecasting only.",
    },
    kicker: "Services",
    heading: "Praedixa Signature Service vs KPI forecasting only.",
    subheading:
      "One product. Two service levels. Signature Service is the complete offer. KPI forecasting-only is an entry mode.",
    fullPackage: {
      badge: "Praedixa Signature Service",
      title: "Full package (decisions + proof)",
      summary:
        "Praedixa core value: help teams decide better day-to-day and prove business impact.",
      includesTitle: "What is included",
      includes: [
        "Useful indicators/forecasts: teams/capacity, demand, inventory/supply…",
        "Options compared under cost/service/business-rule constraints.",
        "Optimal decision recommendation with explicit trade-offs.",
        "Decision journal: option, choice, reason, outcome.",
        "ROI proof: before / recommended / actual.",
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
        "Indicator forecasts: teams/capacity, demand, inventory/supply…",
        "Operational forecasting deliverables for your teams.",
        "Read-only kickoff via exports/API.",
      ],
      limitsTitle: "What is not included",
      limits: [
        "No guided decisions under constraints.",
        "No full decision journal.",
        "No full ROI proof (before / recommended / actual).",
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
          criterion: "ROI proof (before / recommended / actual)",
          fullPackage: "Included",
          forecastsOnly: "Not included",
        },
      ],
    },
    decisionGuide: {
      title: "When to choose each mode",
      items: [
        "Choose Signature Service when decision quality and monthly ROI proof are top priorities.",
        "Choose KPI forecasting-only if you first need a stronger forecasting baseline.",
        "You can start in KPI forecasting-only and activate Signature Service later without changing product.",
      ],
    },
    bottomNote:
      "Praedixa remains one decision product. Forecasting-only is a step; Signature Service is the differentiator.",
  },

  footer: {
    tagline:
      "Coverage decisions for multi-site operations, a decision journal, and monthly ROI proof.",
    badges: ["Decision journal", "Monthly ROI proof"],
    navigation: "Navigation",
    legalContact: "Legal & contact",
    copyright: "Designed and hosted in France",
    ctaBanner: {
      kicker: "Praedixa",
      heading:
        "Free historical audit, then a decision method with monthly ROI proof.",
      cta: "Get the free historical audit",
    },
  },

  stickyCta: {
    text: "Get the free historical audit",
  },

  form: {
    pageTitle: "Praedixa Signature pilot request",
    pageSubtitle:
      "This request qualifies your 3-month pilot (decisions + proof), including a free 1-month historical audit.",
    pill: "Praedixa Signature pilot (3 months)",
    valuePoints: [
      "Free 1-month historical audit",
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
