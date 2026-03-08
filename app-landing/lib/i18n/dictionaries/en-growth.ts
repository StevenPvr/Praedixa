import type { Dictionary } from "../types";

export const enGrowth: Pick<Dictionary, 'security' | 'pilot' | 'faq' | 'contact' | 'servicesPage' | 'footer' | 'stickyCta' | 'form'> = {
  security: {
    kicker: "Integration & data",
    heading: "Bring your data together without replacing your tools.",
    subheading:
      "Praedixa starts from your existing setup, in read-only mode, to create one shared foundation across HR, finance, operations, and supply chain.",
    tiles: [
      {
        title: "Light connection",
        description:
          "Start from existing CSV, Excel, and APIs. Praedixa does not replace your current tools.",
      },
      {
        title: "Shared foundation",
        description:
          "HR, finance, operations, and supply chain data are brought into the same frame.",
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
        title: "Hosted in France (Scaleway)",
        description:
          "Platform and data hosted in France (Paris), with a transparent security posture for qualification.",
      },
    ],
    compatibility: {
      title: "Compatible with your existing tools",
      description:
        "Praedixa complements what you already use and brings your numbers into one shared foundation.",
      tools: ["Scheduling", "ERP", "CRM", "BI", "Excel"],
    },
    honesty:
      "The real challenge is not having more data. It is connecting the data you already have to decisions that create value.",
  },


  pilot: {
    kicker: "Pilot offer",
    heading:
      "Praedixa ROI pilot: free diagnostic, proof in 3 months.",
    subheading:
      "Multi-vertical program for multi-site companies: restaurants, retail, hospitality, dealerships/workshops, logistics, healthcare, industry, call centers.",
    statusLabels: ["Free diagnostic (M1)", "Proof milestone (S8)", "Consolidation (M3)"],
    included: {
      title: "What you receive",
      items: [
        "Free ROI diagnostic and potential estimate",
        "Useful indicators across HR, finance, operations, and supply chain",
        "Compared decision options (cost, service, business rules)",
        "Shared ROI pack: priority, action, result",
        "Monthly proof: baseline / recommended / actual",
        "Ops + Finance governance cadence",
      ],
    },
    excluded: {
      title: "What it does not include",
      items: [
        "A tool replacement project (ERP/scheduling)",
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
        "Usable exports (demand/workload, capacity, inventory/supply, absences)",
      ],
    },
    upcoming: {
      title: "Post-pilot path",
      description:
        "Progressive extension to more sites, more decisions, and more KPIs without replacing your existing stack.",
    },
    urgency:
      "Applications reviewed within 48 business hours. Focused-scope kickoff possible.",
    ctaPrimary: "Apply for the Praedixa ROI pilot",
    ctaMeta:
      "Free ROI diagnostic · Read-only exports/APIs · Monthly proof",
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
          "Praedixa brings your HR, finance, operations, and supply chain data together to anticipate needs, optimize decisions, and track ROI.",
        category: "Understanding Praedixa",
      },
      {
        question:
          "What is the difference between the Praedixa offer and the ROI diagnostic?",
        answer:
          "The full Praedixa offer includes the shared data foundation, prioritized actions, and ROI tracking over time. The ROI diagnostic is the fast starting point.",
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
          "Praedixa does not replace them. It sits on top of what you already use to support decisions and measure impact.",
        category: "Understanding Praedixa",
      },
      {
        question: "What is included in the free ROI diagnostic?",
        answer:
          "A first read of your data to locate losses, estimate gain potential, and scope the first priorities worth working on.",
        category: "Pilot & pricing",
      },
      {
        question: "How is the 3-month pilot structured?",
        answer:
          "M1: free diagnostic + read-only kickoff. Week 8: first proof milestone. Month 3: consolidation and full proof.",
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
          "Can we start small?",
        answer:
          "Yes. Many teams start with the ROI diagnostic and then extend into the full Praedixa offer once the first priorities are clear.",
        category: "Pilot & pricing",
      },
    ],
  },


  contact: {
    kicker: "Contact",
    heading: "Get the free ROI diagnostic.",
    subheading:
      "Share your context. We come back with a clear first reading of your data, your priorities, and the most useful next step.",
    trustItems: [
      "Response within 48 business hours",
      "Free ROI diagnostic",
      "Read-only via exports/APIs",
      "No mandatory post-pilot commitment",
    ],
    ctaPrimary: "Get the free ROI diagnostic",
    ctaSecondary: "See the pilot protocol",
  },


  servicesPage: {
    meta: {
      title:
        "Praedixa | Praedixa offer vs ROI diagnostic",
      description:
        "Compare the full Praedixa offer and the ROI diagnostic to choose your best starting point.",
      ogTitle:
        "Praedixa | Praedixa offer or ROI diagnostic",
      ogDescription:
        "Two ways to start: a fast ROI diagnostic or the full offer to bring data together, prioritize actions, and track gains.",
    },
    kicker: "Offer",
    heading: "Praedixa offer vs ROI diagnostic.",
    subheading:
      "You can start with an ROI diagnostic on your data, then activate the full offer to prioritize actions and track ROI over time.",
    fullPackage: {
      badge: "Praedixa full offer",
      title: "Bring data together, prioritize, track ROI",
      summary:
        "Praedixa core value: one shared foundation, clearer priorities, and a profitable action plan.",
      includesTitle: "What is included",
      includes: [
        "HR, finance, operations, and supply chain data brought together",
        "Business priorities ranked by impact",
        "Site-by-site action plan",
        "ROI tracked over time",
        "Shared foundation for committees and teams",
        "Multi-site comparison and standardization",
      ],
      cta: "Apply for a Praedixa ROI pilot",
    },
    forecastsOnly: {
      badge: "ROI diagnostic",
      title: "Fast starting point",
      summary:
        "A first reading to see where money leaks and where Praedixa can create the most value.",
      includesTitle: "What is included",
      includes: [
        "Analysis of your existing data",
        "Losses and gain potential identified",
        "Read-only start via exports/APIs",
      ],
      limitsTitle: "What is not included",
      limits: [
        "No ongoing ROI tracking",
        "No detailed prioritization over time",
        "No full multi-site framework",
      ],
      cta: "Get the free ROI diagnostic",
    },
    comparison: {
      title: "Quick comparison",
      columns: [
        {
          criterion:
            "Reading HR, finance, operations, and supply chain data",
          fullPackage: "Included",
          forecastsOnly: "Included",
        },
        {
          criterion: "Business priorities ranked by impact",
          fullPackage: "Included",
          forecastsOnly: "Not included",
        },
        {
          criterion: "Action plan tracked over time",
          fullPackage: "Included",
          forecastsOnly: "Not included",
        },
        {
          criterion: "Multi-site ROI tracking",
          fullPackage: "Included",
          forecastsOnly: "Not included",
        },
        {
          criterion: "Leadership / finance / operations cadence",
          fullPackage: "Included",
          forecastsOnly: "Not included",
        },
      ],
    },
    decisionGuide: {
      title: "When to choose each mode",
      items: [
        "Choose the full Praedixa offer when aligning teams and tracking ROI over time are top priorities.",
        "Choose the ROI diagnostic if you first want to objectify where money is leaking.",
        "You can start small, then activate the full Praedixa offer without changing tools.",
      ],
    },
    bottomNote:
      "The ROI diagnostic is a starting point. The real value is in the shared foundation, prioritization, and ROI tracking over time.",
  },


  footer: {
    tagline:
      "One shared foundation to anticipate needs, optimize decisions, and track ROI site by site.",
    badges: ["Shared foundation", "ROI tracked"],
    navigation: "Navigation",
    legalContact: "Legal & contact",
    copyright: "Designed and hosted in France",
    ctaBanner: {
      kicker: "Praedixa",
      heading:
        "All your data in one place. Clearer decisions.",
      cta: "Get the free ROI diagnostic",
    },
  },


  stickyCta: {
    text: "Get the free ROI diagnostic",
  },


  form: {
    pageTitle: "Praedixa ROI pilot request",
    pageSubtitle:
      "This request qualifies your 3-month ROI pilot, including a free ROI diagnostic.",
    pill: "Praedixa ROI pilot (3 months)",
    valuePoints: [
      "Free ROI diagnostic",
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
        "We will reply within 48 business hours with a tailored framing and ROI diagnostic plan.",
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
      "Operations / Workshop Manager",
      "Supply / Inventory Manager",
      "CFO / Finance Director",
      "General Manager",
      "Other",
    ],
    timelines: ["0-3 months", "3-6 months", "6-12 months", "Exploration"],
  },
};
