# `app/`

Point d'entree App Router du site public.

## Ce dossier contient

- les layouts globaux (`layout.tsx`, `error.tsx`, `global-error.tsx`, `not-found.tsx`)
- les routes localisees sous `[locale]/`
- les routes non-localisees de support (`robots.ts`, `sitemap.ts`, `llms.txt`, `llm.txt`, `rss.xml`)
- les APIs locales sous `api/`
- des tests Vitest pour le shell global et les routes metadata dans `__tests__/`

## Points d'entree majeurs

- `layout.tsx`: shell HTML global, fonts, styles globaux
- `[locale]/layout.tsx`: shell localise, `Header`, `Footer`, `JsonLd`
- `[locale]/page.tsx`: homepage FR/EN
- `[locale]/secteurs/[slug]/page.tsx` et `[locale]/industries/[slug]/page.tsx`: pages sectorielles dédiées
- `robots.ts`: politique crawl
- `sitemap.ts`: sitemap genere depuis routes fixes, blog et ressources SEO
- `rss.xml/route.ts`: flux RSS blog
- `llms.txt/route.ts` et `llms-full.txt/route.ts`: sorties texte canoniques pour agents/LLMs
- `llm.txt/route.ts`: alias de compatibilite qui redirige vers `/llms.txt`

## Regles utiles

- Une nouvelle page marketing doit presque toujours vivre sous `app/[locale]/...`.
- Une route non localisee n'est justifiee que pour metadata, assets speciaux ou endpoints techniques.
- Toute suppression/renommage de route dans `app-landing` doit s'accompagner d'un nettoyage `.next` avant redemarrage Turbopack.
- `layout.tsx` doit garder le chargement de police critique minimal pour la landing; ne pas ajouter une fonte secondaire globale si elle ne porte pas le hero ou le premier viewport.

## Tests associes

- `app/__tests__/*`: shell global, erreurs, metadata, robots, sitemap
- `rss.xml/__tests__/*`: generation RSS
- `apple-touch-icon-precomposed.png/__tests__/*`: route asset specifique
