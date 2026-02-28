import type { Dictionary } from "../types";

export const en: Dictionary = {
  meta: {
    title: "Praedixa | Multi-site Workforce & ProofOps (QSR-first MVP)",
    description:
      "Workforce & ProofOps for multi-site coverage decisions. QSR multi-franchise is the MVP focus, with a transferable method for logistics, retail, transport, industry, healthcare, and services.",
    ogTitle: "Praedixa | Workforce & ProofOps pilot with Decision Ledger",
    ogDescription:
      "3-month pilot to make ops/finance trade-offs defensible, trace each decision, and produce sourced impact evidence.",
  },

  nav: {
    problem: "Problem",
    method: "Solution",
    howItWorks: "How it works",
    useCases: "Use cases",
    security: "Security",
    faq: "FAQ",
    contact: "Contact",
    ctaPrimary: "Request a Workforce & ProofOps pilot",
    backToSite: "Back to site",
  },

  hero: {
    kicker: "Workforce & ProofOps pilot (multi-franchise, multi-site)",
    headline: "Decide coverage before field disruption",
    headlineHighlight: "with Workforce & ProofOps.",
    subtitle:
      "Praedixa runs a 3-month pilot to structure coverage trade-offs in multi-franchise, multi-site environments. The method is directly reusable for logistics, retail, transport, industry, healthcare, and services.",
    bullets: [
      {
        metric: "3 months",
        text: "to install an operational Decision Ledger loop",
      },
      {
        metric: "Focus",
        text: "multi-franchise, multi-site organizations",
      },
      {
        metric: "Open ICP",
        text: "transferable method across multi-site sectors",
      },
    ],
    ctaPrimary: "Request a Workforce & ProofOps pilot",
    ctaSecondary: "View the pilot protocol",
    previewTitle: "A preview of what awaits you",
    ctaMeta:
      "NDA available from first contact · Start with a focused perimeter",
    trustBadges: [
      "Aggregated data only",
      "NDA from first contact",
      "Start with a focused perimeter",
      "100% Scaleway hosting, 100% French",
      "Built for multi-franchise, multi-site networks",
      "Transferable framework for logistics, retail, transport, industry, and services",
    ],
  },

  preview: {
    kicker: "A preview",
    heading: "The Praedixa interface",
    subheading:
      "See how coverage intelligence turns into actionable operational decisions.",
    overlayTitle: "Discover the web app",
    overlayBody:
      "Open the real web app interface in public preview mode, with matching UI.",
    overlayCta: "Discover the web app",
    overlayBackCta: "Back to video",
    loadingLabel: "Loading preview video…",
    liveBadge: "Public preview",
  },

  demo: {
    title: "Praedixa interactive preview",
    subtitle:
      "Product walkthrough in a preview environment, powered only by fictitious data.",
    mockBanner:
      "Preview environment — all data is fictitious and no customer data is used.",
    backToLanding: "Back to landing page",
    screenAriaLabel: "Interactive preview of the Praedixa interface",
    updatedAtLabel: "Latest preview update",
    loading: "Loading preview data…",
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
      title: "What Praedixa is / is not",
      description:
        "Praedixa complements your operational stack. It is not an HRIS, a payroll system, an extra BI dashboard, or a field scheduling tool.",
      items: [
        { is: "Operational decision tool", isNot: "HRIS or payroll system" },
        { is: "Economic trade-off framework", isNot: "Another BI dashboard" },
        { is: "Coverage early-warning", isNot: "Field scheduling tool" },
      ],
    },
  },

  howItWorks: {
    kicker: "Protocol",
    heading: "Workforce & ProofOps pilot in 4 steps.",
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
    labels: {
      context: "Context",
      action: "Action",
      impact: "Impact",
    },
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
    kicker: "Field evidence",
    heading: "Decision-proof first: evidence that frames trade-offs.",
    subheading:
      "We anchor decisions in published benchmarks, then contextualize them for your perimeter.",
    roiFrames: [
      {
        label: "Retail understaffing: measured effect",
        value: "6.15% lost sales reduction",
        note: "US retail field study: correcting understaffing reduced lost sales by 6.15% and increased profitability by 5.74%.",
        sourceLabel: "Source: Kesavan et al. (UNC, 2022)",
        sourceUrl: "https://cdr.lib.unc.edu/downloads/9880w142w?locale=en",
      },
      {
        label: "Schedule stability: business effect",
        value: "+7% median sales",
        note: "Stable scheduling pilot: +7% median sales and +5% labor productivity.",
        sourceLabel: "Source: WorkLife Law / Shift Project",
        sourceUrl: "https://worklifelaw.org/publication/stable-scheduling-increases-productivity-and-sales/",
      },
      {
        label: "France baseline: absenteeism pressure",
        value: "8.0% absence rate (2024)",
        note: "Average absenteeism in France reached 8.0% in 2024, reinforcing the need for coverage decision discipline.",
        sourceLabel: "Source: WTW France (2025)",
        sourceUrl: "https://www.wtwco.com/fr-fr/news/2025/09/hausse-del-absenteisme-en-2024-un-signal-dalerte-pour-les-entreprises",
      },
    ],
    checklist: [
      "Decision Ledger: context, options, decision, observed impact",
      "Explicit economic assumptions before arbitration",
      "Weekly ops/finance decision review cadence",
      "Prioritization by criticality and service level",
      "Before/after impact proof usable in committee",
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
    kicker: "Workforce & ProofOps pilot",
    heading: "A Workforce & ProofOps pilot to make decisions defensible.",
    subheading:
      "3-month program with setup, calibration, and governance. MVP priority is quick-service restaurant networks, with an open frame for other multi-site ICPs.",
    statusLabels: ["Active today", "In extension", "Upcoming"],
    included: {
      title: "What the Workforce & ProofOps pilot covers (3 months)",
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
        "Multi-site organization (logistics, retail, QSR, industry, services), with priority on multi-franchise quick-service restaurant networks",
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
    ctaPrimary: "Request a Workforce & ProofOps pilot",
    ctaMeta:
      "QSR-first MVP entry pricing · Transferable method across multi-site activities",
  },

  faq: {
    kicker: "FAQ",
    heading: "Frequently asked questions",
    subheading:
      "Institutional answers on the Workforce & ProofOps pilot, kickoff conditions, and extension model.",
    categories: [
      "Understanding Praedixa",
      "Pilot & pricing",
      "Technical & data",
    ],
    items: [
      {
        question: "What is Praedixa in one sentence?",
        answer:
          "A Workforce & ProofOps layer: we anticipate understaffing risk by site and team, compare options, and trace each trade-off in a Decision Ledger to produce auditable economic proof.",
        category: "Understanding Praedixa",
      },
      {
        question: "Who is Praedixa for?",
        answer:
          "Operations directors, Ops leaders, and CFOs in multi-site organizations with field teams. QSR multi-franchise is the MVP priority. Other ICPs include logistics, retail/distribution, transport, healthcare, industry, and services. Common thread: fluctuating workload, constrained capacity, and growing emergency costs.",
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
          "The Workforce & ProofOps pilot is scoped commercially to your operational perimeter. It can start on a focused scope (QSR-first MVP) before broader extension.",
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
    heading: "Request a Workforce & ProofOps pilot.",
    subheading:
      "We frame a QSR-first MVP kickoff perimeter, then define the extension plan based on your sector priorities.",
    trustItems: [
      "Response within 48 business hours",
      "NDA available from first contact",
      "Aggregated data only",
      "No post-pilot commercial commitment",
    ],
    ctaPrimary: "Request a Workforce & ProofOps pilot",
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
      heading: "Workforce & ProofOps pilot — focused kickoff available.",
      cta: "Request a Workforce & ProofOps pilot",
    },
  },

  stickyCta: {
    text: "Request a Workforce & ProofOps pilot",
  },

  form: {
    pageTitle: "Workforce & ProofOps pilot request",
    pageSubtitle:
      "This request helps qualify your 3-month Workforce & ProofOps pilot perimeter (QSR-first MVP with optional extension).",
    pill: "Workforce & ProofOps pilot (3 months)",
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
      checkEmail: "View the pilot protocol",
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
