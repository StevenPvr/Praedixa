import type { Dictionary } from "../types";

export const enCoreConversion: Partial<Dictionary> = {
  faq: {
    kicker: "FAQ",
    heading: "Frequently asked questions",
    subheading:
      "Short answers to decide whether Praedixa deployment should be opened now.",
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
    categories: ["Understanding Praedixa", "Deployment", "Technical & data"],
    items: [
      {
        question: "What is Praedixa in one sentence?",
        answer:
          "Praedixa helps multi-site networks spot earlier the trade-offs that erode margin, compare constrained options, and review the actual impact of the decisions taken.",
        category: "Understanding Praedixa",
      },
      {
        question: "What is historical proof for?",
        answer:
          "It is a read-only entry point used to objectify one concrete trade-off on your existing data, show what Praedixa would make visible, and frame deployment if the topic deserves to go further.",
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
        question: "What does Praedixa deployment include?",
        answer:
          "A useful read on your existing data, compared trade-offs with explicit assumptions, one shared frame for Ops / Finance / Network, and an impact-review loop that can be extended progressively.",
        category: "Deployment",
      },
      {
        question: "How do you prove ROI?",
        answer:
          "By comparing three situations: before (reference), recommended (potential), and actual (field). With a clear decision journal for choices and reasons.",
        category: "Deployment",
      },
      {
        question: "How does Praedixa calculate trade-offs?",
        answer:
          "Praedixa combines forecasting, statistical learning, and constrained optimization to compare the available options in a frame teams can actually use. The impact review also uses econometric models to separate what comes from context, from the decision taken, and from the outcome actually observed.",
        category: "Understanding Praedixa",
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
    ],
  },

  contact: {
    kicker: "Contact",
    heading: "Let’s frame the first trade-off to objectify.",
    subheading:
      "Describe the network, the priority trade-off, and the project horizon. We reply with a clear next step within 48 business hours.",
    trustItems: [
      "Response within 48 business hours",
      "Read-only start",
      "NDA available from the first discussion",
      "Focused first perimeter on the costliest trade-offs",
    ],
    ctaPrimary: "Frame the first decision scope",
    ctaSecondary: "See the historical proof",
  },

  servicesPage: {
    meta: {
      title: "Praedixa | What you buy: a first decision scope",
      description:
        "Praedixa deployment installs a first decision scope on top of your existing data. If needed, historical proof objectifies the starting trade-off before launch.",
      ogTitle: "Praedixa | What you buy: a first decision scope",
      ogDescription:
        "Praedixa deployment: a first decision scope framed in 30 days, without a heavy IT project at the start.",
    },
    kicker: "Offer",
    heading: "What you buy: a first decision scope, not one more IT project.",
    subheading:
      "One public offer: Praedixa deployment. Historical proof is used to objectify one trade-off on your existing data and decide whether the rollout should be launched.",
    fullPackage: {
      badge: "Praedixa deployment",
      title: "Software plus a scoped rollout",
      summary:
        "Praedixa core value: spot critical trade-offs earlier, compare constrained options, and review the impact over time.",
      includesTitle: "What is included",
      includes: [
        "A useful read on your existing data",
        "Trade-offs compared with explicit assumptions",
        "One shared frame for Ops / Finance / Network",
        "Software rollout and scoped implementation",
        "Impact review: baseline / recommended / actual",
        "Progressive extension to the costliest trade-offs",
      ],
      cta: "Frame the first decision scope",
    },
    forecastsOnly: {
      badge: "Historical proof",
      title: "Entry point to objectify the topic",
      summary:
        "A read-only first pass used to show one concrete trade-off, estimate the potential, and decide whether Praedixa deployment should be launched.",
      includesTitle: "What is included",
      includes: [
        "Read-only read on your existing data",
        "Priority trade-offs identified",
        "Simple synthesis: options, potential, next step",
      ],
      limitsTitle: "What is not included",
      limits: [
        "No full software deployment",
        "No installed review loop over time",
        "No network-wide extension beyond the first scoped perimeter",
      ],
      cta: "See the historical proof",
    },
    comparison: {
      title: "What actually changes",
      columns: [
        {
          criterion: "Useful read on your existing data",
          fullPackage: "Included",
          forecastsOnly: "Included",
        },
        {
          criterion: "Trade-offs compared under constraints",
          fullPackage: "Included",
          forecastsOnly: "Partial",
        },
        {
          criterion: "Software deployment and scoped rollout",
          fullPackage: "Included",
          forecastsOnly: "Not included",
        },
        {
          criterion: "Impact review over time",
          fullPackage: "Included",
          forecastsOnly: "Not included",
        },
        {
          criterion: "Progressive multi-site extension",
          fullPackage: "Included",
          forecastsOnly: "Not included",
        },
      ],
    },
    decisionGuide: {
      title: "When to start with historical proof",
      items: [
        "Start with historical proof if you first need to objectify one trade-off or align a committee.",
        "Go straight to deployment if the need, scope, and sponsor are already clear.",
        "Historical proof is not a separate offer: it is an entry point into Praedixa deployment.",
      ],
    },
    bottomNote:
      "Historical proof qualifies the start. The real value sits in Praedixa deployment: software, compared trade-offs, and impact reviewed over time.",
  },

  footer: {
    tagline:
      "Praedixa helps multi-site networks arbitrate earlier the decisions that protect margin and service, without replacing the tools already in place.",
    badges: ["Framed decisions", "Historical proof"],
    navigation: "Navigation",
    legalContact: "Legal & contact",
    copyright: "Designed and hosted in France",
    ctaBanner: {
      kicker: "Praedixa",
      heading: "Arbitrate earlier the decisions that protect margin.",
      cta: "Frame the first decision scope",
    },
  },

  stickyCta: {
    text: "Frame the first decision scope",
  },

  form: {
    pageTitle: "Praedixa deployment request",
    pageSubtitle:
      "This request is used to frame Praedixa deployment, the first perimeter to cover, and the rollout on top of your existing data.",
    pill: "Praedixa deployment",
    valuePoints: [
      "Software plus a scoped rollout",
      "COO / Ops / Network qualification",
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
    submit: "Submit request",
    submitting: "Submitting...",
    success: {
      title: "Request submitted",
      description:
        "We will reply within 48 business hours with a tailored framing and a clear next step for deployment.",
      backToSite: "Back to site",
      checkEmail: "View the offer",
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
