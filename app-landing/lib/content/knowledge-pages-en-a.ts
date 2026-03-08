import type { KnowledgePageContent, KnowledgePageKey } from "./knowledge-pages-shared";

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
      "Mission, positioning, and operating footprint of Praedixa for multi-site decision-making.",
    lead: "Praedixa brings HR, finance, operations, and supply chain data together to help multi-site companies anticipate needs, optimize decisions, and track ROI.",
    sections: [
      {
        title: "Mission",
        paragraphs: [
          "Support company growth by revealing the potential of existing data.",
          "Praedixa helps teams start from a shared foundation instead of reconciling disconnected numbers in every meeting.",
        ],
      },
      {
        title: "Positioning",
        paragraphs: [
          "Praedixa is not an ERP, a planning tool, or just another dashboard.",
          "It sits between existing data and business decisions that need to happen earlier, with a simpler reading for teams and committees.",
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
    ctaLabel: "Apply for the ROI pilot",
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
    ctaLabel: "Apply for the ROI pilot",
  },

  resources: {
    key: "resources",
    kicker: "Resources",
    title: "Essential resources",
    description:
      "A single entry point for covered contexts, core business use cases, and useful reading.",
    lead: "This page replaces the old sprawl of annex pages. It keeps the useful part in one place: covered contexts, priority business questions, and the short list of pages worth reading.",
    sections: [
      {
        title: "Start here",
        paragraphs: [
          "Begin with Product and method, How it works, Integration and data, and ROI pack.",
          "The path is intentionally short: fewer pages, more clarity.",
        ],
      },
      {
        title: "Covered contexts",
        paragraphs: [
          "Praedixa is built for multi-site companies that need to align HR, finance, operations, and supply chain decisions.",
          "Automotive, dealerships and workshops, logistics, transport, retail, and hospitality networks are now covered in one clear framework instead of separate annex pages.",
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
          "Detailed long-tail content now belongs in the blog, SEO resources, and live sales conversations, not in a forest of near-duplicate pages.",
          "The site keeps only the pages that genuinely help visitors understand the offer and move forward.",
        ],
      },
    ],
    links: [
      { label: "Product and method", key: "productMethod" },
      { label: "How it works", key: "howItWorksPage" },
      { label: "ROI pack", key: "decisionLogProof" },
      { label: "Integration and data", key: "integrationData" },
    ],
    ctaLabel: "Get the free ROI diagnostic",
  },

  productMethod: {
    key: "productMethod",
    kicker: "Product",
    title: "Product and method",
    description:
      "How Praedixa brings data together and turns it into clearer business priorities.",
    lead: "Praedixa brings HR, finance, operations, and supply chain data into one shared foundation, without replacing your tools, so teams can turn scattered signals into useful business priorities.",
    sections: [
      {
        title: "Bring the data together",
        paragraphs: [
          "Praedixa starts from the systems already in place and rewrites useful data into one shared language.",
          "The goal is not more reporting. It is a shared foundation teams can actually act on.",
        ],
      },
      {
        title: "Anticipate needs",
        paragraphs: [
          "The platform helps teams surface needs earlier so they do not wait until the cost is already locked in.",
        ],
      },
      {
        title: "Optimize decisions",
        paragraphs: [
          "Actions are prioritized by expected business impact, not by noise or urgency alone.",
          "Each decision keeps a business rationale that teams and leadership can reread later.",
        ],
      },
    ],
    links: [
      { label: "How it works", key: "howItWorksPage" },
      { label: "ROI pack", key: "decisionLogProof" },
      { label: "Integration and data", key: "integrationData" },
      { label: "Essential resources", key: "resources" },
    ],
    ctaLabel: "Get the free ROI diagnostic",
  },

  howItWorksPage: {
    key: "howItWorksPage",
    kicker: "Method",
    title: "How it works",
    description:
      "The Praedixa path to bring the data together, surface needs earlier, prioritize actions, and track ROI.",
    lead: "Praedixa starts by helping teams bring the data together, then surface needs earlier, prioritize actions, and track ROI.",
    sections: [
      {
        title: "1. Bring the useful data together",
        paragraphs: [
          "Praedixa starts from exports, APIs, and existing tools to build a shared foundation.",
        ],
      },
      {
        title: "2. Surface the needs",
        paragraphs: [
          "Business signals become readable: where it hurts, where money leaks, and where teams should act first.",
        ],
      },
      {
        title: "3. Prioritize the actions",
        paragraphs: [
          "Teams see what to launch first and where the strongest gain potential sits.",
        ],
      },
      {
        title: "4. Track ROI",
        paragraphs: [
          "The result is reviewed in a simple ROI pack: starting point, priorities, actions, and observed gains.",
        ],
      },
    ],
    links: [
      { label: "Product and method", key: "productMethod" },
      { label: "ROI pack", key: "decisionLogProof" },
      { label: "Integration and data", key: "integrationData" },
    ],
    ctaLabel: "Get the free ROI diagnostic",
  },

  decisionLogProof: {
    key: "decisionLogProof",
    kicker: "Proof",
    title: "ROI pack",
    description:
      "The simple format that links priorities, actions, and observed gains over time.",
    lead: "The Praedixa ROI pack links each operational trade-off to a clear monthly reading that finance, operations, and leadership can actually use.",
    sections: [
      {
        title: "What it contains",
        paragraphs: [
          "Starting point, chosen priorities, launched actions, and observed gains.",
          "The goal is to prove what creates value, not to pile up dashboards.",
        ],
      },
      {
        title: "What it changes",
        paragraphs: [
          "Committees stop restarting from scratch at every review.",
          "Decisions become easier to explain, reread, and improve.",
        ],
      },
      {
        title: "Why we keep this page",
        paragraphs: [
          "This is one of the few annex pages that still carries real commercial value.",
          "It shows how Praedixa turns data into business proof.",
        ],
      },
    ],
    links: [
      { label: "Product and method", key: "productMethod" },
      { label: "How it works", key: "howItWorksPage" },
      { label: "Essential resources", key: "resources" },
    ],
    ctaLabel: "Get the free ROI diagnostic",
  },

  integrationData: {
    key: "integrationData",
    kicker: "Integration",
    title: "Integration and data",
    description:
      "How Praedixa connects to the existing stack without creating a heavy new project.",
    lead: "Praedixa connects to your exports/APIs to bring everything into one shared foundation, without requiring a planning or WFM replacement to start.",
    sections: [
      {
        title: "Light setup",
        paragraphs: [
          "Read-only start, exports, APIs, and existing tools: the entry point stays simple.",
        ],
      },
      {
        title: "Shared foundation",
        paragraphs: [
          "HR, finance, operations, and supply chain data are brought into the same frame to accelerate decision-making.",
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
    ctaLabel: "Get the free ROI diagnostic",
  },
};
