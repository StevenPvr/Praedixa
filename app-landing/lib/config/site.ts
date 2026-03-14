export const siteConfig = {
  name: "Praedixa",
  description:
    "Praedixa aide les réseaux multi-sites à repérer plus tôt les arbitrages qui fragilisent la marge, à comparer les options, puis à relire l’impact réel.",
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
