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
    heading: "Let’s frame the first trade-off to objectify.",
    intro:
      "Describe the first trade-off to cover, the network involved, and your project horizon. We reply with a clear next step within 48 business hours.",
    promiseTitle: "What you get",
    promiseItems: [
      "Qualified reply within 48 business hours",
      "A clear orientation between historical proof and deployment framing",
      "A concrete next step adapted to your scope",
    ],
    proofIntentKicker: "Historical proof",
    proofIntentHeading: "Request the historical proof.",
    proofIntentIntro:
      "Describe the trade-off you need to objectify. We reply with a first useful read and the best way to frame the next step.",
    proofIntentPromiseItems: [
      "Read-only analysis on your existing data",
      "Compared options on a cost / service / risk basis",
      "Recommended next step if the topic deserves deployment",
    ],
    scopingIntentKicker: "First scope",
    scopingIntentHeading: "Frame the first decision scope.",
    scopingIntentIntro:
      "Describe the network, the priority trade-off, and your project horizon. We reply with a simple framing for the first scope.",
    scopingIntentPromiseItems: [
      "Qualification of the priority scope",
      "Read on data and sponsor prerequisites",
      "Suggested framing for the first review committee",
    ],
    reassuranceTitle: "Reassurance",
    reassuranceItems: [
      "Read-only at the start",
      "NDA available",
      "Reply within 48 business hours",
    ],
    secondaryPanelTitle: "Need to align on the offer first?",
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
    mainTradeOff: "Main trade-off to objectify",
    timeline: "Project horizon",
    currentStack: "Current stack",
    message: "Free message",
    mainTradeOffPlaceholder:
      "Example: reinforcement vs reallocation across 12 logistics sites before a demand peak.",
    currentStackPlaceholder: "Example: ERP + WFM + BI + Excel exports",
    messagePlaceholder:
      "Additional context, committee to align, IT constraints, or governance concerns already known.",
    send: "Send request",
    sending: "Sending…",
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
    requiredMainTradeOff: "Main trade-off is required.",
    requiredTimeline: "Project horizon is required.",
    antiSpam: "Verification",
    challengeLoading: "Loading anti-spam verification…",
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
    lead: "Public example inspired by a multi-site logistics case: a demand spike puts three sites under pressure and forces a trade-off between local reinforcement, cross-site reallocation, and temporary service adjustment.",
    situationTitle: "Starting point",
    situationBody: [
      "Three logistics sites absorb a five-day demand spike. Backlog is rising, overtime is already partly consumed, and emergency temp staffing may arrive too late.",
      "The issue is not only to predict the spike. It is to decide where to reinforce, where to reallocate, and where to accept delay without moving the cost into the following week.",
    ],
    optionsTitle: "Options compared",
    optionsBody: [
      "The proof compares three committee-readable options: local overtime, targeted temp staffing, and cross-site reallocation.",
      "Each option is reviewed with the same frame: cost of action, cost of inaction, service risk, available capacity, and interpretation limits.",
    ],
    decisionTitle: "Retained decision",
    decisionBody: [
      "The retained decision combines cross-site reallocation with targeted reinforcement instead of a uniform overtime response.",
      "The choice is justified by stronger service protection at a more defensible total cost, even if cross-site coordination effort is higher.",
    ],
    impactTitle: "Observed impact",
    impactBody: [
      "The baseline / recommended / actual review shows stronger protection of the critical backlog and a lower emergency cost than the local-only scenario.",
      "The review is meant to prepare the next trade-off with cleaner assumptions, not to manufacture false certainty.",
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
    nextTitle: "Next trade-off made possible",
    nextBody: [
      "Once this proof is structured, the network can reuse the same frame for the next coverage, reallocation, or service-adjustment trade-off.",
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
    primaryCtaLabel: "Frame the first decision scope",
    secondaryCtaLabel: "See the public offer",
  },
  credibilityRibbon: {
    stackLabel: "Stack covered",
    stackChips: ["ERP", "WFM", "BI", "Planning", "Spreadsheets", "API / CSV"],
    rolesLabel: "Decision-makers involved",
    roleChips: ["COO", "VP Ops", "Network Dir.", "Finance", "CIO"],
    rolesMicrocopy:
      "The cost / service / risk trade-off runs through these roles.",
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
      title: "The trade-off stays fragmented",
      consequence:
        "The choice between reinforcement, reallocation, and service adjustment stays scattered across spreadsheets, BI, and meetings. No one sees the full trade-off.",
    },
    {
      number: "02",
      title: "The decision comes too late",
      consequence:
        "Without an early read, urgency decides for the network. The cost of inaction exceeds the cost of action, and no one measures it.",
    },
    {
      number: "03",
      title: "The impact is never reviewed",
      consequence:
        "After the decision, no one compares what was recommended to what actually happened. The next trade-off starts without proof.",
    },
  ],
  method: {
    kicker: "How it works",
    heading: "See, compare, decide, prove.",
    steps: [
      {
        id: "voir",
        number: "01",
        verb: "Federate & see",
        title: "Detect tensions before they become emergencies",
        body: "Praedixa federates existing signals (ERP, WFM, BI, exports) and predicts short-horizon multi-site tensions to trigger a trade-off before urgency hits.",
        bullets: [
          "Read-only connectors on your existing sources",
          "Workload prediction and tension detection at D+3 / D+7 / D+14",
          "Proactive alert when a trade-off is due",
        ],
        microproof: "Tension detected 8 days before the peak across 3 sites",
      },
      {
        id: "comparer",
        number: "02",
        verb: "Calculate & compare",
        title: "Compare options on a cost / service / risk basis",
        body: "The engine computes cost of action, cost of inaction, and service risk for each option. The result is a decision table ready for committee review.",
        bullets: [
          "Local reinforcement, cross-site reallocation, postponement, service adjustment",
          "Comparable costing on a shared basis",
          "Explicit assumptions, no black box",
        ],
        microproof:
          "4 options compared in 12 seconds, ready for Ops / Finance review",
      },
      {
        id: "decider",
        number: "03",
        verb: "Trigger & decide",
        title: "Trigger the retained decision with an auditable workflow",
        body: "The retained decision is documented with its assumptions, validated by the right role, and triggered through a traceable workflow.",
        bullets: [
          "Role-based validation (Ops, Finance, Network)",
          "Full trace: who decided, when, on which assumptions",
          "Integrated execution workflow",
        ],
        microproof: "Decision retained and executed in 4h instead of 3 days",
      },
      {
        id: "prouver",
        number: "04",
        verb: "Prove",
        title: "Review the real impact to sharpen the next trade-off",
        body: "After execution, Praedixa compares baseline, recommendation, and actual outcome. The review feeds the next decision cycle.",
        bullets: [
          "Automatic baseline / recommended / actual review",
          "Structured proof, usable in committee",
          "Recalibrated assumptions for the next trade-off",
        ],
        microproof: "Recommended vs actual gap: -12% on emergency cost",
      },
    ],
  },
  proofPreview: {
    kicker: "Proof in action",
    heading: "A proof dossier, not one more dashboard.",
    body: "Each decision generates a structured dossier: starting point, compared options, retained decision, observed impact. The committee reviews it, not the machine.",
    tabs: [
      {
        label: "Starting point",
        content:
          "Three logistics sites absorb a five-day demand spike. Backlog is rising, overtime is partly consumed, and temp staffing may arrive too late.",
      },
      {
        label: "Options compared",
        content:
          "Local overtime (base 100), targeted temp staffing (base 118), and cross-site reallocation (base 92). Each option is reviewed on the same cost / service / risk basis.",
      },
      {
        label: "Reviewed impact",
        content:
          "Cross-site reallocation reduced emergency cost by 12% compared to the local-only scenario, while stabilizing the critical backlog across all three sites.",
      },
    ],
    metrics: [
      { value: "3", label: "Options compared" },
      { value: "−12%", label: "Emergency cost" },
      { value: "8d", label: "Anticipation" },
    ],
  },
  deployment: {
    kicker: "Deployment",
    heading: "In production in 30 days, not 6 months.",
    subheading:
      "A focused scope, an operations sponsor, existing data. The first objectified trade-off arrives in 30 days.",
    steps: [
      {
        marker: "W1",
        title: "Framing",
        description:
          "Priority trade-off, data sources, and operations sponsor identified.",
      },
      {
        marker: "W2",
        title: "First read",
        description:
          "Compared options on a cost / service / risk basis from existing data.",
      },
      {
        marker: "W3",
        title: "Framed decision",
        description:
          "Explicit assumptions, recommended decision, and short Ops / Finance review.",
      },
      {
        marker: "W4",
        title: "Impact review",
        description:
          "Baseline / recommended / actual comparison and calibration of the next trade-off.",
      },
      {
        marker: "→",
        title: "Scale-up",
        description: "Extension to the next scope: new sites, new decisions.",
      },
    ],
    notItems: [
      "No stack rebuild or ERP / BI / planning replacement",
      "No vague promise to optimize the whole company at once",
      "No extra reporting layer without a usable trade-off",
      "No 6-month project before the first value",
    ],
    ctaMicrocopy: "Qualified reply within 48 business hours",
  },
  integrationSecurity: {
    kicker: "Integration & security",
    heading: "Plugged on top of the existing stack, not instead of it.",
    subheading:
      "Praedixa connects read-only to your sources. Data stays aggregated, hosted in France, and covered by NDA.",
    controls: [
      {
        badge: "Active control",
        title: "Read-only",
        body: "No writes to your source systems. Praedixa reads, compares, and documents.",
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
        title: "NDA from day one",
        body: "Confidentiality agreement signed before the first data exchange.",
      },
      {
        badge: "Active control",
        title: "Full audit trail",
        body: "Every decision, validation, and review is traced with timestamp and role.",
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
          "No. Praedixa sits on top of the existing stack in read-only mode. ERP, BI, planning, and spreadsheets stay in place.",
      },
      {
        question: "How long before the first objectified trade-off?",
        answer:
          "30 days. Framing starts in week 1, the first useful read arrives in week 2.",
      },
      {
        question: "What data is needed to get started?",
        answer:
          "Existing exports or APIs are enough: workload forecast, capacity, backlog, emergency costs. Kickoff can stay read-only.",
      },
      {
        question: "Who is the ideal sponsor on the client side?",
        answer:
          "An operations or network leader who owns a concrete trade-off to objectify. The sponsor frames the scope and validates assumptions.",
      },
      {
        question: "How is Praedixa different from a BI or forecasting tool?",
        answer:
          "BI shows what is happening. Forecasting anticipates. Praedixa adds the missing decision frame: compare options, retain a decision, then review the real impact.",
      },
      {
        question: "What happens after the first 30 days?",
        answer:
          "The frame is reusable. The network can extend to new sites, new decisions, or new horizons without starting over.",
      },
    ],
    contactCta: "Have a specific question?",
    contactBody:
      "Describe your context and we will reply with a qualified answer within 48 business hours.",
  },
  finalCta: {
    label: "Ready to objectify",
    heading: "Let's frame the first trade-off to objectify.",
    body: "Describe your network and the priority trade-off. We reply with a clear next step within 48 business hours.",
    promiseItems: [
      "Qualified reply within 48 business hours",
      "Orientation between historical proof and deployment framing",
      "Concrete next step adapted to your scope",
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
      { name: "Priority trade-off", type: "text" },
      {
        name: "Project horizon",
        type: "select",
        options: ["< 1 month", "1–3 months", "3–6 months", "> 6 months"],
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
