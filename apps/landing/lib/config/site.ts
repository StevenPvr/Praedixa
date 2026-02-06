/**
 * Site configuration - centralized contact and business info
 */

export const siteConfig = {
  name: "Praedixa",
  description: "Prevoir les trous. Chiffrer les options. Prouver le ROI.",

  contact: {
    email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "steven.poivre@outlook.com",
  },

  hosting: {
    provider: "Cloudflare",
    location: "Global (edge)",
  },
} as const;

export type SiteConfig = typeof siteConfig;
