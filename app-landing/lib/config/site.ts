export const siteConfig = {
  name: "Praedixa",
  description:
    "Couche de décision pour organisations multi-sites: arbitrer plus tôt, comparer les options et prouver l’impact réel.",
  url: "https://www.praedixa.com",

  contact: {
    email: "hello@praedixa.com",
  },

  brand: {
    primaryEmailColor: "#111111",
  },

  routes: {
    deployment: "/deploiement",
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
