# Vocabulaire de domaine canonique

Ce glossaire evite que le meme mot designe des choses differentes selon la surface.

## Termes a utiliser

| Terme              | Sens canonique                                                                                                    | A ne pas confondre avec...                                                      |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `DecisionContract` | primitive versionnee qui porte les regles, seuils, roles et policies d'une famille de decisions                   | `decision-config`, qui reste aujourd'hui un moteur coverage-specifique existant |
| `decision`         | enregistrement d'une recommandation ou d'un arbitrage produit par le systeme, avec contexte, versions et resultat | une page UI ou un simple clic operateur                                         |
| `workspace`        | surface UI de travail pour comprendre, comparer ou valider une decision                                           | un objet de persistance metier de reference                                     |
| `scenario`         | evaluation calculee d'une ou plusieurs options avec hypotheses, contraintes et output compare                     | un contrat ou une action                                                        |
| `action`           | write-back ou etape executable declenchee apres decision et, si besoin, approbation                               | une recommendation seule                                                        |
| `approval`         | validation ou rejet explicite d'une action ou d'une decision sur un perimetre donne                               | une permission statique RBAC                                                    |
| `proof pack`       | surface de preuve/explainability destinee a montrer ce qui a ete decide et pourquoi                               | le ledger economique de reference                                               |
| `ledger`           | trace economique de reference qui rapproche baseline, recommendation, actual et ROI                               | un log technique ou un proof pack                                               |
| `graph`            | couche semantique versionnee reliant entites, mesures, contrats et impacts                                        | les tables Bronze/Silver/Gold brutes                                            |

## Regles d'usage

- Ne pas reutiliser `DecisionContract` comme synonyme de route HTTP ou de schema OpenAPI.
- Ne pas appeler `ledger` un export marketing/ops qui ne porte pas `baseline`, `recommended` et `actual`.
- Ne pas appeler `workspace` un objet back-end persistant si son role est seulement UI.
- Quand l'existant coverage utilise encore `decision-config`, le nommer comme tel et documenter explicitement la transition de concept.

## Dans un diff

- Si un terme change de sens, la doc locale doit etre mise a jour dans le meme changement.
- Si une nouvelle primitive transverse apparait, l'ajouter ici avant de la propager dans plusieurs apps.
