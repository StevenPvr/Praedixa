import type { Dictionary } from "../types";

export const en: Dictionary = {
  meta: {
    title: "Praedixa | Coverage Intelligence for Multi-Site Operations",
    description:
      "Anticipate understaffing, frame economic trade-offs, and produce auditable proof of impact. SaaS for multi-site COOs.",
    ogTitle: "Praedixa | Operational Coverage SaaS for Multi-Site COOs",
    ogDescription:
      "Anticipate coverage gaps, frame trade-offs, and make your decisions auditable with an impact-driven methodology.",
  },

  nav: {
    problem: "Problem",
    method: "Solution",
    howItWorks: "How it works",
    useCases: "Use cases",
    security: "Security",
    faq: "FAQ",
    contact: "Contact",
    ctaPrimary: "Request a pilot",
    backToSite: "Back to site",
  },

  hero: {
    kicker: "SaaS for multi-site COOs",
    headline: "Anticipate coverage gaps",
    headlineHighlight: "before they become costly.",
    subtitle:
      "Praedixa turns understaffing into executable decisions: early signals, costed scenarios, and auditable proof of impact for operations and finance committees.",
    bullets: [
      {
        metric: "3–14 days",
        text: "of early warning before field disruptions",
      },
      {
        metric: "Cost vs risk",
        text: "comparable scenarios for every trade-off",
      },
      {
        metric: "Auditable",
        text: "traceable decisions for C-suite, CFO, and audit",
      },
    ],
    ctaPrimary: "Request a pilot",
    ctaSecondary: "View the pilot protocol",
    ctaMeta: "Response within 24h · NDA available · No obligation",
    trustBadges: [
      "Hosted in France",
      "Aggregated data only",
      "NDA from first contact",
      "Auditable ROI framework",
    ],
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
        cost: "15–25% average cost overrun in crisis mode",
      },
      {
        title: "Under-framed trade-offs",
        description:
          "Without structured economic scenarios, decisions rely on urgency alone.",
        consequence: "Operational budget less predictable and harder to defend",
        cost: "2 to 5 days per unstructured decision cycle",
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
          "Understaffing signals detected 3 to 14 days ahead, with explanatory factors and criticality levels.",
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
      items: [
        { is: "Operational decision tool", isNot: "HRIS or payroll system" },
        { is: "Economic trade-off framework", isNot: "Another BI dashboard" },
        { is: "Coverage early-warning", isNot: "Field scheduling tool" },
      ],
    },
  },

  howItWorks: {
    kicker: "Protocol",
    heading: "From framing to results in 4 steps.",
    subheading:
      "A structured process to demonstrate value before any commitment.",
    steps: [
      {
        number: "01",
        title: "Framing",
        subtitle: "45 minutes",
        description:
          "Objectives, target KPIs, pilot scope, and success criteria co-defined.",
      },
      {
        number: "02",
        title: "Data connection",
        subtitle: "Existing exports",
        description:
          "CSV or Excel of capacity, workload, and absences. Read-only, aggregated data, zero IT integration.",
      },
      {
        number: "03",
        title: "Diagnostic",
        subtitle: "Risk map",
        description:
          "Tensions identified, explanatory factors, inaction cost quantified, action playbook delivered.",
      },
      {
        number: "04",
        title: "Pilot",
        subtitle: "Impact measurement",
        description:
          "ROI loop on your actual KPIs. Go/no-go decision based on measured results, not promises.",
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
          "Recurring pattern analysis, exposure ranking, 3/7/14-day windows.",
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
    heading: "Built to pass due diligence.",
    subheading:
      "Security and compliance are not a footnote. They are at the center of the architecture.",
    tiles: [
      {
        title: "Hosted in France",
        description:
          "Infrastructure hosted in France. Controlled data residency.",
      },
      {
        title: "Aggregated data only",
        description:
          "No individual prediction. Reading at team and site level. Privacy-by-design.",
      },
      {
        title: "Encryption & access",
        description:
          "Encryption in transit and at rest. Role-based access control (RBAC). Activity logs.",
      },
      {
        title: "DPA & subprocessors",
        description:
          "Data Processing Agreement available. Subprocessor list provided on request.",
      },
      {
        title: "Read-only access",
        description:
          "Read-only connection to your exports. No write access to your systems.",
      },
      {
        title: "NDA & confidentiality",
        description:
          "NDA signable from first contact. Documented retention policy.",
      },
    ],
    compatibility: {
      title: "Compatible with your stack",
      description:
        "CSV/Excel exports from your existing tools. No IT integration required to start.",
      tools: ["ERP", "HRIS", "Scheduling", "BI", "Excel"],
    },
    honesty:
      "We don't yet have SOC 2 or ISO 27001 certification. Our security practices are documented and auditable. Transparency is part of the product.",
  },

  pilot: {
    kicker: "Pilot offer",
    heading: "A structured pilot to prove value, not promise it.",
    subheading:
      "Founding cohort limited to 8 companies. Each pilot is framed to produce measurable proof of value.",
    included: {
      title: "What the pilot includes",
      items: [
        "Framing workshop (objectives, KPIs, scope)",
        "Coverage diagnostic on your actual data",
        "Risk map with explanatory factors",
        "Costed action playbook",
        "Impact measurement loop (before/after)",
        "Final report with recommendations",
      ],
    },
    excluded: {
      title: "What it does not include",
      items: [
        "Global multi-country deployment",
        "Unlimited custom development",
        "Large-scale data migration",
      ],
    },
    kpis: {
      title: "KPIs measured during the pilot",
      items: [
        "Coverage prediction rate (accuracy)",
        "Costs avoided vs historical emergency costs",
        "Average decision time (before/after)",
        "Adoption rate by field managers",
        "Quality of documented trade-offs",
      ],
    },
    governance: {
      title: "Governance",
      items: [
        "30-minute weekly check-in",
        "Executive sponsor identified client-side",
        "Dedicated operational champion",
        "Go/no-go criteria defined at framing",
      ],
    },
    urgency:
      "Cohort limited to 8 companies. Applications qualified within 24 business hours.",
    ctaPrimary: "Request a pilot",
    ctaMeta: "Qualification: 20 min · Form: 4–5 min · NDA available",
  },

  faq: {
    kicker: "FAQ",
    heading: "Direct questions, direct answers.",
    subheading:
      "No corporate speak. The questions operations and finance leaders actually ask.",
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
          "Operations directors, Ops managers, and CFOs of multi-site companies with field teams. Entry sector: logistics, warehousing, transport. Common thread: fluctuating workload, capacity that doesn't keep up, and exploding emergency costs.",
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
          "Subscription model, typically several thousand euros per month depending on complexity (number of sites, variability, support level). The founding cohort benefits from a dedicated commercial framework. Qualification establishes a clear pricing trajectory before commitment.",
        category: "Pilot & pricing",
      },
      {
        question: "How does the pilot work?",
        answer:
          "Step 1: existing exports (capacity, workload, absences — CSV or Excel). Step 2: risk calculation, explanatory factors, costing. Step 3: risk map, action playbook, testable assumptions. We iterate together to calibrate the system on your real constraints.",
        category: "Pilot & pricing",
      },
      {
        question: "How do you measure ROI?",
        answer:
          "Every decision is logged. Praedixa measures before/after: costs avoided, forecast vs actual gap, economic impact. Auditable data, presentable to C-suite or CFO.",
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
          "Not for the initial diagnostic. Simple exports (CSV, Excel), no connectors to install. For continuous monitoring, Praedixa can progressively integrate your data flows.",
        category: "Technical & data",
      },
      {
        question: "GDPR: individual data?",
        answer:
          "No. Privacy-by-design: aggregated level (team/site), data limited to strict necessity. No individual prediction, no nominative processing. Hosted in France.",
        category: "Technical & data",
      },
      {
        question: "Do you have SOC 2 or ISO 27001?",
        answer:
          "Not yet. Our security practices are documented and auditable: encryption, RBAC, logs, France hosting, DPA available. We prioritize transparency over premature labels.",
        category: "Technical & data",
      },
      {
        question: "What if the pilot doesn't deliver results?",
        answer:
          "Success criteria are defined during framing. If KPIs aren't met, you get a factual report on why, and no obligation to continue. The pilot is designed to produce a clear answer, not to lock you in.",
        category: "Pilot & pricing",
      },
    ],
  },

  contact: {
    kicker: "Take action",
    heading: "Request a pilot.",
    subheading:
      "In 20 minutes, we frame scope, criticality, and expected value of a first decision loop.",
    trustItems: [
      "Response within 24 business hours",
      "NDA available from first contact",
      "Aggregated data only",
      "No obligation",
    ],
    ctaPrimary: "Request a pilot",
    ctaSecondary: "Email the team",
  },

  footer: {
    tagline: "Coverage intelligence for multi-site operations.",
    badges: ["COO / CFO governance", "Privacy-by-design"],
    navigation: "Navigation",
    legalContact: "Legal & contact",
    copyright: "Designed in France",
    ctaBanner: {
      kicker: "Founding cohort",
      heading: "Get ahead before the market standardizes.",
      cta: "Apply to the cohort",
    },
  },

  stickyCta: {
    text: "Request a pilot",
  },

  form: {
    pageTitle: "Pilot application",
    pageSubtitle:
      "This application allows us to qualify your scope and structure a first high-value operational decision loop.",
    pill: "Founding cohort",
    valuePoints: [
      "Qualification focused on COO and finance challenges",
      "Structured process in under 5 minutes",
      "Response within 24h from the founding team",
    ],
    estimatedTime: "Estimated time",
    estimatedTimeValue: "4 to 5 minutes",
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
        "We are reviewing your application and will get back to you within 24 business hours with a framing adapted to your context.",
      backToSite: "Back to site",
      checkEmail: "Check your inbox",
    },
    error: "Something went wrong. Please try again.",
    sectors: [
      "Logistics",
      "Transport",
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
