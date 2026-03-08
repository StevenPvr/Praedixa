import { serpBriefsCore } from "./serp-briefs-fr.core";
import { serpBriefsTail } from "./serp-briefs-fr.tail";
import type { SerpPageBrief } from "./serp-briefs-fr.types";

export type { SerpPageBrief } from "./serp-briefs-fr.types";

const briefsBySlug: Record<string, SerpPageBrief> = {
  ...serpBriefsCore,
  ...serpBriefsTail,
};

export function getSerpBriefBySlug(slug: string): SerpPageBrief | undefined {
  return briefsBySlug[slug];
}
