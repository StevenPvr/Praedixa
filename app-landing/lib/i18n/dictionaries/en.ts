import type { Dictionary } from "../types";

export const en: Dictionary = {
  meta: {
    title: "Praedixa | Multi-Site Workforce Forecasting & Coverage Decisions",
    description:
      "Anticipate multi-site staffing tensions with a workforce forecasting pilot, then expand to a broader decision layer when needed.",
    ogTitle: "Praedixa | Workforce Forecasting Pilot for Multi-Site Operations",
    ogDescription:
      "3-month pilot to improve workforce forecasting, compare coverage options, and align operations/finance decisions.",
  },

  nav: {
    problem: "Problem",
    method: "Solution",
    howItWorks: "How it works",
    useCases: "Use cases",
    security: "Security",
    faq: "FAQ",
    contact: "Contact",
    ctaPrimary: "Request a workforce forecasting pilot",
    backToSite: "Back to site",
  },

  hero: {
    kicker: "Workforce forecasting pilot",
    headline: "Anticipate multi-site staffing tensions",
    headlineHighlight: "with a structured entry pilot.",
    subtitle:
      "Praedixa runs a 3-month pilot to improve workforce forecasting, structure ops/finance trade-offs, and prepare optional extension to a broader decision platform.",
    bullets: [
      {
        metric: "3 months",
        text: "to improve workforce forecasting quality",
      },
      {
        metric: "Month 1",
        text: "setup on existing exports",
      },
      {
        metric: "Decisions",
        text: "traceable ops/finance arbitration",
      },
    ],
    ctaPrimary: "Request a workforce forecasting pilot",
    ctaSecondary: "View the pilot protocol",
    previewTitle: "A preview of what awaits you",
    ctaMeta:
      "NDA available from first contact · Start with a focused perimeter",
    trustBadges: [
      "Aggregated data only",
      "NDA from first contact",
      "Start with a focused perimeter",
      "100% Scaleway hosting, 100% French",
    ],
  },

  preview: {
    kicker: "A preview",
    heading: "The Praedixa interface",
    subheading:
      "See how coverage intelligence turns into actionable operational decisions.",
    overlayTitle: "Discover the web app",
    overlayBody:
      "Explore an interactive product walkthrough powered by 100% mock data.",
    overlayCta: "Discover the web app",
    overlayBackCta: "Back to video",
    loadingLabel: "Loading preview video…",
    liveBadge: "Praedixa Calibre",
  },

  demo: {
    title: "Praedixa interactive demo",
    subtitle:
      "Product walkthrough in a demo environment, powered only by fictitious data.",
    mockBanner:
      "Demonstration environment — all data is fictitious and no customer data is used.",
    backToLanding: "Back to landing page",
    screenAriaLabel: "Interactive demonstration of the Praedixa interface",
    updatedAtLabel: "Latest mock update",
    loading: "Loading mock data…",
    empty: "No mock data available for this screen.",
    error: "Unable to load this demo screen.",
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
    kicker: "Why now",
    heading: "The cost of understaffing is no longer a secondary issue.",
    subheading:
      "Without an anticipation framework, trade-offs become more expensive, more defensive, and harder to justify.",
    pains: [
      {
        title: "Decisions made too late",
        description:
          "Tension signals are detected when room for maneuver is already reduced.",
        consequence: "Overruns, service degradation, managerial stress",
        cost: "Significant cost overrun in crisis mode",
      },
      {
        title: "Under-framed trade-offs",
        description:
          "Without structured economic scenarios, decisions rely on urgency alone.",
        consequence: "Operational budget less predictable and harder to defend",
        cost: "Slower decision cycle without a clear framework",
      },
      {
        title: "Impact hard to prove",
        description:
          "Actions are rarely linked to measurable proof of their actual effect.",
        consequence: "Difficulty securing budgets and priorities in committee",
        cost: "Budgets revised downward due to lack of data",
      },
    ],
    diagnostic: {
      title: "Does this sound familiar?",
      signals: [
        "Your coverage trade-offs rely on experience, not data",
        "Emergency costs (temp staff, overtime) are hard to anticipate",
        "You can't quantify the cost of inaction in committee",
        "Each site manages its coverage in isolation",
      ],
    },
  },

  solution: {
    kicker: "Auditable method",
    heading: "A sober, rigorous, decision-oriented approach.",
    subheading:
      "Praedixa doesn't add noise. The platform structures a clear cycle: read, prioritize, decide, prove.",
    principles: [
      {
        title: "Anticipatory reading",
        subtitle: "See before you act",
        description:
          "Understaffing signals surfaced early, with explanatory factors and criticality levels.",
      },
      {
        title: "Economic framing",
        subtitle: "Compare to decide",
        description:
          "Every option costed: intervention cost vs inaction cost, with transparent assumptions.",
      },
      {
        title: "Impact proof",
        subtitle: "Document to convince",
        description:
          "Decision log, before/after measurement, auditable proof for governance and committee.",
      },
    ],
    differentiators: {
      title: "What Praedixa is not",
      description:
        "Approach focused on critical multi-site decisions: risk reading, option comparison, and explicit action rationale.",
      items: [
        { is: "Operational decision tool", isNot: "HRIS or payroll system" },
        { is: "Economic trade-off framework", isNot: "Another BI dashboard" },
        { is: "Coverage early-warning", isNot: "Field scheduling tool" },
      ],
    },
  },

  howItWorks: {
    kicker: "Protocol",
    heading: "Workforce forecasting pilot in 4 steps.",
    subheading:
      "A 3-month execution flow with setup-first delivery and explicit governance.",
    steps: [
      {
        number: "01",
        title: "Framing",
        subtitle: "Framing workshop",
        description:
          "Workforce forecasting objectives, scope, operating roles, and validation criteria are co-defined.",
      },
      {
        number: "02",
        title: "Initialization",
        subtitle: "Existing exports",
        description:
          "Month 1: CSV/Excel exports (capacity, workload, absences), read-only access, aggregated data. No heavy IT integration for initialization.",
      },
      {
        number: "03",
        title: "Build phase",
        subtitle: "Pipelines & calibration",
        description:
          "Forecast pipelines are built and calibrated progressively based on your available data, with weekly reporting.",
      },
      {
        number: "04",
        title: "Consolidation",
        subtitle: "Governance & next phase",
        description:
          "Pilot routines are stabilized, decision governance is documented, and optional extension is framed.",
      },
    ],
  },

  useCases: {
    kicker: "Use cases",
    heading: "Real scenarios handled with a structured decision framework.",
    subheading:
      "Each case follows the same logic: anticipated visibility, comparable options, defensible decision, measurable impact.",
    cases: [
      {
        id: "volatility",
        title: "Workload volatility",
        context:
          "Sudden peaks that destabilize teams and trigger emergency trade-offs.",
        action:
          "Weekly trend reading, upstream alerts, options ranked by criticality.",
        result: "Reduction of last-minute decisions and associated overruns.",
      },
      {
        id: "absenteeism",
        title: "Absenteeism and coverage drift",
        context:
          "Hidden structural fragilities, costly last-minute contingency plans.",
        action:
          "Recurring pattern analysis, exposure ranking, and short-horizon windows.",
        result:
          "Drift anticipation and reduced reliance on last-minute temp staffing.",
        callout: "No individual data — reading at team and site level only.",
      },
      {
        id: "crosssite",
        title: "Cross-site trade-offs",
        context:
          "Resource allocation across sites without economic comparison framework.",
        action:
          "Option comparison by cost, risk, and impact. Shared COO/CFO decision framework.",
        result: "Documented, defensible trade-offs for executive committee.",
        callout:
          "Praedixa doesn't decide — it structures options and clarifies consequences.",
      },
      {
        id: "roi",
        title: "ROI loop and governance",
        context: "No economic proof on past operational decisions.",
        action: "Decision log, before/after measurement, audit trail.",
        result: "Impact proof usable to secure budgets and priorities.",
      },
    ],
  },

  deliverables: {
    kicker: "ROI Framework",
    heading: "Deliverables calibrated to decide, not to present.",
    subheading:
      "Value doesn't come from another dashboard, but from the ability to produce structured, defensible trade-offs.",
    roiFrames: [
      {
        label: "Cost of inaction",
        value: "High",
        note: "Penalties, overtime, service quality degradation",
      },
      {
        label: "Intervention options",
        value: "Compared",
        note: "Documented scenarios with transparent assumptions",
      },
      {
        label: "Demonstrated impact",
        value: "Traceable",
        note: "Before/after measurement for governance review",
      },
    ],
    checklist: [
      "Coverage tension map by perimeter",
      "Explicit cost assumptions per scenario",
      "Prioritization by criticality level",
      "Weekly review framework for operations committee",
      "Decision and impact traceability",
    ],
  },

  security: {
    kicker: "Security & IT",
    heading: "Security and data framework for IT review.",
    subheading:
      "The statements below describe the current rollout perimeter and the information shared during qualification.",
    tiles: [
      {
        title: "100% Scaleway hosting — Paris (France)",
        description:
          "The entire platform and data is hosted on Scaleway in France (Paris). No subprocessor outside French sovereignty.",
      },
      {
        title: "Aggregated data only",
        description:
          "No individual prediction and no nominative processing. Team/site aggregation only.",
      },
      {
        title: "Encryption & access",
        description:
          "Encryption in transit and at rest. Role-based access control (RBAC). Activity logs.",
      },
      {
        title: "Primary data subprocessors",
        description:
          "Scaleway — full platform and data hosting (Paris, France servers). 100% French.",
      },
      {
        title: "Setup-first, no heavy IT integration",
        description:
          "Initialization runs on read-only exports. Light automation of scheduled exports can be added next.",
      },
      {
        title: "NDA & confidentiality",
        description:
          "NDA can be signed from first contact. Retention policy currently in formalization.",
      },
    ],
    compatibility: {
      title: "Compatible with your stack",
      description:
        "CSV/Excel exports for initialization, then light automation of scheduled exports when relevant.",
      tools: ["ERP", "HRIS", "Scheduling", "BI", "Excel"],
    },
    honesty:
      "Security practices are documented on request. Full hosting on Scaleway — 100% French infrastructure, servers in Paris.",
  },

  pilot: {
    kicker: "Workforce forecasting pilot",
    heading: "An entry pilot to improve workforce forecasting quality.",
    subheading:
      "3-month program with setup, calibration, and governance. Scope can stay focused on staffing forecasting first, then expand if needed.",
    statusLabels: ["Active today", "In extension", "Upcoming"],
    included: {
      title: "What the workforce forecasting pilot covers (3 months)",
      items: [
        "Month 1: setup and pipeline build on your exports",
        "Month 2: calibration of workload/capacity readings and assumptions",
        "Month 3: pilot stabilization and operational recommendations",
        "One weekly working session with one client-side operations lead",
        "Formal next-step plan, with optional extension",
      ],
    },
    excluded: {
      title: "What it does not include",
      items: [
        "Predefined quantified outcome commitment",
        "Global multi-country deployment",
        "Unlimited custom development",
        "Mandatory full-service rollout at kickoff",
      ],
    },
    kpis: {
      title: "Build and validation objectives",
      items: [
        "Improve short-horizon workload/capacity signal quality",
        "Validate pipeline quality based on available client data",
        "Stabilize decision rituals and traceability",
        "Document extension conditions to a broader decision platform",
      ],
    },
    governance: {
      title: "Governance",
      items: [
        "Weekly pilot steering session",
        "Operations sponsor identified client-side",
        "Dedicated operations lead client-side",
        "Shared decision log",
      ],
    },
    selection: {
      title: "Selection criteria (focused scope)",
      items: [
        "Multi-site organization (logistics, retail, QSR, industry, services)",
        "Committed operations sponsor",
        "Usable data exports (capacity, workload, absences)",
      ],
    },
    upcoming: {
      title: "Full decision-platform extension — optional",
      description:
        "After the entry pilot, extension is possible based on your priorities.",
    },
    urgency:
      "Applications reviewed within 48 business hours. Focused-scope kickoff available.",
    ctaPrimary: "Request a workforce forecasting pilot",
    ctaMeta:
      "Entry pricing for staffing-forecast scope · No post-pilot commercial commitment",
  },

  faq: {
    kicker: "FAQ",
    heading: "Frequently asked questions",
    subheading:
      "Institutional answers on the workforce forecasting pilot, kickoff conditions, and extension options.",
    categories: [
      "Understanding Praedixa",
      "Pilot & pricing",
      "Technical & data",
    ],
    items: [
      {
        question: "What is Praedixa in one sentence?",
        answer:
          "A coverage intelligence layer: we predict understaffing risks by site and team, cost inaction vs options, then track impact to produce auditable economic proof.",
        category: "Understanding Praedixa",
      },
      {
        question: "Who is Praedixa for?",
        answer:
          "Operations directors, Ops managers, and CFOs of multi-site companies with field teams. Typical sectors include logistics, retail/distribution, transport, quick-service restaurants, healthcare, industry, and services. Common thread: fluctuating workload, capacity gaps, and rising emergency costs.",
        category: "Understanding Praedixa",
      },
      {
        question: "How is it different from an HRIS or scheduling tool?",
        answer:
          "We don't do scheduling. We plug into it. An HRIS manages HR processes. Scheduling tools manage rotations. Praedixa predicts the capacity vs workload gap, costs the scenarios, and delivers an action playbook with economic impact. It's a decision tool.",
        category: "Understanding Praedixa",
      },
      {
        question: "Does Praedixa give advice?",
        answer:
          "No. Praedixa presents options with their costed economic impact. The decision belongs entirely to the company. Every decision is logged to feed economic proof.",
        category: "Understanding Praedixa",
      },
      {
        question: "How much does Praedixa cost?",
        answer:
          "The workforce forecasting pilot is scoped commercially based on operational perimeter. It can start on a focused scope before broader extension.",
        category: "Pilot & pricing",
      },
      {
        question: "How does the pilot work?",
        answer:
          "The pilot runs over 3 months. Month 1: setup and pipeline build from your exports. Month 2: calibration based on available data. Month 3: stabilization of decision routines and governance documentation.",
        category: "Pilot & pricing",
      },
      {
        question: "What do you measure during the pilot?",
        answer:
          "The pilot measures signal quality for workforce forecasting, robustness of evaluated options, and decision traceability. No predefined quantified outcome is promised publicly.",
        category: "Pilot & pricing",
      },
      {
        question: "What data do you need to start?",
        answer:
          "Existing exports: capacity, workload/volumes, and absences (CSV or Excel). We adapt to your tools and data maturity. Goal: actionable diagnostic without an integration project.",
        category: "Technical & data",
      },
      {
        question: "Is IT integration required?",
        answer:
          "Not for pilot initialization. Kickoff runs on simple CSV/Excel exports. Then light automation of scheduled exports can be added when relevant.",
        category: "Technical & data",
      },
      {
        question: "GDPR: individual data?",
        answer:
          "No. Privacy-by-design: aggregated team/site level, data limited to strict necessity, no individual prediction, no nominative processing. 100% Scaleway hosting, in France.",
        category: "Technical & data",
      },
      {
        question: "What security information is shared during qualification?",
        answer:
          "We share the applicable security framework for pilot scope (encryption, access controls, logging, hosting perimeter, and subprocessors). Full hosting on Scaleway — 100% French.",
        category: "Technical & data",
      },
      {
        question: "What if the pilot doesn't deliver results?",
        answer:
          "The pilot includes a validation frame and end-of-phase documentation. You receive a formal next-step plan and no post-pilot commercial commitment.",
        category: "Pilot & pricing",
      },
    ],
  },

  contact: {
    kicker: "Take action",
    heading: "Request a workforce forecasting pilot.",
    subheading:
      "We frame a focused kickoff perimeter, then optional extension based on your priorities.",
    trustItems: [
      "Response within 48 business hours",
      "NDA available from first contact",
      "Aggregated data only",
      "No post-pilot commercial commitment",
    ],
    ctaPrimary: "Request a workforce forecasting pilot",
    ctaSecondary: "Email the team",
  },

  footer: {
    tagline: "Coverage intelligence for multi-site operations.",
    badges: ["COO / CFO governance", "Privacy-by-design"],
    navigation: "Navigation",
    legalContact: "Legal & contact",
    copyright: "Designed and hosted in France",
    ctaBanner: {
      kicker: "Entry pilot",
      heading: "Workforce forecasting pilot — focused kickoff available.",
      cta: "Request a workforce forecasting pilot",
    },
  },

  stickyCta: {
    text: "Request a workforce forecasting pilot",
  },

  form: {
    pageTitle: "Workforce forecasting pilot request",
    pageSubtitle:
      "This request helps qualify your 3-month workforce forecasting perimeter.",
    pill: "Workforce forecasting pilot (3 months)",
    valuePoints: [
      "Qualification focused on staffing, operations, and finance challenges",
      "Response within 48 business hours",
      "Product team response",
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
        placeholder: "E.g.: ERP + internal scheduling",
      },
      painPoint: {
        label: "Main coverage challenge",
        placeholder:
          "Describe the operational problem you want to address first.",
      },
    },
    select: "Select",
    consent: "I accept the {cgu} and the {privacy}.",
    cguLabel: "Terms",
    privacyLabel: "privacy policy",
    submit: "Submit application",
    submitting: "Submitting…",
    success: {
      title: "Application submitted",
      description:
        "We are reviewing your application and will get back to you within 48 business hours with framing adapted to your context.",
      backToSite: "Back to site",
      checkEmail: "Check your inbox",
    },
    error: "Something went wrong. Please try again.",
    sectors: [
      "Logistics",
      "Transport",
      "Quick-service restaurants",
      "Healthcare",
      "Manufacturing",
      "Retail",
      "Agri-food",
      "Construction",
      "Services",
      "Other",
    ],
    employeeRanges: ["50-100", "100-250", "250-500", "500-1,000", "1,000+"],
    siteCounts: ["1-3", "4-10", "11-30", "31+"],
    roles: [
      "COO / Operations Director",
      "Operations Manager",
      "Site Director",
      "CFO / Finance Director",
      "General Manager",
      "Other",
    ],
    timelines: ["0-3 months", "3-6 months", "6-12 months", "Exploration"],
  },
};
