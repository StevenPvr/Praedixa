export const siteConfig = {
  name: "Praedixa",
  description: "Intelligence de couverture pour opérations multi-sites.",
  url: "https://www.praedixa.com",

  contact: {
    email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hello@praedixa.com",
  },

  routes: {
    pilot: "/devenir-pilote",
    contact: "/contact",
    mentionsLegales: "/mentions-legales",
    confidentialite: "/confidentialite",
    cgu: "/cgu",
  },

  hosting: {
    provider: "Cloudflare",
    location: "Global (edge)",
  },
} as const;
