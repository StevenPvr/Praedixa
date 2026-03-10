import type { Icon } from "@phosphor-icons/react";
import type { Locale } from "../../i18n/config";

export type SectorPageId =
  | "hcr"
  | "higher-education"
  | "logistics-transport-retail"
  | "automotive";

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
  icon: Icon;
  groupLabel: string;
  slug: string;
  shortLabel: string;
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
