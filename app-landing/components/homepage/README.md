# `components/homepage/`

Sections de la homepage et teasers reutilises pour pousser vers les pages piliers.

## Role

Construire une homepage modulaire ou chaque section est lisible seule, reordonnable, et connectee au shell partage.

## Sections principales

- `HeroSection.tsx`: hero principal
- `HeroBackgroundVideo.tsx`: selection et rendu video/image hero
- `HeroProofCard.tsx`: carte de preuve ROI dans le hero
- `ProblemSection.tsx`, `SolutionSection.tsx`: probleme et reponse produit
- `SectorPagesTeaserSection.tsx`: renvoi homepage vers les pages sectorielles dediees
- `HowItWorksSection.tsx`: narration en etapes
- `UseCasesSection.tsx`, `DeliverablesSection.tsx`: cas d'usage et livrables
- `SecuritySection.tsx`, `PilotSection.tsx`, `FaqSection.tsx`: confiance, pilote, FAQ
- `ClosedLoopTeaserSection.tsx`, `IntegrationTeaserSection.tsx`, `RoiProofTeaserSection.tsx`, `ServicesPilotTeaserSection.tsx`: teasers vers pages profondes
- `ContactCtaSection.tsx`, `HomeFaqCtaSection.tsx`: CTA de sortie
- `how-it-works/*`: micro-composants d'interaction pour la section "how it works"

## Dependances frequentes

- `components/shared/AnimatedSection.tsx`
- `components/shared/SectionShell.tsx`
- `lib/i18n/types.ts`
- `lib/media/*`

## Tests

- `__tests__/HeroBackgroundVideo.test.tsx`
- `__tests__/HeroSection.test.tsx`
- `__tests__/HomepageMessaging.test.tsx`
- `__tests__/SectorPagesTeaserSection.test.tsx`

## Convention pratique

Si une section commence a porter de la logique de page complete, la remonter dans `components/pages/` plutot que d'alourdir la homepage.
La homepage doit garder un message produit unique: Praedixa = `DecisionOps` sur l'existant, avec arbitrages gouvernes, premiere action declenchee et preuve ROI decision par decision.
Le couple `hero.headline` + `hero.headlineHighlight` doit rester court et net; si le positionnement s'allonge, raccourcir la copy avant d'essayer de le compenser par le layout.
Le hero video doit laisser le poster `next/image` porter le rendu initial: garder un `preload="metadata"` sur `HeroBackgroundVideo.tsx` pour ne pas degrader inutilement le LCP de la homepage.
`HeroSection.tsx` doit rester un composant serveur tant qu'il ne porte pas d'etat ou d'effet; isoler le strict minimum client dans `HeroBackgroundVideo.tsx` pour limiter le JS du chemin critique.
La video hero est une amelioration progressive: le poster image porte le first paint, puis `HeroBackgroundVideo.tsx` ne charge la video qu'apres une vraie interaction utilisateur pour ne pas repousser le LCP de la homepage.
Le poster hero critique doit rester servi directement avec `next/image` en `priority` + `unoptimized` quand l'asset local est deja suffisamment compact, pour eviter une latence inutile du proxy `_next/image` sur le LCP.
