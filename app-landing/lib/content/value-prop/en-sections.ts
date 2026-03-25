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
    heading: "Let\u2019s frame the next network trade-off.",
    intro:
      "Describe your restaurant footprint, the service under the most pressure, and the trade-off to objectify. We reply with a clear next step within 48 business hours.",
    promiseTitle: "What you get",
    promiseItems: [
      "Qualified reply within 48 business hours",
      "A first read on the restaurants, channels, or dayparts at risk",
      "A concrete trade-off to objectify first",
    ],
    proofIntentKicker: "ROI proof",
    proofIntentHeading: "Request an ROI proof on your rush periods.",
    proofIntentIntro:
      "Describe a past rush or a service breakdown. We reply with a first useful read and the best way to frame the next step.",
    proofIntentPromiseItems: [
      "Read-only analysis on POS, planning, and delivery signals",
      "Compared options on a cost, service, and margin basis",
      "Recommended next step if the topic deserves a network rollout",
    ],
    scopingIntentKicker: "First network scope",
    scopingIntentHeading: "Frame a first decision scope.",
    scopingIntentIntro:
      "Describe the network, the priority peak period, and your project horizon. We reply with a simple framing for the first scope.",
    scopingIntentPromiseItems: [
      "Qualification of the priority restaurants, channels, or dayparts",
      "Review of data and sponsor prerequisites",
      "Suggested framing for the first HQ + field review",
    ],
    reassuranceTitle: "Reassurance",
    reassuranceItems: [
      "Read-only at the start",
      "NDA available",
      "Reply within 48 business hours",
    ],
    secondaryPanelTitle: "Need to review the offer before the call?",
    secondaryPanelBody:
      "The offer page details what is delivered, what is not, and the first 30-day rhythm for a QSR network.",
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
      "Example: drive vs front-counter reinforcement across 18 restaurants before a national promotion.",
    currentStackPlaceholder:
      "Example: POS + planning + Uber Eats / Deliveroo + BI",
    messagePlaceholder:
      "Additional context, pressured service, committee to align, IT constraints, or governance concerns already known.",
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
      "An ROI proof structured like a review artifact for a quick-service restaurant network: starting point, compared options, retained decision, observed impact, and explicit limits.",
    ogTitle: "Praedixa | Historical proof",
    ogDescription:
      "A public historical proof example with compared options, retained decision, and reviewed impact.",
  },
  proof: {
    kicker: "Historical proof",
    title:
      "Proof a committee can use, not one more rush intuition.",
    lead: "Public example inspired by an 18-restaurant quick-service network: a national promotion lifts drive, counter, and delivery demand at the same time and forces a choice between targeted reinforcement, cross-site reallocation, and temporary service simplification.",
    situationTitle: "Starting point",
    situationBody: [
      "A promotional Friday evening puts 6 restaurants under pressure on drive and delivery. Service times are already slipping, emergency labor cost is climbing, and managers do not have a shared network view.",
      "The issue is not only to predict the peak. It is to decide which restaurants to reinforce, which channels to slow down temporarily, and where reallocation protects margin best.",
    ],
    optionsTitle: "Options compared",
    optionsBody: [
      "The proof compares three committee-readable options: local reinforcement, cross-site reallocation, and temporary delivery-menu reduction.",
      "Each option is reviewed with the same framework: cost of action, service risk, margin effect, field feasibility, and interpretation limits.",
    ],
    decisionTitle: "Retained decision",
    decisionBody: [
      "The retained decision combines targeted reinforcement on the most exposed restaurants with a short delivery-menu reduction where kitchens are saturating.",
      "The choice is justified by stronger protection of service time and margin than a uniform overtime response.",
    ],
    impactTitle: "Observed impact",
    impactBody: [
      "The before / recommended / actual review shows lower emergency labor hours and better service-time containment on the most exposed restaurants.",
      "The review is meant to prepare the next rush with cleaner assumptions, not to manufacture false certainty.",
    ],
    limitsTitle: "Limits of the proof",
    limitsBody: [
      "This is a public base-100 example, not a universal quantified commitment.",
      "The proof does not replace business framing or the data review needed before deployment.",
    ],
    dataTitle: "Data used",
    dataBody: [
      "POS sales, average ticket, schedules, absences, delivery channels, promotions, service time, and coverage cost by restaurant.",
      "Kickoff can remain read-only on top of existing exports or APIs.",
    ],
    nextTitle: "Next decision made possible",
    nextBody: [
      "Once this proof is structured, the network can reuse the same framework for the next staffing, service, or delivery trade-off.",
      "That move from one isolated rush to a repeatable decision cadence is what justifies Praedixa deployment.",
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
        option: "Local reinforcement",
        actionCost: "Base 100",
        inactionCost: "Base 143",
        serviceRisk: "Medium to high",
        decision: "Not retained alone",
        observedEffect: "Relieves one restaurant but quickly escalates emergency hours",
        limitation: "Does not solve network-wide drive and delivery saturation",
      },
      {
        option: "Cross-site reallocation",
        actionCost: "Base 91",
        inactionCost: "Base 148",
        serviceRisk: "Medium",
        decision: "Retained",
        observedEffect: "Protects the most exposed neighboring restaurants",
        limitation: "Assumes compatible distance and team versatility",
      },
      {
        option: "Delivery-menu reduction",
        actionCost: "Base 84",
        inactionCost: "Base 139",
        serviceRisk: "Low to medium",
        decision: "Partially retained",
        observedEffect:
          "Stabilizes critical kitchens and protects margin during the rush",
        limitation: "May reduce short-term revenue on one channel",
      },
    ],
    primaryCtaLabel: "Frame a first scope",
    secondaryCtaLabel: "See the public offer",
  },
  credibilityRibbon: {
    stackLabel: "Signals reviewed",
    stackChips: ["POS", "Planning", "Delivery", "Promotions", "BI", "API / CSV"],
    rolesLabel: "Network decision-makers",
    roleChips: ["Franchisee", "Network", "Ops", "Finance", "HR"],
    rolesMicrocopy:
      "The people who arbitrate staffing, service, and margin across the network.",
    trustLabel: "Commitments",
    trustMarkers: [
      "Read-only at the start",
      "No POS or planning write-back",
      "Hosted in France",
      "NDA from the first discussion",
    ],
  },
  problemCards: [
    {
      number: "01",
      title: "The rush becomes visible too late",
      consequence:
        "Once service is already slipping, the remaining options cost more and protect margin less effectively.",
    },
    {
      number: "02",
      title: "Each restaurant arbitrates alone",
      consequence:
        "Without a shared network read, teams compensate locally instead of choosing the best option for the whole footprint.",
    },
    {
      number: "03",
      title: "Margin drifts without proof",
      consequence:
        "Without a readout on service, staffing, and margin, the same problem comes back on the next lunch, dinner, or promotion.",
    },
  ],
  method: {
    kicker: "How it works",
    heading: "Four steps to decide before the rush.",
    steps: [
      {
        id: "voir",
        number: "01",
        verb: "Anticipate",
        title: "See which restaurants will slip before lunch, dinner, or promotion time",
        body: "Praedixa rereads POS, planning, delivery, weather, and promotion signals to identify the restaurants, dayparts, and channels that will come under pressure first.",
        bullets: [
          "Read-only connection to your existing sources",
          "Projection of risky services at short horizon",
          "Actionable signal by restaurant, channel, and time slot",
        ],
        microproof: "Rush detected 5 days before a promotional Friday",
      },
      {
        id: "comparer",
        number: "02",
        verb: "Compare",
        title: "Compare the field options that really exist",
        body: "For each service under pressure, Praedixa compares realistic options: local reinforcement, cross-site reallocation, temporary service simplification, or delivery throttling.",
        bullets: [
          "Multiple scenarios quantified and compared",
          "Cost of action vs cost of inaction",
          "Assumptions readable by HQ and field teams",
        ],
        microproof: "3 scenarios compared in 17 seconds",
      },
      {
        id: "decider",
        number: "03",
        verb: "Decide",
        title: "Validate a plan by restaurant, not a network average",
        body: "The retained decision is tracked with its assumptions, the restaurants involved, the service impacted, and the required approvals from network, ops, and finance.",
        bullets: [
          "Validation by the right stakeholders",
          "Full trace: who decided, when, and why",
          "Execution followed through to the field",
        ],
        microproof: "Decision made in the morning for the evening service",
      },
      {
        id: "prouver",
        number: "04",
        verb: "Prove",
        title: "Review margin, service, and emergency hours after execution",
        body: "After execution, Praedixa compares what was planned to what actually happened on coverage, service time, margin, and emergency labor cost.",
        bullets: [
          "Automatic planned vs actual comparison",
          "Structured proof, ready for committee",
          "Each rush improves the next one",
        ],
        microproof: "\u22127.4% on emergency hours in the reviewed case",
      },
    ],
  },
  proofPreview: {
    kicker: "ROI proof",
    heading: "A network case operations and finance can both read.",
    body: "Each trade-off is tied back to its effect on service, labor cost, and margin. You get a committee-ready proof, not a simple estimate.",
    tabs: [
      {
        label: "Situation",
        content:
          "18 restaurants face an app promotion on a Friday evening. Drive and delivery saturate in 6 outlets and emergency labor hours are already starting to drift.",
      },
      {
        label: "Options compared",
        content:
          "Three trade-offs are reviewed on the same baseline: targeted reinforcement, cross-site reallocation, and temporary delivery-menu reduction. Each option is evaluated on cost, service time, and protected margin.",
      },
      {
        label: "Impact measured",
        content:
          "The retained scenario reduced emergency hours by 7.4% and contained service time on the restaurants under the most pressure.",
      },
    ],
    metrics: [
      { value: "18", label: "Restaurants reviewed" },
      { value: "\u22127.4%", label: "Emergency hours" },
      { value: "11 min", label: "Service time contained" },
    ],
  },
  deployment: {
    kicker: "Deployment",
    heading: "A first network case in 30 days.",
    subheading:
      "We start on top of POS, planning, and delivery data. One operations sponsor is enough to frame the first trade-off.",
    steps: [
      {
        marker: "W1",
        title: "Network framing",
        description:
          "Choose the priority restaurants, critical dayparts, and the useful data sources.",
      },
      {
        marker: "W2",
        title: "Risk map",
        description:
          "A restaurant, service, and channel view with compared options on your existing data.",
      },
      {
        marker: "W3",
        title: "Trade-off",
        description:
          "Recommendation reviewed with operations, network leadership, and finance.",
      },
      {
        marker: "W4",
        title: "Actual impact",
        description:
          "Planned vs actual comparison on staffing, service, and margin, then rollout next steps.",
      },
      {
        marker: "\u2192",
        title: "Extension",
        description:
          "New restaurants, new peak periods, same decision method.",
      },
    ],
    notItems: [
      "No POS or planning replacement",
      "No heavy data program",
      "No vague pilot with no field decision",
      "No extra reporting for the field",
    ],
    ctaMicrocopy: "Qualified reply within 48 business hours",
  },
  integrationSecurity: {
    kicker: "Integration & security",
    heading: "Connected to reality, without touching live operations.",
    subheading:
      "Read-only. Hosted in France. No write-back into POS or planning. NDA from the first discussion.",
    controls: [
      {
        badge: "Active control",
        title: "Read-only",
        body: "No writes to your systems. Praedixa reads, compares, and documents without changing field operations.",
      },
      {
        badge: "Active control",
        title: "No POS or planning write-back",
        body: "POS, planning, and delivery tools stay in command. Praedixa does not push operational changes back into them.",
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
        body: "Every trade-off and approval is tracked with timestamp and actor.",
      },
      {
        badge: "Active control",
        title: "Standard connectors",
        body: "POS exports, delivery APIs, planning, BI, and CSV. No invasive integration.",
      },
    ],
    stackItems: ["POS", "Planning", "Delivery", "Promotions", "BI", "CSV", "API"],
  },
  faqV2: {
    heading: "Frequently asked questions",
    items: [
      {
        question: "Do we need to change our POS or planning stack?",
        answer:
          "No. Praedixa connects read-only to your existing tools. POS, planning, delivery, and BI stay in place.",
      },
      {
        question: "From how many restaurants does this become relevant?",
        answer:
          "As soon as HQ or the franchisee is arbitrating across multiple restaurants, dayparts, or channels. The gain comes from the network view, not from a single isolated store.",
      },
      {
        question: "Does this cover drive-through, front counter, and delivery?",
        answer:
          "Yes. The point is not the channel itself, but the trade-off between coverage, service promise, and margin when several channels tighten at once.",
      },
      {
        question: "What data is needed to get started?",
        answer:
          "Existing exports or APIs are usually enough: POS sales, schedules, absences, delivery feeds, promotions, or coverage-cost data.",
      },
      {
        question: "Who should sponsor the work on the client side?",
        answer:
          "A franchisee, network director, or operations leader with a real trade-off to settle over the coming weeks.",
      },
      {
        question: "How is this different from BI or WFM?",
        answer:
          "BI explains what happened. Planning executes a scenario. Praedixa connects the two to choose earlier what to do when the rush puts service, staffing, and margin under pressure.",
      },
      {
        question: "What happens after the first 30 days?",
        answer:
          "The method is reusable. You can extend it to more restaurants, more channels, or more peak periods without starting from scratch.",
      },
    ],
    contactCta: "Have a specific question?",
    contactBody:
      "Describe your network and the next rush to tackle, and we will reply with a qualified answer within 48 business hours.",
  },
  finalCta: {
    label: "Quick-service restaurant network",
    heading: "Let\u2019s frame the next network rush.",
    body: "Describe your restaurants, the services under pressure, and the next peak period. We come back with a concrete scope in 48 hours.",
    promiseItems: [
      "Reply in 48h",
      "First risk to objectify",
      "Concrete network action plan",
    ],
    step1Fields: [
      {
        name: "Number of restaurants",
        type: "select",
        options: ["2-5", "6-15", "16-40", "41-100", "100+"],
      },
      { name: "Main challenge", type: "text" },
      {
        name: "Project horizon",
        type: "select",
        options: [
          "Before the next peak period",
          "< 1 month",
          "1\u20133 months",
          "> 3 months",
        ],
      },
    ],
    step2Fields: [
      { name: "Name", type: "text" },
      { name: "Professional email", type: "email" },
      { name: "Brand / group", type: "text" },
      { name: "Message (optional)", type: "textarea" },
    ],
    step1Cta: "Continue",
    step2Cta: "Send request",
    successTitle: "Request sent",
    successBody:
      "We will get back to you within 48 business hours with a concrete next step.",
  },
};
