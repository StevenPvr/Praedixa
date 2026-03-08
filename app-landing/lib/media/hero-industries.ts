import {
  Factory,
  ShareNetwork,
  Storefront,
  Truck,
  Warehouse,
} from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";

export type HeroIndustryId =
  | "restaurant"
  | "hotel"
  | "fast-food"
  | "retail"
  | "transport"
  | "logistics"
  | "automotive"
  | "higher-education";

export interface HeroIndustryMedia {
  mp4Src: string;
  poster: string;
}

export interface HeroIndustryDefinition {
  id: HeroIndustryId;
  icon: Icon;
  media?: HeroIndustryMedia;
}

export const heroIndustryMedia: Partial<Record<HeroIndustryId, HeroIndustryMedia>> =
  {
    restaurant: {
      mp4Src: "/hero-video/hero-restaurant.mp4",
      poster: "/hero-video/hero-restaurant.jpg",
    },
    hotel: {
      mp4Src: "/hero-video/hero-hotel.mp4",
      poster: "/hero-video/hero-hotel.jpg",
    },
    "fast-food": {
      mp4Src: "/hero-video/hero-fast-food.mp4",
      poster: "/hero-video/hero-fast-food.jpg",
    },
    automotive: {
      mp4Src: "/hero-video/hero-automotive.mp4",
      poster: "/hero-video/hero-automotive.jpg",
    },
    "higher-education": {
      mp4Src: "/hero-video/hero-higher-education.mp4",
      poster: "/hero-video/hero-higher-education.jpg",
    },
  };

export const heroIndustryMontageMedia: HeroIndustryMedia = {
  mp4Src: "/hero-video/hero-industries-montage.mp4",
  poster: "/hero-video/hero-industries-montage.jpg",
};

export const heroIndustryDefinitions: readonly HeroIndustryDefinition[] = [
  {
    id: "restaurant",
    icon: Storefront,
    media: heroIndustryMedia.restaurant,
  },
  {
    id: "hotel",
    icon: ShareNetwork,
    media: heroIndustryMedia.hotel,
  },
  {
    id: "fast-food",
    icon: Storefront,
    media: heroIndustryMedia["fast-food"],
  },
  {
    id: "retail",
    icon: Storefront,
  },
  {
    id: "transport",
    icon: Truck,
  },
  {
    id: "logistics",
    icon: Warehouse,
  },
  {
    id: "automotive",
    icon: Factory,
    media: heroIndustryMedia.automotive,
  },
  {
    id: "higher-education",
    icon: ShareNetwork,
    media: heroIndustryMedia["higher-education"],
  },
] as const;
