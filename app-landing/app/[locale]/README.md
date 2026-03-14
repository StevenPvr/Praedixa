# `app/[locale]/`

Routes publiques localisees pour `fr` et `en`.

## Role

Ce sous-arbre porte les pages visibles par les visiteurs. Le layout localise valide le `locale`, charge le dictionnaire, installe le shell de navigation et decide si le footer doit etre affiche.

## Layout et resolution de locale

- `layout.tsx`: charge `getDictionary(locale)`, installe `Header`, `Footer`, `JsonLd`
- `generateStaticParams()`: pregenere `fr` et `en`
- `generateMetadata()`: titre + description de base par langue

## Pages majeures

- `page.tsx`: homepage composee autour du parcours principal `probleme -> solution -> methode -> cas -> preuve publique -> securite -> FAQ -> pages cles -> CTA`
- `services/page.tsx`: comparaison entre preuve sur historique et déploiement Praedixa
- `secteurs/[slug]/page.tsx` et `industries/[slug]/page.tsx`: pages verticales FR/EN pour HCR, enseignement supérieur, logistique/transport/retail et automobile
- `contact/page.tsx`: page contact + formulaire
- `deploiement/page.tsx` et `deployment/page.tsx`: demande de déploiement Praedixa
- `protocole-deploiement/page.tsx` et `deployment-protocol/page.tsx`: redirections permanentes vers l'offre `services`
- `comment-ca-marche/page.tsx` et `how-it-works/page.tsx`: narration de la methode
- `produit-methode/page.tsx` et `product-method/page.tsx`: positionnement produit
- `decision-log-preuve-roi/page.tsx` et `decision-log-roi-proof/page.tsx`: preuve ROI
- `integration-donnees/page.tsx` et `integration-data/page.tsx`: integration et donnees
- `ressources/page.tsx` et `resources/page.tsx`: hub de ressources
- `ressources/[slug]/page.tsx`: pages SEO FR generees depuis `lib/content`
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

## Tests associes

- `blog/__tests__/`
- `ressources/[slug]/asset/__tests__/`
