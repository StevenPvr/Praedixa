# `components/homepage/`

Sections de la homepage et teasers reutilises pour pousser vers les pages piliers.

## Role

Construire une homepage modulaire ou chaque section est lisible seule, reordonnable, et connectee au shell partage.

## Sections principales

- `HeroSection.tsx`: hero principal
- `HeroBackgroundVideo.tsx`: selection et rendu video/image hero
- `HeroProofCard.tsx`: carte de preuve ROI dans le hero
- `ProblemSection.tsx`, `SolutionSection.tsx`: problème et réponse produit
- `SectorPagesTeaserSection.tsx`: renvoi homepage vers les pages sectorielles dediees
- `HowItWorksSection.tsx`: narration en etapes
- `UseCasesSection.tsx`, `DeliverablesSection.tsx`: cas d'usage et livrables
- `SecuritySection.tsx`, `PilotSection.tsx`, `FaqSection.tsx`: confiance, pilote, FAQ
- `ClosedLoopTeaserSection.tsx`, `RoiProofTeaserSection.tsx`: teasers vers pages profondes
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
La homepage doit garder un message produit unique: Praedixa = `DecisionOps` sur l'existant, avec arbitrages gouvernés, première action déclenchée et preuve ROI décision par décision.
Le couple `hero.headline` + `hero.headlineHighlight` doit rester court et net; si le positionnement s'allonge, raccourcir la copy avant d'essayer de le compenser par le layout.
Dans le hero, `hero.headline` doit rester le mot-ancre principal, et `hero.headlineHighlight` doit vivre dessous dans une taille visiblement plus petite plutot qu'etre une deuxieme ligne geante.
Sur une hero image ou video sombre, ne pas reutiliser des tokens texte pensés pour fond clair sur `hero.headlineHighlight`; la ligne secondaire doit rester claire et lisible au premier coup d'oeil.
Pour les mots accentués du hero, choisir la couleur de marque la plus lisible sur le média réel (`--accent-*` ou `--brass-*`), pas une teinte pâle qui ressemble à un simple halo.
Le rail de preuves en bas du hero doit etre ancre avec le layout (`flex-1` + `mt-auto`), pas repositionne uniquement au `margin-top`, pour qu'il ne remonte pas quand la copy du hero change.
Sur la hero actuelle avec video de fond, garder une seule masse editoriale dominante. Ne pas reintroduire de grosse carte laterale si elle concurrence la lecture du message principal.
Dans `ClosedLoopTeaserSection.tsx`, garder la boucle produit complète: `Fédérer -> Prédire -> Calculer -> Déclencher -> Prouver`.
Dans `ClosedLoopTeaserSection.tsx`, eviter les grilles de 5 cartes identiques: preferer une composition asymetrique avec une colonne d'intention et des etapes de tailles variees.
Dans `ClosedLoopTeaserSection.tsx`, ne pas utiliser de `translate-y` decoratif sur les etapes si cela fragilise la lecture ou le contraste; privilegier un rail vertical compact et stable.
Dans le rail d'etapes horizontal de `ClosedLoopTeaserSection.tsx`, garder toutes les cartes a hauteur identique et eviter tout contenu additionnel reserve a une seule carte.
Le hero video doit laisser le poster `next/image` porter le rendu initial: garder un `preload="metadata"` sur `HeroBackgroundVideo.tsx` pour ne pas degrader inutilement le LCP de la homepage.
`HeroSection.tsx` doit rester un composant serveur tant qu'il ne porte pas d'etat ou d'effet; isoler le strict minimum client dans `HeroBackgroundVideo.tsx` pour limiter le JS du chemin critique.
La vidéo hero est une amélioration progressive: le poster image porte le first paint, puis `HeroBackgroundVideo.tsx` ne charge la vidéo qu'après une vraie interaction utilisateur pour ne pas repousser le LCP de la homepage.
Le poster hero critique doit rester servi directement avec `next/image` en `priority` + `unoptimized` quand l'asset local est deja suffisamment compact, pour eviter une latence inutile du proxy `_next/image` sur le LCP.
Pour l'iconographie marketing, preferer le set SVG `components/shared/icons/` aux glyphes `sparkle`, `lightbulb` ou styles `duotone`, surtout sur les labels de positionnement et les cartes sectorielles.
