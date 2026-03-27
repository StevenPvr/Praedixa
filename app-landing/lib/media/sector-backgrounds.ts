import type { SectorPageId } from "../content/sector-pages";

export interface SectorBackgroundAsset {
  src: string;
  sourcePageUrl: string;
  photographer: string;
}

const PEXELS_QUERY = "auto=compress&cs=tinysrgb&fit=crop&w=1800&h=1200";

const sectorBackgrounds = {
  hcr: {
    src: `https://images.pexels.com/photos/30951016/pexels-photo-30951016.jpeg?${PEXELS_QUERY}`,
    sourcePageUrl:
      "https://www.pexels.com/photo/cozy-modern-restaurant-interior-with-dining-tables-30951016/",
    photographer: "Natalia S",
  },
  "logistics-transport-retail": {
    src: `https://images.pexels.com/photos/4481326/pexels-photo-4481326.jpeg?${PEXELS_QUERY}`,
    sourcePageUrl: "https://www.pexels.com/photo/photo-of-warehouse-4481326/",
    photographer: "Tiger Lily",
  },
} as const satisfies Record<SectorPageId, SectorBackgroundAsset>;

export function getSectorBackgroundAsset(
  id: SectorPageId,
): SectorBackgroundAsset {
  return sectorBackgrounds[id];
}
