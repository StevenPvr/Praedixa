# Landing (`@praedixa/landing`)

Site marketing de `praedixa.com`, construit avec Next.js App Router, React 19, Tailwind CSS, Framer Motion et quelques briques maison pour la securite des formulaires, l'i18n et le SEO.

## Message canonique

Le positioning de production doit rester coherent avec ces points:

- Praedixa est une couche de decision pour organisations multi-sites, pas un WFM, pas un ERP, pas une data platform generique.
- Entree commerciale actuelle: preuve sur historique en lecture seule pour objectiver les arbitrages les plus couteux.
- Boucle produit: voir plus tot -> comparer les options -> cadrer la decision -> prouver l'impact.
- Le manager reste decisionnaire.
- Le produit ne remplace pas un WFM / planning.

## Commandes utiles

Depuis la racine:

```bash
pnpm dev:landing
pnpm test -- app-landing
pnpm test:e2e:landing
```

Depuis le workspace:

```bash
pnpm --filter @praedixa/landing lint
pnpm --filter @praedixa/landing typecheck
pnpm --filter @praedixa/landing build
pnpm --filter @praedixa/landing dev:fresh
```

## Carte rapide

- `app/`: routes App Router, metadata, APIs locales, flux RSS/robots/sitemap
- `components/`: sections homepage, composants de pages, shell partage
- `lib/`: contenu, i18n, SEO, securite, helpers API serveur
- `public/`: logos, favicons, videos hero, assets partenaires
- `__tests__/`: tests du proxy
- `docs/`: copy et support editorial
- `scripts/`: utilitaires workspace (`resend`, audit blog)

## Documentation distribuee

- `app/README.md`
- `app/[locale]/README.md`
- `app/api/README.md`
- `components/README.md`
- `components/blog/README.md`
- `components/homepage/README.md`
- `components/pages/README.md`
- `components/shared/README.md`
- `lib/README.md`
- `lib/api/README.md`
- `lib/blog/README.md`
- `lib/content/README.md`
- `lib/i18n/README.md`
- `lib/media/README.md`
- `lib/security/README.md`
- `lib/seo/README.md`
- `public/README.md`

## Conventions transverses

- Les routes publiques vivent sous `app/[locale]` avec slug FR/EN derives de `lib/i18n/config.ts`.
- Les formulaires publics passent toujours par `app/api/*` et reutilisent `lib/api/form-route.ts`.
- Les pages de contenu doivent tirer leur metadata via `lib/seo/metadata.ts` et leur copy via dictionnaire ou modules `lib/content/*`.
- Le proxy `proxy.ts` gere canonical host, redirections legacy, nonce CSP et headers de requete.
- Les tests unitaires sont proches des zones sensibles: routes API, SEO, blog, i18n, media, securite.

## Deploiement

- Prod principale: Scaleway Serverless Containers via `Dockerfile.scaleway` et scripts racine.
- Build alternatif: OpenNext Cloudflare (`cf:build`, `preview`, `deploy`) surtout pour preview/dev.
- `@opennextjs/cloudflare` doit rester un outillage de build/dev, pas une dependance runtime du site public.
