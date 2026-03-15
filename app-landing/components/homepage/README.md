# `components/homepage/`

Sections de la homepage et composants marketing relies au message public principal.

## Role

Construire une homepage modulaire ou chaque section reste lisible seule, reordonnable, et alignee sur un parcours de conversion simple:

- hero centre sur la decision a arbitrer plus tot
- nature exacte de l'offre explicite des la hero
- bloc qualification `pour qui / quelles decisions / quel resultat`
- conflit economique visible
- comparatif clair contre la stack actuelle
- ce que vous achetez / livrables concrets
- preuve publique
- largeur sectorielle visible plus bas dans le parcours
- cadre IT / securite
- CTA final vers le cadrage du premier perimetre

## Sections principales

- `HeroSection.tsx`: hero principal
- `HeroBackgroundVideo.tsx`: upgrade video hero au-dessus du poster critique
- `ProblemSection.tsx`: conflit economique et enjeux visibles
- `QualificationSection.tsx`: profil cible, decisions couvertes, cas hors-scope
- `StackComparisonSection.tsx`: comparatif brand-neutral entre stack actuelle et couche de decision Praedixa
- `HowItWorksSection.tsx`: narration en etapes
- `DeliverablesSection.tsx`, `UseCasesSection.tsx`: livrables concrets et cas d'usage
- `SecuritySection.tsx`, `PilotSection.tsx`: confiance, offre et preuve publique
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
- `__tests__/StackComparisonSection.test.tsx`
- `__tests__/PillarLinksSection.test.tsx`
- `__tests__/SectorPagesTeaserSection.test.tsx`

## Convention pratique

