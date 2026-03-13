import type { Locale } from "../i18n/config";
import { localizedSlugs } from "../i18n/config";

export type KnowledgePageKey =
  | "about"
  | "security"
  | "resources"
  | "productMethod"
  | "howItWorksPage"
  | "decisionLogProof"
  | "integrationData";

export interface KnowledgeSection {
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface KnowledgeLink {
  label: string;
  key: KnowledgePageKey;
}

export interface KnowledgePageContent {
  key: KnowledgePageKey;
  kicker: string;
  title: string;
  description: string;
  lead: string;
  sections: KnowledgeSection[];
  links?: KnowledgeLink[];
  ctaLabel: string;
}

export function getKnowledgePath(
  locale: Locale,
  key: KnowledgePageKey,
): string {
  return `/${locale}/${localizedSlugs[key][locale]}`;
}
