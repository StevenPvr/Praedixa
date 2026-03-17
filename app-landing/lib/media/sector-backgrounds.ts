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
  "higher-education": {
    src: `https://images.pexels.com/photos/31085764/pexels-photo-31085764.jpeg?${PEXELS_QUERY}`,
    sourcePageUrl:
      "https://www.pexels.com/photo/modern-university-campus-with-students-outdoors-31085764/",
    photographer: "Dave Garcia",
  },
  "logistics-transport-retail": {
    src: `https://images.pexels.com/photos/4481326/pexels-photo-4481326.jpeg?${PEXELS_QUERY}`,
    sourcePageUrl: "https://www.pexels.com/photo/photo-of-warehouse-4481326/",
    photographer: "Tiger Lily",
  },
  automotive: {
    src: `https://images.pexels.com/photos/33814735/pexels-photo-33814735.jpeg?${PEXELS_QUERY}`,
    sourcePageUrl:
      "https://www.pexels.com/photo/mechanic-working-on-car-in-auto-workshop-33814735/",
    photographer: "Renee Razumov",
  },
  fitness: {
    src: `https://images.pexels.com/photos/8933584/pexels-photo-8933584.jpeg?${PEXELS_QUERY}`,
    sourcePageUrl:
      "https://www.pexels.com/photo/woman-in-black-sports-bra-and-black-leggings-doing-exercise-8933584/",
    photographer: "MART PRODUCTION",
  },
} as const satisfies Record<SectorPageId, SectorBackgroundAsset>;

export function getSectorBackgroundAsset(
  id: SectorPageId,
): SectorBackgroundAsset {
  return sectorBackgrounds[id];
}
