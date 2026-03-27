# `components/homepage/`

Sections V2 de la homepage et composants marketing relies au message public principal.

## Role

Construire une homepage modulaire ou chaque section reste lisible seule, reordonnable, et alignee sur un parcours de conversion:

hero -> credibilite -> probleme -> methode -> comparatif -> preuve -> deploiement -> secteurs -> integration -> faq -> contact

La homepage publique actuelle est orientee en priorite vers les franchisés et reseaux de restauration rapide multi-sites. Les sections homepage doivent donc parler explicitement rushs, staffing, service, delivery et marge, pas d'un message multi-sectoriel generique.

## Sections V2 (parcours actif)

Assemblees dans `app/[locale]/page.tsx`, chaque section prend `locale: Locale` et recupere son contenu via `getValuePropContent(locale)`.

| #    | Fichier                                            | Anchor         | Description                                                                               |
| ---- | -------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------- |
| S01  | `HeroPulsorSection.tsx` + `HeroPulsorContent.tsx` + `HeroPulsorVideoBackdrop.tsx` | `#hero`        | Hero video plein cadre: fond operations restaurant, overlay sombre, message resserre et CTA au-dessus de la ligne de flottaison |
| S02  | `CredibilityRibbonSection.tsx`                     | `#credibilite` | Ruban de credibilite: stack chips, role pills, trust markers                              |
| S03  | `ProblemBlockSection.tsx`                          | `#probleme`    | 3 cartes tension numerotees avec hover signal                                             |
| S04  | `MethodBlockSection.tsx` + `MethodBlockClient.tsx` | `#methode`     | Sticky-scroll: 4 etapes voir/comparer/decider/prouver avec panel visuel synchronise       |
| S05  | `StackComparisonV2Section.tsx`                     | `#comparatif`  | Table 3 colonnes desktop, accordions mobile                                               |
| S06  | `ProofBlockSection.tsx` + `ProofBlockClient.tsx`   | `#preuve`      | Section dark, preview ROI a onglets, 3 metriques                                          |
| S07  | `DeploymentTimelineSection.tsx`                    | `#deploiement` | Timeline 5 etapes + bloc "ce que ce n'est pas"                                            |
| S08  | `SectorCardsSection.tsx`                           | `#secteurs`    | 4 cas d'usage QSR sur les arbitrages reseau recurrent                                     |
| S09  | `IntegrationSecuritySection.tsx`                   | `#integration` | Section dark, 6 control cards, ruban stack chips                                          |
| S10  | `FaqSectionV2.tsx`                                 | `#faq`         | 6 accordions FAQ + mini card contact                                                      |
| S11  | `FinalCtaSection.tsx` + `FinalCtaClient.tsx`       | `#contact`     | Split panel: promesse + formulaire 2 etapes                                               |

## Fichiers legacy (non utilises sur la homepage)

Ces fichiers existent encore mais ne sont plus importes dans `page.tsx`:

- `ClosedLoopTeaserSection.tsx`, `DeliverablesSection.tsx`, `HowItWorksSection.tsx`, `ProblemSection.tsx`, `HomeFaqCtaSection.tsx`

## Dependances frequentes

- `components/shared/SectionShellV2.tsx` — wrapper section (max-width, spacing, dark/light variant)
- `components/shared/v2/*` — composants V2 (ButtonPrimary, AccordionItem, TabsPill, etc.)
- `components/shared/Kicker.tsx` — kicker label
- `lib/content/value-prop/` — contenu FR/EN type
- `lib/i18n/config.ts` — types Locale, getLocalizedPath

## Tests (11 fichiers)

- `__tests__/HeroV2Section.test.tsx`
- `__tests__/CredibilityRibbonSection.test.tsx`
- `__tests__/ProblemBlockSection.test.tsx`
- `__tests__/MethodBlockSection.test.tsx`
- `__tests__/StackComparisonV2Section.test.tsx`
- `__tests__/ProofBlockSection.test.tsx`
- `__tests__/DeploymentTimelineSection.test.tsx`
- `__tests__/SectorCardsSection.test.tsx`
- `__tests__/IntegrationSecuritySection.test.tsx`
- `__tests__/FaqSectionV2.test.tsx`
- `__tests__/FinalCtaSection.test.tsx`
- `__tests__/HomepageMessaging.test.tsx`

## Convention pratique

Si une section commence a porter de la logique de page complete, la remonter dans `components/pages/`.
Le copy FR utilise des apostrophes typographiques U+2019; les tests doivent utiliser des regex avec `.` pour matcher les deux variantes.
Pour les sections homepage V2, extraire les sous-blocs vers des composants locaux ou fichiers freres des que la section depasse les guardrails de taille.
Si aucun bloc `answer-first` dedie n'est rendu sous le hero, integrer cette lecture canonique directement dans le hero lui-meme au lieu de re-creer une section post-hero.
Le comparatif homepage doit opposer Praedixa a des categories d'outils (`ERP`, `BI`, `planning`, `Excel/comites`), jamais a des marques nommees.
Sur la homepage FR, preferer le wording visible `preuve de ROI`; reserver `preuve sur historique` au slug et a la page detaillee quand il faut expliquer la methode de preuve.
Quand la homepage oppose Praedixa aux ERP, rendre explicite la difference de methode (`Data Science + Machine Learning + IA` vs pilotage par moyennes) au lieu de rester sur un comparatif trop abstrait.
Quand la homepage est recadree sur un ICP unique, retirer les sections visibles qui renvoient encore a d'autres verticales ou les convertir en cas d'usage du meme ICP.
Le rail de confiance du hero ne doit pas afficher de placeholders repetes ou de pseudo-logos textuels au-dessus de la ligne de flottaison.
Le hero `HeroPulsor` s'appuie desormais sur un fond video plein cadre; le contraste doit etre porte par un overlay sombre et un bloc texte simple, pas par des panneaux produits ajoutes au-dessus de la video.
Le recouvrement du hero video doit rester suffisamment leger pour laisser vivre les rushs en fond; si le texte reste lisible, preferer toujours un overlay moins opaque a un hero qui parait eteint.
Le hero `HeroPulsor` doit privilegier une hierarchie editoriale tres resserree (kicker, H1, subheading, CTA, une ligne de preuve) et garder une grande respiration autour du message.
Dans le hero `HeroPulsor`, ne pas remettre de companion pills de type badge metier ou stat courte (`QSR OPS`, `30j`) a cote du kicker si l'utilisateur cherche une silhouette plus nue.
Dans le hero `HeroPulsor`, ne jamais remettre par-dessus la video un board produit, un logo rail ou une pile de cartes qui recompacte la silhouette au-dessus de la ligne de flottaison.
Si un composant legacy de trust bar est conserve hors parcours actif, il doit lui aussi rester borne a des logos verifies; ne jamais y laisser de faux wordmarks ou de placeholders de preuve sociale.
