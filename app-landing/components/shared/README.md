# `components/shared/`

Shell partage du site et primitives visuelles reutilisables.

## Blocs principaux

- `Header.tsx`, `Footer.tsx`: chrome global
- `DesktopNav.tsx`, `MobileNav.tsx`, `LocaleSwitcher.tsx`: navigation et changement de langue
- `SectionShell.tsx`, `AnimatedSection.tsx`, `Kicker.tsx`: primitives de mise en page
- `ScopingCallForm.tsx`, `ScopingCallRequestPanel.tsx`, `ScopingCallSuccessState.tsx`: mini-parcours de call de cadrage
- `motion/*`: liens magnetiques, reveal, pulse, shimmer

## Dependances

- `lib/nav-config.ts`: structure du menu
- `lib/i18n/config.ts` et dictionnaires: labels et hrefs localises
- `lib/api/scoping-call/*`: validation et envoi du formulaire scoping call

## Tests

- `__tests__/NavigationMenus.test.tsx`

## Conventions

- tout composant de shell global doit rester ici plutot que dans `homepage/`
- les primitives visuelles doivent etre agnostiques du contenu metier
- les comportements d'animation repetables vont dans `motion/` pour eviter la duplication
- dans `Header.tsx`, garder un nom accessible explicite pour les CTA responsives et verifier le contraste reel des variantes desktop/mobile au lieu de supposer que les spans caches restent neutres pour l'audit a11y
