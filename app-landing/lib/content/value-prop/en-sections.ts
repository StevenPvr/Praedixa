import type { ValuePropContent } from "./shared";

type ValuePropEnSections = Pick<
  ValuePropContent,
  | "contact"
  | "proofMeta"
  | "proof"
  | "credibilityRibbon"
  | "problemCards"
  | "method"
  | "proofPreview"
  | "deployment"
  | "integrationSecurity"
  | "faqV2"
  | "finalCta"
>;

export const valuePropEnSections: ValuePropEnSections = {
  contact: {
    heading: "Let's frame the first challenge to tackle.",
    intro:
      "Describe the first challenge to address, the network involved, and your project horizon. We reply with a clear next step within 48 business hours.",
    promiseTitle: "What you get",
    promiseItems: [
      "Qualified reply within 48 business hours",
      "A clear orientation between historical proof and deployment",
      "A concrete next step adapted to your scope",
    ],
    proofIntentKicker: "Historical proof",
    proofIntentHeading: "Request the historical proof.",
    proofIntentIntro:
      "Describe the challenge to address. We reply with a first useful analysis and the best way to frame the next step.",
    proofIntentPromiseItems: [
      "Read-only analysis on your existing data",
      "Compared options on a cost, service, and risk basis",
      "Recommended next step if the topic deserves deployment",
    ],
    scopingIntentKicker: "First scope",
    scopingIntentHeading: "Frame a first decision scope.",
    scopingIntentIntro:
      "Describe the network, the priority challenge, and your project horizon. We reply with a simple framing for the first scope.",
    scopingIntentPromiseItems: [
      "Qualification of the priority scope",
      "Review of data and sponsor prerequisites",
      "Suggested framing for the first review meeting",
    ],
    reassuranceTitle: "Reassurance",
    reassuranceItems: [
      "Read-only at the start",
      "NDA available",
      "Reply within 48 business hours",
    ],
    secondaryPanelTitle: "Need to review the offer before the call?",
    secondaryPanelBody:
      "The offer page details what is delivered, what is not, and the first 30-day rhythm.",
    secondaryPanelCta: "See the public offer",
    formTitle: "Describe your context",
    formSubtitle:
      "The fields needed to qualify the topic are required. The free message stays optional.",
    company: "Company",
    role: "Role",
    email: "Professional email",
    siteCount: "Number of sites",
    sector: "Sector",
    mainTradeOff: "Main challenge to address",
    timeline: "Project horizon",
    currentStack: "Current stack",
    message: "Free message",
    mainTradeOffPlaceholder:
      "Example: anticipate demand peaks across 12 logistics sites before the busy season.",
    currentStackPlaceholder: "Example: ERP + WFM + BI + Excel exports",
    messagePlaceholder:
      "Additional context, committee to align, IT constraints, or governance concerns already known.",
    send: "Send request",
    sending: "Sending\u2026",
    successTitle: "Request sent",
    successBody:
      "We will get back to you within 48 business hours with a concrete next step.",
    successCta: "Back to site",
    fixErrors: "Complete the required fields before sending.",
    unknownError: "Unknown error.",
    networkError: "Network error. Please try again.",
    requiredCompany: "Company is required.",
    requiredRole: "Role is required.",
    requiredEmail: "Professional email is required.",
    invalidEmail: "Invalid email address.",
    requiredSiteCount: "Number of sites is required.",
    requiredSector: "Sector is required.",
    requiredMainTradeOff: "Main challenge is required.",
    requiredTimeline: "Project horizon is required.",
    antiSpam: "Verification",
    challengeLoading: "Loading anti-spam verification\u2026",
    challengeUnavailable:
      "Anti-spam verification is unavailable. Reload the challenge.",
    challengeRetry: "Reload verification",
    requiredConsent: "You must accept the terms.",
    requiredCaptcha: "Please answer the verification.",
    consentPrefix: "I accept the ",
    termsLabel: "Terms",
    consentJoin: " and the ",
    privacyLabel: "privacy policy",
  },
  proofMeta: {
    title: "Praedixa | Historical proof",
    description:
      "A historical proof structured like a review artifact: starting point, compared options, retained decision, observed impact, and explicit limits.",
    ogTitle: "Praedixa | Historical proof",
    ogDescription:
      "A public historical proof example with compared options, retained decision, and reviewed impact.",
  },
  proof: {
    kicker: "Historical proof",
    title:
      "Proof that can be used in committee, not just commentary about proof.",
    lead: "Public example inspired by a multi-site logistics case: a demand spike puts three sites under pressure and forces a choice between local reinforcement, cross-site reallocation, and temporary service adjustment.",
    situationTitle: "Starting point",
    situationBody: [
      "Three logistics sites absorb a five-day demand spike. Backlog is rising, overtime is already partly consumed, and emergency temp staffing may arrive too late.",
      "The issue is not only to predict the spike. It is to decide where to reinforce, where to reallocate, and where to accept delay without moving the cost into the following week.",
    ],
    optionsTitle: "Options compared",
    optionsBody: [
      "The proof compares three committee-readable options: local overtime, targeted temp staffing, and cross-site reallocation.",
      "Each option is reviewed with the same framework: cost of action, cost of inaction, service risk, available capacity, and interpretation limits.",
    ],
    decisionTitle: "Retained decision",
    decisionBody: [
      "The retained decision combines cross-site reallocation with targeted reinforcement instead of a uniform overtime response.",
      "The choice is justified by stronger service protection at a more defensible total cost, even if cross-site coordination effort is higher.",
    ],
    impactTitle: "Observed impact",
    impactBody: [
      "The before / recommended / actual review shows stronger protection of the critical backlog and a lower emergency cost than the local-only scenario.",
      "The review is meant to prepare the next decision with cleaner assumptions, not to manufacture false certainty.",
    ],
    limitsTitle: "Limits of the proof",
    limitsBody: [
      "This is a public base-100 example, not a universal quantified commitment.",
      "The proof does not replace business framing or the data review needed before deployment.",
    ],
    dataTitle: "Data used",
    dataBody: [
      "Short-horizon workload forecast, available capacity, backlog, overtime, temp staffing, and service constraints per site.",
      "Kickoff can remain read-only on top of existing exports or APIs.",
    ],
    nextTitle: "Next decision made possible",
    nextBody: [
      "Once this proof is structured, the network can reuse the same framework for the next coverage, reallocation, or service-adjustment decisions.",
      "That move from one example to a decision cadence is what justifies Praedixa deployment.",
    ],
    tableTitle: "Compared summary",
    tableColumns: {
      option: "Option",
      actionCost: "Cost of action",
      inactionCost: "Cost of inaction",
      serviceRisk: "Service risk",
      decision: "Retained decision",
      observedEffect: "Observed effect",
      limitation: "What we cannot conclude",
    },
    rows: [
      {
        option: "Local overtime",
        actionCost: "Base 100",
        inactionCost: "Base 155",
        serviceRisk: "Medium to high",
        decision: "Not retained alone",
        observedEffect: "Relieves one site but propagates backlog",
        limitation: "Does not isolate the lack of cross-site capacity",
      },
      {
        option: "Targeted temp staffing",
        actionCost: "Base 118",
        inactionCost: "Base 142",
        serviceRisk: "Medium",
        decision: "Partially retained",
        observedEffect: "Protects the most constrained site",
        limitation: "Depends on the real staffing lead time",
      },
      {
        option: "Cross-site reallocation",
        actionCost: "Base 92",
        inactionCost: "Base 147",
        serviceRisk: "Low to medium",
        decision: "Retained",
        observedEffect:
          "Reduces emergency cost and stabilizes the critical backlog",
        limitation: "Assumes effective network coordination",
      },
    ],
    primaryCtaLabel: "Frame a first scope",
    secondaryCtaLabel: "See the public offer",
  },
  credibilityRibbon: {
    stackLabel: "Stack covered",
    stackChips: ["ERP", "WFM", "BI", "Planning", "Excel", "API / CSV"],
    rolesLabel: "Decision-makers involved",
    roleChips: ["COO", "VP Ops", "Network Dir.", "Finance", "CIO"],
    rolesMicrocopy: "The people who make the key decisions.",
    trustLabel: "Commitments",
    trustMarkers: [
      "Read-only at the start",
      "Hosted in France",
      "NDA from the first discussion",
      "Aggregated data",
    ],
  },
  problemCards: [
    {
      number: "01",
      title: "Signals arrive too late",
      consequence:
        "By the time the information arrives, it is already too late to act at the best cost.",
    },
    {
      number: "02",
      title: "Options are not compared",
      consequence: "Under pressure, teams choose speed over the best option.",
    },
    {
      number: "03",
      title: "Impact is never measured",
      consequence:
        "No way to know if the decision taken was the right one. The same problem comes back.",
    },
  ],
  method: {
    kicker: "How it works",
    heading: "Four steps. One measurable result.",
    steps: [
      {
        id: "voir",
        number: "01",
        verb: "Anticipate",
        title: "AI detects risks before they become emergencies",
        body: "Praedixa connects to your existing data and identifies operational risks before they impact your costs or your service.",
        bullets: [
          "Read-only connection to your existing sources",
          "Automatic detection of upcoming risks",
          "Proactive alert when action is needed",
        ],
        microproof: "Risk detected 8 days before impact",
      },
      {
        id: "comparer",
        number: "02",
        verb: "Compare",
        title: "Compare your options in one click",
        body: "For each detected risk, Praedixa calculates the cost and impact of each option. You see the best decision at a glance.",
        bullets: [
          "Multiple scenarios quantified and compared",
          "Cost of action vs cost of inaction",
          "Transparent assumptions, no black box",
        ],
        microproof: "4 options compared in 12 seconds",
      },
      {
        id: "decider",
        number: "03",
        verb: "Decide",
        title: "Make the right decision, tracked and justified",
        body: "The retained decision is documented with its assumptions and validated by the right people. Everything is traceable.",
        bullets: [
          "Validation by stakeholders (operations, finance)",
          "Full trace: who decided, when, why",
          "End-to-end execution tracking",
        ],
        microproof: "Decision made in 4h instead of 3 days",
      },
      {
        id: "prouver",
        number: "04",
        verb: "Prove",
        title: "Measure the real ROI of each decision",
        body: "After execution, Praedixa compares what was planned to what actually happened. You can prove your ROI in committee.",
        bullets: [
          "Automatic planned vs actual comparison",
          "Structured proof, ready for committee",
          "Each decision improves the next one",
        ],
        microproof: "\u221212% on emergency costs",
      },
    ],
  },
  proofPreview: {
    kicker: "Proof",
    heading: "Concrete results, not promises.",
    body: "Each decision is tracked and its impact measured. You can prove your ROI in committee.",
    tabs: [
      {
        label: "Situation",
        content:
          "Three sites face a demand spike. Emergency costs are rising and options are shrinking day by day.",
      },
      {
        label: "Options compared",
        content:
          "Three quantified options: local reinforcement, targeted temp staffing, and cross-site reallocation. Each option is evaluated on the same criteria: cost, risk, and service impact.",
      },
      {
        label: "Impact measured",
        content:
          "Cross-site reallocation reduced emergency costs by 12% while maintaining service levels across all three sites.",
      },
    ],
    metrics: [
      { value: "3", label: "Options compared" },
      { value: "\u221212%", label: "Emergency costs" },
      { value: "8d", label: "Anticipation" },
    ],
  },
  deployment: {
    kicker: "Deployment",
    heading: "Operational in 30 days.",
    subheading: "A simple start, an operations sponsor, your existing data.",
    steps: [
      {
        marker: "W1",
        title: "Framing",
        description:
          "Identify the priority challenge, data sources, and sponsor.",
      },
      {
        marker: "W2",
        title: "First analysis",
        description: "Compared options from your existing data.",
      },
      {
        marker: "W3",
        title: "Decision",
        description: "Recommendation validated with operations and finance.",
      },
      {
        marker: "W4",
        title: "Impact measurement",
        description:
          "Planned vs actual comparison and plan for what comes next.",
      },
      {
        marker: "\u2192",
        title: "Extension",
        description: "New sites, new decisions, same method.",
      },
    ],
    notItems: [
      "No replacement of your tools",
      "No heavy IT project",
      "No extra reporting",
      "No promise without proof",
    ],
    ctaMicrocopy: "Qualified reply within 48 business hours",
  },
  integrationSecurity: {
    kicker: "Integration & security",
    heading: "Secure, sovereign, non-intrusive.",
    subheading:
      "Read-only. Data hosted in France. NDA from the first discussion.",
    controls: [
      {
        badge: "Active control",
        title: "Read-only",
        body: "No writes to your systems. Praedixa reads, compares, and documents.",
      },
      {
        badge: "Active control",
        title: "Aggregated data",
        body: "No personal data. Signals are aggregated at site or network level.",
      },
      {
        badge: "Active control",
        title: "Hosted in France",
        body: "Infrastructure hosted in France, compliant with sovereignty requirements.",
      },
      {
        badge: "Active control",
        title: "NDA from the first discussion",
        body: "Confidentiality agreement signed before the first data exchange.",
      },
      {
        badge: "Active control",
        title: "Full traceability",
        body: "Every decision and validation is tracked with timestamp and author.",
      },
      {
        badge: "Active control",
        title: "Standard connectors",
        body: "REST API, CSV exports, ERP and WFM connectors. No invasive integration.",
      },
    ],
    stackItems: ["Planning", "ERP", "CRM", "BI", "Excel", "CSV", "REST API"],
  },
  faqV2: {
    heading: "Frequently asked questions",
    items: [
      {
        question: "Do we need to replace our current tools?",
        answer:
          "No. Praedixa connects read-only to your existing tools. ERP, BI, planning, and Excel stay in place.",
      },
      {
        question: "How long before the first results?",
        answer:
          "30 days. Framing starts in week 1, the first compared options arrive in week 2.",
      },
      {
        question: "What data is needed to get started?",
        answer:
          "Your existing exports or APIs are enough. Praedixa starts read-only, with no data migration.",
      },
      {
        question: "Who needs to sponsor the project on the client side?",
        answer:
          "An operations or network leader with a concrete challenge to tackle. They frame the scope and validate results.",
      },
      {
        question: "How is Praedixa different from a BI tool?",
        answer:
          "BI shows what is happening. Praedixa goes further: it anticipates risks, compares options, and measures the real impact of each decision.",
      },
      {
        question: "What happens after the first 30 days?",
        answer:
          "The method is reusable. You can extend to new sites or new decisions without starting over.",
      },
    ],
    contactCta: "Have a specific question?",
    contactBody:
      "Describe your context and we will reply with a qualified answer within 48 business hours.",
  },
  finalCta: {
    label: "Ready to start?",
    heading: "Let's talk about your ROI.",
    body: "Describe your context. We come back with an action plan in 48h.",
    promiseItems: [
      "Reply in 48h",
      "Personalized diagnostic",
      "Concrete action plan",
    ],
    step1Fields: [
      {
        name: "Network type",
        type: "select",
        options: [
          "Logistics",
          "Distribution",
          "Food service",
          "Retail",
          "Services",
          "Manufacturing",
          "Other",
        ],
      },
      { name: "Main challenge", type: "text" },
      {
        name: "Project horizon",
        type: "select",
        options: [
          "< 1 month",
          "1\u20133 months",
          "3\u20136 months",
          "> 6 months",
        ],
      },
    ],
    step2Fields: [
      { name: "Name", type: "text" },
      { name: "Professional email", type: "email" },
      { name: "Company", type: "text" },
      { name: "Message (optional)", type: "textarea" },
    ],
    step1Cta: "Continue",
    step2Cta: "Send request",
    successTitle: "Request sent",
    successBody:
      "We will get back to you within 48 business hours with a concrete next step.",
  },
};
