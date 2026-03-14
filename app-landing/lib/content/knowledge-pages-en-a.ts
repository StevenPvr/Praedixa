import type {
  KnowledgePageContent,
  KnowledgePageKey,
} from "./knowledge-pages-shared";

export const enContentA: Record<
  Extract<
    KnowledgePageKey,
    | "about"
    | "security"
    | "resources"
    | "productMethod"
    | "howItWorksPage"
    | "decisionLogProof"
    | "integrationData"
  >,
  KnowledgePageContent
> = {
  about: {
    key: "about",
    kicker: "Praedixa",
    title: "About",
    description:
      "Mission, positioning, and operating footprint of Praedixa for multi-site networks.",
    lead: "Praedixa helps multi-site networks spot earlier the trade-offs that put margin at risk, compare constrained options, and review the real impact of the decisions taken.",
    sections: [
      {
        title: "Mission",
        paragraphs: [
          "Support the growth of French companies by revealing the potential in their data while preserving sovereignty.",
          "Praedixa turns that mission into an operating frame: surface the critical trade-offs earlier, compare the options, and review what actually changed.",
        ],
      },
      {
        title: "Positioning",
        paragraphs: [
          "Praedixa is not a generic data platform, an ERP, a planning tool, or just another dashboard.",
          "It sits between existing systems and the business trade-offs that need to happen earlier, with controlled execution and proof teams can reread later.",
        ],
      },
      {
        title: "Footprint",
        paragraphs: [
          "French company, incubated at EuraTechnologies in northern France.",
          "Infrastructure and data hosting in France on Scaleway.",
        ],
      },
    ],
    links: [
      { label: "Product and method", key: "productMethod" },
      { label: "Integration and data", key: "integrationData" },
      { label: "Essential resources", key: "resources" },
    ],
    ctaLabel: "Frame the first decision scope",
  },

  security: {
    key: "security",
    kicker: "Security",
    title: "Praedixa workspace security",
    description:
      "Simple security and governance principles for an enterprise-ready setup.",
    lead: "Security is handled as a simple prerequisite: controlled access, aggregated data, traceability, and read-only start where it makes sense.",
    sections: [
      {
        title: "Principles",
        paragraphs: [
          "Praedixa favors operational simplicity: useful data, focused permissions, and limited exposure.",
          "The goal is to make security review easier, not heavier.",
        ],
      },
      {
        title: "Controls",
        paragraphs: [
          "Encryption in transit and at rest, role-based access control, and logging for sensitive actions.",
          "No individual prediction: the platform works at team, site, or activity level.",
        ],
      },
      {
        title: "Hosting",
        paragraphs: [
          "Platform and data hosted in France on Scaleway.",
          "Teams know where data goes, why it is used, and under which operating rules.",
        ],
      },
    ],
    links: [
      { label: "Integration and data", key: "integrationData" },
      { label: "About Praedixa", key: "about" },
      { label: "Essential resources", key: "resources" },
    ],
    ctaLabel: "Frame the first decision scope",
  },

  resources: {
    key: "resources",
    kicker: "Resources",
    title: "Essential resources",
    description:
      "A single entry point for core business topics, exact industry pages, and the useful reading that supports them.",
    lead: "This page keeps the navigation clear without recreating a sprawl of annex pages. Dedicated industry pages now carry the exact vertical story, while resources keep the supporting context in one place.",
    sections: [
      {
        title: "Start here",
        paragraphs: [
          "Begin with Product and method, How it works, Integration and data, and Historical proof.",
          "The path is intentionally short: fewer pages, more clarity.",
        ],
      },
      {
        title: "Covered contexts",
        paragraphs: [
          "Praedixa is built for multi-site companies that need to align HR, finance, operations, and supply chain decisions.",
          "Dedicated industry pages now cover hospitality, higher education, logistics / transport / retail, and automotive / dealerships / workshops with proof points and value propositions tailored to each context.",
        ],
        bullets: [
          "Workload and staffing variability",
          "Absenteeism and service continuity",
          "Cross-site comparison and prioritization",
          "ROI tracking and executive trade-offs",
        ],
      },
      {
        title: "Where deeper detail now lives",
        paragraphs: [
          "Detailed vertical content now lives in the dedicated industry pages, the blog, SEO resources, and live sales conversations, not in a forest of near-duplicate pages.",
          "The site keeps only the pages that genuinely help visitors understand the offer and move forward.",
        ],
      },
    ],
    links: [
      { label: "Product and method", key: "productMethod" },
      { label: "How it works", key: "howItWorksPage" },
      { label: "Historical proof", key: "decisionLogProof" },
      { label: "Integration and data", key: "integrationData" },
    ],
    ctaLabel: "See a concrete example",
  },

  productMethod: {
    key: "productMethod",
    kicker: "Product",
    title: "Product and method",
    description:
      "How Praedixa turns scattered signals into trade-offs teams can compare, decide, and review.",
    lead: "Praedixa helps multi-site networks surface critical trade-offs earlier, compare constrained options, and review impact without replacing the tools already in place.",
    sections: [
      {
        title: "See",
        paragraphs: [
          "Praedixa starts from the systems already in place to surface earlier the tensions that erode margin, service, or capacity.",
          "The goal is not more reporting. It is a useful read of the economic conflicts that deserve a decision.",
        ],
      },
      {
        title: "Compare",
        paragraphs: [
          "Options are compared with explicit assumptions: cost of action, cost of inaction, service level, and risk.",
          "Forecasting, constrained optimization, and statistical learning help compare the available scenarios without turning the product into an unreadable black box.",
        ],
      },
      {
        title: "Prove",
        paragraphs: [
          "Each decision keeps its context, rationale, and observed result.",
          "Econometric models help link baseline, chosen decision, and observed impact more carefully. The value sits in the full loop: compare, document, review, and improve the next trade-off.",
        ],
      },
    ],
    links: [
      { label: "How it works", key: "howItWorksPage" },
      { label: "Historical proof", key: "decisionLogProof" },
      { label: "Integration and data", key: "integrationData" },
      { label: "Essential resources", key: "resources" },
    ],
    ctaLabel: "See a concrete example",
  },

  howItWorksPage: {
    key: "howItWorksPage",
    kicker: "Method",
    title: "How it works",
    description:
      "The Praedixa sequence that makes a trade-off visible, comparable, decided, and reviewed.",
    lead: "Praedixa reads the useful signals, compares trade-offs, frames the decision, and reviews impact over time.",
    sections: [
      {
        title: "1. Early read",
        paragraphs: [
          "Praedixa starts from exports, APIs, and the tools already in place to surface the tension before the operating break happens.",
        ],
      },
      {
        title: "2. Economic comparison",
        paragraphs: [
          "Options are compared with explicit assumptions: cost of action, cost of inaction, operational impact, and risk level.",
          "Forecasting, statistical learning, and constrained optimization help compare the scenarios in a frame people can actually use.",
        ],
      },
      {
        title: "3. Framed decision",
        paragraphs: [
          "The team decides with a shared frame instead of reacting through disconnected tools or last-minute urgency.",
        ],
      },
      {
        title: "4. Impact proof",
        paragraphs: [
          "The result is reviewed through a before / recommended / actual loop to understand what really protected margin and what still needs correction.",
          "Econometric models help separate context effects from the decision itself so the impact review stays more defensible.",
        ],
      },
    ],
    links: [
      { label: "Product and method", key: "productMethod" },
      { label: "Historical proof", key: "decisionLogProof" },
      { label: "Integration and data", key: "integrationData" },
    ],
    ctaLabel: "See a concrete example",
  },

  decisionLogProof: {
    key: "decisionLogProof",
    kicker: "Proof",
    title: "Historical proof",
    description:
      "A public example of how Praedixa links options, chosen decision, and reviewed impact over time.",
    lead: "Illustrative public example inspired by a multi-site logistics case: a demand spike puts service under pressure and pushes three sites toward expensive emergency decisions.",
    sections: [
      {
        title: "Starting point",
        paragraphs: [
          "Three logistics sites have to absorb a five-day workload spike. Without a common frame, the team risks mixing poorly targeted overtime, late temp labor, and reallocation choices that only move the problem around.",
          "Praedixa turns that context into an explicit trade-off: where to reinforce, where to reallocate, where to delay, and which site deserves service protection first.",
        ],
      },
      {
        title: "Compared options",
        paragraphs: [
          "The example compares four options: local overtime, targeted temp labor, cross-site reallocation, and temporary service-level adjustment.",
          "Each option is reviewed with the same assumptions: action cost, cost of inaction, service level protected, and spillover risk on the rest of the network.",
        ],
      },
      {
        title: "Chosen decision and reviewed impact",
        paragraphs: [
          "The chosen recommendation combines cross-site reallocation and targeted temp labor instead of a blanket overtime reaction.",
          "The before / recommended / actual review then helps separate what comes from context, from the decision taken, and from the observed impact. Econometric models are used here to make attribution more defensible, not to decorate the outcome.",
        ],
      },
      {
        title: "What Praedixa adds",
        paragraphs: [
          "ERP, BI, planning tools, and spreadsheets already expose useful data, but the economic trade-off often stays split across teams and screens.",
          "Praedixa adds the missing frame between those tools: compared options, documented decision, explicit assumptions, and impact review over time.",
        ],
      },
    ],
    links: [
      { label: "Product and method", key: "productMethod" },
      { label: "How it works", key: "howItWorksPage" },
      { label: "Essential resources", key: "resources" },
    ],
    ctaLabel: "Frame the first decision scope",
  },

  integrationData: {
    key: "integrationData",
    kicker: "Integration",
    title: "Integration and data",
    description:
      "How Praedixa connects to the existing stack without creating a heavy new project.",
    lead: "Praedixa connects to your exports/APIs to federate the systems that matter to a decision, without requiring a planning or WFM replacement to start.",
    sections: [
      {
        title: "Light setup",
        paragraphs: [
          "Read-only start, exports, APIs, and existing tools: the entry point stays simple.",
        ],
      },
      {
        title: "Governed federation",
        paragraphs: [
          "HR, finance, operations, and supply chain data are brought into the same frame to accelerate decision-making without replacing your stack.",
        ],
      },
      {
        title: "Trust framework",
        paragraphs: [
          "RBAC, encryption, activity logging, and hosting in France on Scaleway.",
        ],
      },
    ],
    links: [
      { label: "Product and method", key: "productMethod" },
      { label: "Praedixa workspace security", key: "security" },
      { label: "Essential resources", key: "resources" },
    ],
    ctaLabel: "See a concrete example",
  },
};
