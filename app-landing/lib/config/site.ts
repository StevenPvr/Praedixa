export const siteConfig = {
  name: "Praedixa",
  description:
    "Praedixa anticipe vos besoins, optimise vos décisions et prouve votre ROI. Opérationnel en 30 jours.",
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
    provider: "Scaleway",
    location: "Paris (France)",
  },
} as const;
