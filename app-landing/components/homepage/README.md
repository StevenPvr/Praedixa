# `components/homepage/`

Sections de la homepage et teasers reutilises pour pousser vers les pages piliers.

## Role

Construire une homepage modulaire ou chaque section est lisible seule, reordonnable, et connectee au shell partage.

## Sections principales

- `HeroSection.tsx`: hero principal
- `HeroBackgroundVideo.tsx`: selection et rendu video/image hero
- `HeroProofCard.tsx`: carte de preuve ROI dans le hero
- `ProblemSection.tsx`, `SolutionSection.tsx`: probleme et reponse produit
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

## Convention pratique

Si une section commence a porter de la logique de page complete, la remonter dans `components/pages/` plutot que d'alourdir la homepage.
