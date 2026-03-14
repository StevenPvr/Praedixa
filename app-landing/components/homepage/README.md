# `components/homepage/`

Sections de la homepage et composants marketing relies au message public principal.

## Role

Construire une homepage modulaire ou chaque section reste lisible seule, reordonnable, et alignee sur un parcours de conversion simple:

- conflit economique visible
- couche de decision au-dessus de l'existant
- methode concrete
- cas d'usage
- preuve d'impact
- cadre IT/securite
- pilote
- FAQ
- CTA final

## Sections principales

- `HeroSection.tsx`: hero principal
- `HeroBackgroundVideo.tsx`: upgrade video hero au-dessus du poster critique
- `HeroProofCard.tsx`: carte de preuve ROI dans le hero
- `ProblemSection.tsx`, `SolutionSection.tsx`: problème et réponse produit
- `HowItWorksSection.tsx`: narration en etapes
- `UseCasesSection.tsx`, `DeliverablesSection.tsx`: cas d'usage et livrables
- `SecuritySection.tsx`, `PilotSection.tsx`, `FaqSection.tsx`: confiance, pilote, FAQ
- `SectorPagesTeaserSection.tsx`, `ClosedLoopTeaserSection.tsx`, `RoiProofTeaserSection.tsx`: teasers reutilisables hors parcours principal si besoin
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
La homepage doit garder un message produit unique: Praedixa aide les organisations multi-sites a arbitrer plus tot entre demande, capacite, cout, service et risque, puis a relire l'impact reel des decisions prises.
Le wedge commercial doit rester net: decisions de couverture et d'allocation les plus couteuses, sans retomber dans une promesse "on optimise tout pour tout le monde".
Dans le bloc editorial secondaire du hero, utiliser la raison d'etre ou une conviction fondatrice distincte; ne pas dupliquer le kicker `Pourquoi maintenant` du bloc probleme juste en dessous.
Avant de finaliser le hero et son bloc editorial secondaire, relire le premier viewport pour supprimer toute repetition litterale du sous-titre, de la reponse d'objection ou de la micro-copy de reassurance.
Sur une section homepage a fond sombre, ne pas utiliser de suffixe Tailwind non standard comme `text-white/72`; utiliser une couleur explicite compilee (`text-[rgba(...)]`) ou un token supporte, puis verifier le contraste reel avant validation.
Sur la palette de marque Tailwind, ne pas supposer que `text-amber-400/55` ou `text-brass-*/xx` compile; pour les libelles critiques, verifier la classe generee ou utiliser directement une couleur arbitraire compilee.
Le couple `hero.headline` + `hero.headlineHighlight` doit rester court et net; si le positionnement s'allonge, raccourcir la copy avant d'essayer de le compenser par le layout.
Dans le hero, `hero.headline` doit rester le mot-ancre principal, et `hero.headlineHighlight` doit vivre dessous dans une taille visiblement plus petite plutot qu'etre une deuxieme ligne geante.
Sur une hero image ou video sombre, ne pas reutiliser des tokens texte pensés pour fond clair sur `hero.headlineHighlight`; la ligne secondaire doit rester claire et lisible au premier coup d'oeil.
Le hero FR ne doit plus cacher le `hero.kicker` derriere une liste statique de fonctions; si la promesse cible un persona ou une offre d'entree, afficher la copy du dictionnaire telle quelle.
Pour les mots accentués du hero, choisir la couleur de marque la plus lisible sur le média réel (`--accent-*` ou `--brass-*`), pas une teinte pâle qui ressemble à un simple halo.
Le rail de preuves en bas du hero doit etre ancre avec le layout (`flex-1` + `mt-auto`), pas repositionne uniquement au `margin-top`, pour qu'il ne remonte pas quand la copy du hero change.
Sur la hero actuelle avec video de fond, garder une seule masse editoriale dominante. Ne pas reintroduire de grosse carte laterale si elle concurrence la lecture du message principal.
Au-dessus de la ligne de flottaison, preferer le conflit economique concret (`arbitrages vus trop tard -> marge fragilisee`) a une categorie inventee ou a une liste de leviers trop large.
Dans `HowItWorksSection.tsx` ou `ClosedLoopTeaserSection.tsx`, garder la boucle produit complete: `voir -> comparer -> decider -> prouver`.
Dans `ClosedLoopTeaserSection.tsx`, eviter les grilles de 5 cartes identiques: preferer une composition asymetrique avec une colonne d'intention et des etapes de tailles variees.
Dans `ClosedLoopTeaserSection.tsx`, ne pas utiliser de `translate-y` decoratif sur les etapes si cela fragilise la lecture ou le contraste; privilegier un rail vertical compact et stable.
Dans le rail d'etapes horizontal de `ClosedLoopTeaserSection.tsx`, garder toutes les cartes a hauteur identique et eviter tout contenu additionnel reserve a une seule carte.
Le hero video doit laisser le poster `next/image` porter le rendu initial: garder un `preload="metadata"` sur `HeroBackgroundVideo.tsx` et monter la vidéo apres l'hydratation plutot que dans le chemin critique du LCP.
`HeroSection.tsx` doit rester un composant serveur tant qu'il ne porte pas d'etat ou d'effet; isoler le strict minimum client dans `HeroBackgroundVideo.tsx` pour limiter le JS du chemin critique.
La vidéo hero est une amélioration progressive: le poster image porte le first paint, puis `HeroBackgroundVideo.tsx` monte automatiquement la vidéo apres l'hydratation seulement si le contexte le permet (`prefers-reduced-motion` et `saveData` respectés), sans exiger d'interaction utilisateur.
Dans `HeroBackgroundVideo.tsx`, preferer un seul flux MP4 robuste avec reprise `focus/pageshow/visibilitychange` plutot qu'une orchestration multi-format non utilisee en production.
Le poster hero critique doit rester servi directement avec `next/image` en `priority` + `unoptimized` quand l'asset local est deja suffisamment compact, pour eviter une latence inutile du proxy `_next/image` sur le LCP.
Pour l'iconographie marketing, preferer le set SVG `components/shared/icons/` aux glyphes `sparkle`, `lightbulb` ou styles `duotone`, surtout sur les labels de positionnement et les cartes sectorielles.