Si une section commence a porter de la logique de page complete, la remonter dans `components/pages/` plutot que d'alourdir la homepage.
La homepage doit garder un message produit unique: Praedixa aide les reseaux multi-sites a arbitrer 3 a 14 jours plus tot les decisions qui protegent marge et service, puis a relire l'impact reel decision par decision.
Le wedge commercial doit rester net: decisions de couverture et d'allocation les plus couteuses, sans retomber dans une promesse "on optimise tout pour tout le monde".
Le maillage interne vers les pages piliers doit vivre aussi dans le corps de homepage, pas seulement dans le header/footer, pour que la hierarchie publique reste claire pour les visiteurs et pour Google.
Dans le bloc editorial secondaire du hero, utiliser la raison d'etre ou une conviction fondatrice distincte; ne pas dupliquer le kicker `Pourquoi maintenant` du bloc probleme juste en dessous.
Avant de finaliser le hero et son bloc editorial secondaire, relire le premier viewport pour supprimer toute repetition litterale du sous-titre, de la reponse d'objection ou de la micro-copy de reassurance.
Dans `HeroSection.tsx`, ne pas cumuler un kicker chrome, un ruban de badges et un panneau secondaire si cela repete le meme signal de confiance; la reassurance doit vivre a un seul endroit du hero.
Sur une section homepage a fond sombre, ne pas utiliser de suffixe Tailwind non standard comme `text-white/72`; utiliser une couleur explicite compilee (`text-[rgba(...)]`) ou un token supporte, puis verifier le contraste reel avant validation.
Sur la palette de marque Tailwind, ne pas supposer que `text-amber-400/55` ou `text-brass-*/xx` compile; pour les libelles critiques, verifier la classe generee ou utiliser directement une couleur arbitraire compilee.
Le couple `hero.headline` + `hero.headlineHighlight` doit rester court et net; si le positionnement s'allonge, raccourcir la copy avant d'essayer de le compenser par le layout.
Dans le hero, `hero.headline` doit rester le mot-ancre principal, et `hero.headlineHighlight` doit vivre dessous dans une taille visiblement plus petite plutot qu'etre une deuxieme ligne geante.
Sur une hero image ou video sombre, ne pas reutiliser des tokens texte pensés pour fond clair sur `hero.headlineHighlight`; la ligne secondaire doit rester claire et lisible au premier coup d'oeil.
Le hero FR ne doit plus cacher le `hero.kicker` derriere une liste statique de fonctions; si la promesse cible un persona ou une offre d'entree, afficher la copy du dictionnaire telle quelle.
Dans le hero actuel, il ne doit rester que deux CTA publics: la preuve sur historique et le cadrage du premier perimetre.
Dans `HeroSection.tsx`, la signature de marque au-dessus de la promesse doit reutiliser `PraedixaLogo` depuis `@praedixa/ui` avec le mot-symbole `Praedixa`, dans un contraste suffisant pour rester lisible sur la video.
Pour les mots accentués du hero, choisir la couleur de marque la plus lisible sur le média réel (`--accent-*` ou `--brass-*`), pas une teinte pâle qui ressemble à un simple halo.
Le rail de preuves en bas du hero doit etre ancre avec le layout (`flex-1` + `mt-auto`), pas repositionne uniquement au `margin-top`, pour qu'il ne remonte pas quand la copy du hero change.
Sur la hero actuelle avec video de fond, garder une seule masse editoriale dominante. Ne pas reintroduire de grosse carte laterale si elle concurrence la lecture du message principal.
Sur la hero video actuelle, la carte laterale droite ne doit pas revenir si elle concurrence la signature de marque et la lecture du message principal.
Quand une carte de preuve est affichee a droite du hero video, l'ancrer dans la colonne desktop avec un wrapper `relative` stable et sans gros `translate-y`; elle doit sembler suspendue a droite, pas tombee en bas du viewport.
Sur un hero video, garder les halos decoratifs tres subtils et sans dominante bleue opaque; si un calque commence a masquer la video, reduire ou supprimer l'effet au lieu de compenser ailleurs.
Pour proteger le contraste du hero video, preferer un voile neutre chaud ou charbon tres leger plutot qu'un overlay bleu nuit pleine largeur, puis verifier le vrai rendu desktop sur une frame reelle.
Au-dessus de la ligne de flottaison, preferer le conflit economique concret (`arbitrages vus trop tard -> marge fragilisee`) a une categorie inventee ou a une liste de leviers trop large.
Dans `HowItWorksSection.tsx` ou `ClosedLoopTeaserSection.tsx`, garder la boucle produit complete: `voir -> comparer -> decider -> prouver`.
La homepage ne doit pas laisser un bloc `pilote` ou un ancien `deploiement` reconstituer une offre parallele; si la preuve publique ou l'offre change de statut, refondre aussi l'ordre des sections au lieu de garder les anciens blocs par inertie.
Sur la home principale, preferer un parcours `hero -> qualification -> probleme -> comparatif -> livrables -> offre -> secteurs -> securite -> contact` a une accumulation de teasers et hubs qui remontent trop tot dans la lecture.
Quand la home reste multi-verticale, ne pas specialiser le hero sur une seule ICP; garder la promesse commune en haut et reporter la largeur sectorielle dans un bloc dedie plus bas.
Le comparatif homepage doit opposer Praedixa a des categories d'outils ou de pratiques (`ERP`, `BI`, `planning`, `Excel/comites`), jamais a des marques nommees.
Dans `StackComparisonSection.tsx`, garder la composition comme un assemblage de petits sous-composants de rendu; ne pas laisser la section replonger dans une fonction unique qui casse le guardrail de longueur.
Dans `ClosedLoopTeaserSection.tsx`, eviter les grilles de 5 cartes identiques: preferer une composition asymetrique avec une colonne d'intention et des etapes de tailles variees.
Dans `ClosedLoopTeaserSection.tsx`, ne pas utiliser de `translate-y` decoratif sur les etapes si cela fragilise la lecture ou le contraste; privilegier un rail vertical compact et stable.
Dans le rail d'etapes horizontal de `ClosedLoopTeaserSection.tsx`, garder toutes les cartes a hauteur identique et eviter tout contenu additionnel reserve a une seule carte.
Le hero video doit laisser le poster `next/image` porter le rendu initial: garder un `preload="metadata"` sur `HeroBackgroundVideo.tsx` et monter la vidéo apres l'hydratation plutot que dans le chemin critique du LCP.
`HeroSection.tsx` doit rester un composant serveur tant qu'il ne porte pas d'etat ou d'effet; isoler le strict minimum client dans `HeroBackgroundVideo.tsx` pour limiter le JS du chemin critique.
La vidéo hero est une amélioration progressive: le poster image porte le first paint, puis `HeroBackgroundVideo.tsx` monte automatiquement la vidéo apres l'hydratation seulement si le contexte le permet (`prefers-reduced-motion` et `saveData` respectés), sans exiger d'interaction utilisateur.
Dans `HeroBackgroundVideo.tsx`, preferer un seul flux MP4 robuste avec reprise `focus/pageshow/visibilitychange` plutot qu'une orchestration multi-format non utilisee en production.
Le poster hero critique doit rester servi directement avec `next/image` en `priority` + `unoptimized` quand l'asset local est deja suffisamment compact, pour eviter une latence inutile du proxy `_next/image` sur le LCP.
Pour l'iconographie marketing, preferer le set SVG `components/shared/icons/` aux glyphes `sparkle`, `lightbulb` ou styles `duotone`, surtout sur les labels de positionnement et les cartes sectorielles.
