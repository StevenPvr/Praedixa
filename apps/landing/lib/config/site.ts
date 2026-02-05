/**
 * Site configuration - centralized contact and business info
 */

export const siteConfig = {
  name: "Praedixa",
  description:
    "Anticipez la sous-couverture. Décidez en confiance. Prouvez chaque choix.",

  contact: {
    email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "steven.poivre@outlook.com",
  },

  hosting: {
    provider: "Cloudflare",
    location: "Global (edge)",
  },
} as const;

export type SiteConfig = typeof siteConfig;
