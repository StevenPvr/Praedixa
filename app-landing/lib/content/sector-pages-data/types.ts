import type { Locale } from "../../i18n/locale";
import type { MarketingIconComponent } from "../../../components/shared/icons/MarketingIcons";

export type SectorPageId =
  | "hcr"
  | "higher-education"
  | "logistics-transport-retail"
  | "automotive"
  | "fitness";

export interface SectorProof {
  value: string;
  label: string;
  detail: string;
  sourceLabel: string;
  sourceUrl: string;
}

export interface SectorChallenge {
  title: string;
  body: string;
}

export interface SectorLoopStep {
  title: string;
  body: string;
}

export interface SectorSourceLink {
  label: string;
  url: string;
}

export interface SectorDifferentiationCard {
  title: string;
  body: string;
}

export interface SectorPageEntry {
  id: SectorPageId;
  icon: MarketingIconComponent;
  groupLabel: string;
  slug: string;
  shortLabel: string;
  brandLabel: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  heroKicker: string;
  heroTitle: string;
  heroSubtitle: string;
  proofKicker: string;
  proofTitle: string;
  proofIntro: string;
  proofs: SectorProof[];
  challengeKicker: string;
  challengeTitle: string;
  challengeBody: string;
  challenges: SectorChallenge[];
  valuePropKicker: string;
  valuePropTitle: string;
  valuePropBody: string;
  loopKicker: string;
  loopTitle: string;
  loopIntro: string;
  loopSteps: SectorLoopStep[];
  kpiKicker: string;
  kpiTitle: string;
  kpis: string[];
  decisionKicker: string;
  decisionTitle: string;
  decisions: string[];
  ctaTitle: string;
  ctaBody: string;
  homepageHook: string;
  homepageStat: string;
  homepageProblem: string;
  sourceLinks: SectorSourceLink[];
}

export type SectorRouteConfig = {
  basePath: string;
  slugs: Record<SectorPageId, string>;
};

export type SectorLegacyAliasConfig = Record<Locale, readonly string[]>;
