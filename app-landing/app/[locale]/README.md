# `app/[locale]/`

Routes publiques localisees pour `fr` et `en`.

## Role

Ce sous-arbre porte les pages visibles par les visiteurs. Le layout localise valide le `locale`, charge le dictionnaire, installe le shell de navigation et decide si le footer doit etre affiche.

## Layout et resolution de locale

- `layout.tsx`: charge `getDictionary(locale)`, installe `Header`, `Footer`, `JsonLd`
- `generateStaticParams()`: pregénère `fr` et `en` en build, mais retourne vide en développement pour éviter les corruptions locales de `prerender-manifest.json`
- `generateMetadata()`: titre + description de base par langue

## Pages majeures

- `page.tsx`: homepage composee autour du parcours principal `hero -> qualification -> probleme -> comparatif stack -> livrables -> offre -> teaser secteurs -> reassurance IT -> contact`
- `services/page.tsx`: page d'offre publique centree sur `ce que vous achetez`, le rythme des 30 jours et les prerequis du premier perimetre
- `secteurs/[slug]/page.tsx` et `industries/[slug]/page.tsx`: pages verticales FR/EN pour HCR, enseignement supérieur, logistique/transport/retail, automobile et fitness
- `contact/page.tsx`: page contact oriente qualification avec intents `deploiement/deployment` et `historique/historical-proof`
- `deploiement/page.tsx` et `deployment/page.tsx`: redirections permanentes vers `contact` avec un intent de cadrage, plus des pages d'offre autonomes
- `protocole-deploiement/page.tsx` et `deployment-protocol/page.tsx`: redirections permanentes vers l'offre `services`
- `comment-ca-marche/page.tsx` et `how-it-works/page.tsx`: narration de la methode
- `produit-methode/page.tsx` et `product-method/page.tsx`: positionnement produit
- `decision-log-preuve-roi/page.tsx` et `decision-log-roi-proof/page.tsx`: preuve sur historique structuree comme un support de revue exploitable en comite
- `integration-donnees/page.tsx` et `integration-data/page.tsx`: integration et donnees
- `ressources/page.tsx` et `resources/page.tsx`: hub de ressources
- `ressources/[slug]/page.tsx`: pages SEO FR generees depuis `lib/content`
- `ressources/[slug]/asset/route.ts`: telechargement d'asset teaser uniquement via signature courte delivree par `GET /api/resource-asset`
- `blog/page.tsx` et `blog/[slug]/page.tsx`: listing et detail blog
- `a-propos|about`, `securite|security`, `mentions-legales|legal-notice`, `confidentialite|privacy-policy`, `cgu|terms`: pages corporate et legales
- `logo-preview/*`: page interne de verification visuelle de logo

## Sources de donnees

- dictionnaires `lib/i18n/dictionaries/*`
- contenus de ressources `lib/content/*`
- pages sectorielles resolues depuis `lib/content/sector-pages.ts`
- posts blog lus depuis disque via `lib/blog/posts.ts`
- metadata SEO via `lib/seo/metadata.ts`

## Conventions

- les slugs traduits sont centralises dans `lib/i18n/config.ts`
- les pages FR/EN miroirs doivent rester coherentes dans le fond, meme si la copy diverge
- les pages legales partagent `components/pages/LegalStaticPage.tsx`
- les pages formulaire doivent reutiliser les composants de `components/pages/` ou `components/shared/`
- les pages publiques a forte intention (`services`, `contact`, `deploiement`, pages knowledge) doivent exposer une breadcrumb visible et un balisage `WebPage`/`BreadcrumbList` coherent
- les pages `ressources/[slug]` ne doivent jamais pointer vers un asset a URL stable directe; passer par le gateway `GET /api/resource-asset` puis une signature courte sur `ressources/[slug]/asset`
- les seules entrees publiques globales doivent rester la preuve sur historique et le cadrage du premier perimetre; ne pas rouvrir une route commerciale autonome type `deploiement`, `pilote` ou `diagnostic ROI`

## Tests associes

- `__tests__/layout.test.ts`
- `blog/__tests__/`
- `ressources/[slug]/asset/__tests__/`
