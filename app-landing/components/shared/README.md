# `components/shared/`

Shell partage du site et primitives visuelles reutilisables.

## Blocs principaux

- `Header.tsx`, `ScrollReactiveHeader.tsx`, `Footer.tsx`: chrome global
- `BreadcrumbTrail.tsx`: breadcrumb visible partagee pour les pages piliers
- `GeoSummaryPanel.tsx`: bloc shared `answer-first` pour les passages GEO courts, canoniques et citables
- `DesktopNav.tsx`, `MobileNav.tsx`, `LocaleSwitcher.tsx`: navigation et changement de langue
- `SectionShell.tsx`, `AnimatedSection.tsx`, `Kicker.tsx`: primitives de mise en page
- `v2/*`: primitives du nouveau funnel homepage (`AccordionItem`, `DecisionConsoleCard`, `InputFieldV2`, `TimelineStep`, etc.)
- `icons/*`: set SVG editorial partage pour l'iconographie marketing de la landing
- `ScopingCallForm.tsx`, `ScopingCallRequestPanel.tsx`, `ScopingCallSuccessState.tsx`: mini-parcours de call de cadrage
- `motion/*`: liens magnetiques, reveal, pulse, shimmer

## Dependances

- `lib/nav-config.ts`: structure du menu
- `lib/i18n/config.ts` et dictionnaires: labels et hrefs localises
- `lib/api/scoping-call/*`: validation et envoi du formulaire scoping call

## Tests

- `__tests__/NavigationMenus.test.tsx`
- `__tests__/BreadcrumbTrail.test.tsx`
- `__tests__/GeoSummaryPanel.test.tsx`

## Conventions

- tout composant de shell global doit rester ici plutot que dans `homepage/`
- les primitives visuelles doivent etre agnostiques du contenu metier
- les comportements d'animation repetables vont dans `motion/` pour eviter la duplication
- le scroll reactif du header doit rester isole dans `ScrollReactiveHeader.tsx`; `Header.tsx` garde le markup serveur et la logique de contenu, le wrapper client ne fait que gerer l'etat visuel hide/show
- `BreadcrumbTrail.tsx` doit rester sobre et semantique; les pages l'utilisent pour exposer la meme hierarchie que le balisage `BreadcrumbList`
- `GeoSummaryPanel.tsx` doit rester court, canonique et derivable du contenu deja visible; ne pas en faire un second hero marketing deconnecte des sections de la page
- l'iconographie marketing doit passer par `shared/icons/` plutot que multiplier des glyphes generiques de librairie avec des styles incoherents
- dans `Header.tsx`, garder un nom accessible explicite pour les CTA responsives et verifier le contraste reel des variantes desktop/mobile au lieu de supposer que les spans caches restent neutres pour l'audit a11y
- `Footer.tsx` doit reprendre exactement la meme these publique que la homepage; ne pas y reintroduire un wording legacy plus etroit (`charge/capacite`, `coverage`) une fois le message canonique mis a jour
- `Header.tsx` et `Footer.tsx` doivent partager la meme hierarchie d'entree publique: sur la homepage FR, afficher `preuve de ROI` comme CTA visible vers la page de preuve et garder le cadrage du premier perimetre comme autre entree globale; ne pas renvoyer vers une ancienne page `/deploiement`
- le mini-parcours `ScopingCallRequestPanel` doit reutiliser la meme validation semantique d'email que les autres formulaires LP via `lib/security/email-address.ts`
- quand le header doit disparaitre au scroll, le faire uniquement par `transform` et `opacity`, avec un seuil de direction stable; ne pas animer la hauteur ni reintroduire des listeners de scroll disperses dans `Header.tsx`, `DesktopNav.tsx` ou `MobileNav.tsx`
- garder un seul dropdown `Secteurs`/`Industries` utile dans le header pour les pages ICP exactes; eviter de reintroduire une megamenu large quand le vrai besoin est simplement l'acces direct aux verticales
- le dropdown sectoriel doit aussi garder une sortie nette vers la page hub `ressources/resources`, pas seulement vers les pages filles
- les tests de navigation doivent matcher les liens de cartes avec un nom accessible partiel plus le `href`, car le titre et la description sont exposes dans le meme lien
