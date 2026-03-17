import {
  listSectorPages,
  type SectorPageId,
} from "../../lib/content/sector-pages";

export interface SectorPagesCarouselCopy {
  kicker: string;
  heading: string;
  subheading: string;
  cta: string;
  proofLabel: string;
  decisionsLabel: string;
  navigationLabel: string;
  pageLabel: string;
  previousLabel: string;
  nextLabel: string;
  fallbackLabel: string;
  emptyTitle: string;
  emptyBody: string;
}

export type SectorList = ReturnType<typeof listSectorPages>;
export type SectorItem = SectorList[number];
export type ImageStatusMap = Partial<Record<SectorPageId, boolean>>;
