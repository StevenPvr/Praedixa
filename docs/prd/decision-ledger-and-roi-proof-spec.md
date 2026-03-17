# Decision Ledger And ROI Proof Spec

## Role de ce document

Ce document ferme le trou documentaire entre:

- la boucle runtime `signal -> compare -> approve -> dispatch -> ledger`;
- la promesse produit "prouver le ROI decision par decision";
- la revue mensuelle Ops + Finance;
- la difference entre preuve ops, proof pack et verite economique de reference.

Il ne remplace pas:

- `docs/prd/decision-contract-governed-publish-spec.md` pour la gouvernance du contrat;
- `docs/prd/decisionops-operating-loop-spec.md` pour le workflow quotidien et les surfaces UX;
- `docs/prd/decision-graph-and-scenario-runtime-spec.md` pour le noyau `DecisionGraph + scenario runtime`.

Il fixe le contrat de build du noyau encore ouvert cote valeur:

- `Decision Ledger` finance-grade;
- methode ROI versionnee et relisible;
- drill-down depuis les KPI consolides;
- exports mensuels defendables;
- coherence entre ledger, decisions, actions, proof packs et revue mensuelle.

## Pourquoi ce document existe

Le repo dispose deja:

- d'une fondation `Decision Ledger` typee;
- d'un `Ledger Detail` persistant;
- des champs `baseline`, `recommended`, `actual`;
- d'une methode contrefactuelle persistee;
- d'un statut finance `estimated / validated / contested`;
- d'un recalcul versionne.

Le principal gap restant n'est plus de "nommer" le ledger.
Le gap est de rendre impossible que:

- la preuve ROI repose sur des logs techniques opaques;
- un proof pack ops soit pris pour la verite economique de reference;
- un KPI consolide soit impossible a relier aux decisions source;
- une revue mensuelle Finance se fasse sur des extractions ad hoc non gouvernees.

## Sources de verite

- `docs/prd/Praedixa_PRD_DecisionOps_PRD_final.md`
- `docs/prd/TODO.md`
- `docs/prd/coverage-v1-thin-slice-spec.md`
- `docs/prd/decision-contract-governed-publish-spec.md`
- `docs/prd/decisionops-operating-loop-spec.md`
- `docs/prd/decisionops-v1-execution-backbone.md`
- `docs/prd/matrice-verification-parcours-confiance.md`

## Resultat attendu

Le ledger finance-grade est credible quand le produit sait:

1. conserver une entree economico-operationnelle complete par decision;
2. distinguer clairement `baseline`, `recommended`, `actual`;
3. relire la methode ROI, ses revisions et son statut finance;
4. expliquer un KPI consolide par les decisions qui le composent;
5. produire des exports mensuels defendables sans retraitement artisanal;
6. separer la preuve economique de reference des artefacts ops ou marketing.

## Frontiere de verite

| Objet             | Ce qu'il represente                                           | Ce qu'il ne doit pas devenir                                       |
| ----------------- | ------------------------------------------------------------- | ------------------------------------------------------------------ |
| `Decision Ledger` | source de verite economico-operationnelle par decision        | un log technique brut ou un export ponctuel sans lineage           |
| `ROI method`      | la methode contrefactuelle et les hypotheses de calcul        | une formule implicite cachee dans un notebook ou une page          |
| `ROI Cockpit`     | une vue consolidee lisible par contrat, site, region, periode | une aggregation opaque sans drill-down                             |
| `Proof pack`      | un artefact de preuve ops/support/relecture contextuelle      | la reference economique officielle du produit                      |
| `Ledger export`   | un extrait versionne et defendable de la verite ledger        | une extraction libre sans contrat de colonnes ni periode explicite |

Le produit ne doit jamais laisser entendre que:

- un proof pack suffit pour tenir une revue ROI;
- un KPI consolide sans drill-down est une preuve defendable;
- un ROI pending equivaut a un ROI nul;
- une estimation non validee vaut validation finance.

## Entree canonique par decision

Chaque `ledger entry` doit conserver au minimum:

- `ledger_id`;
- `organization_id`;
- `contract_id`;
- `contract_version`;
- `run_id`;
- `recommendation_id`;
- `approval_id` si applicable;
- `action_id` si applicable;
- la version du template d'action si un dispatch existe;
- le scope temporel et organisationnel de la decision;
- la fenetre de donnees et le contexte de calcul;
- le statut ledger courant.

Une entree sans `contract_version`, `run_id` ou `recommendation_id` n'est pas une preuve DecisionOps defendable.

## Triptyque obligatoire `baseline / recommended / actual`

Le ledger doit rendre lisibles trois couches distinctes:

| Couche        | Question a laquelle elle repond                              |
| ------------- | ------------------------------------------------------------ |
| `baseline`    | que se serait-il passe sans intervention ou avec le plan BAU |
| `recommended` | qu'a recommande Praedixa avec ses hypotheses et contraintes  |
| `actual`      | qu'a-t-on reellement observe apres l'action ou la non-action |

Ces trois couches doivent rester distinctes:

- dans le detail de la decision;
- dans les revisions de calcul;
- dans les exports;
- dans le cockpit consolide.

## Methode ROI et hypotheses

Chaque entree doit versionner explicitement:

- la methode contrefactuelle utilisee;
- les hypotheses de cout, service, risque ou revenu;
- les sources de donnees qui portent ces hypotheses;
- la date et le moteur de calcul de la revision courante.

Le produit doit pouvoir distinguer des methodes telles que:

- `forecast_baseline`;
- `business_rule_baseline`;
- `cohort_comparison`;
- `manual_finance_adjustment`.

Une entry de ledger ne peut pas se clore sans methode explicite.

## Statuts de validation et preuves de mesure

### Statut finance

Le statut minimum doit rester:

- `estimated`;
- `validated`;
- `contested`.

### Statut de preuve de mesure

Le produit doit aussi rendre lisible si la preuve est:

- `proved`;
- `cannot_prove_yet`;
- `recalculated`;
- `disputed`.

Un `cannot_prove_yet` doit rester visible comme un etat temporaire de preuve insuffisante, pas comme un echec produit ni comme un zero.

## Recalcul et historique des revisions

Le ledger doit supporter la realite entreprise:

- les couts reels arrivent plus tard;
- les volumes ou revenus se stabilisent apres coup;
- une revue Finance peut requalifier une composante;
- une action peut rester partiellement executee.

Chaque recalcul doit conserver:

- la revision precedente;
- la revision courante;
- la raison du recalcul;
- l'acteur ou le moteur qui l'a declenche;
- les composantes qui changent;
- l'impact sur le statut finance.

Le ledger ne doit jamais ecraser silencieusement la revision precedente.

## Difference stricte entre ledger et proof packs

### Ce que fait le ledger

Le ledger:

- porte la verite economique de reference;
- rattache ROI, validation finance, revisions et lineage;
- doit etre utilisable en revue mensuelle;
- doit etre exportable selon un contrat stable.

### Ce que font les proof packs

Les proof packs:

- aident l'exploitation, le support ou la communication de preuve;
- peuvent regrouper contexte, captures, justificatifs ou artefacts de parcours;
- ne doivent pas porter des champs economiques inventes hors persistance;
- ne remplacent pas la source ledger.

Regle stricte:

- un proof pack peut pointer vers une `ledger entry`;
- une `ledger entry` ne doit jamais dependre d'un proof pack pour exister ou etre defendable.

## Cockpit ROI et revue mensuelle

Le cockpit ROI doit permettre:

- lecture par contrat, site, region, periode et pack;
- drill-down vers les decisions sous-jacentes;
- distinction visible entre `estimated`, `validated`, `contested`;
- distinction visible entre `proved` et `cannot_prove_yet`;
- lecture des revisions et contestations;
- export mensuel defendable.

La revue mensuelle doit pouvoir repondre sans retraitement manuel a:

- quelles decisions ont cree la valeur consolidee;
- quelle part est estimee, validee ou contestee;
- quelles hypotheses ont ete utilisees;
- quelles decisions restent en attente de preuve;
- quels ecarts existent entre recommande et observe.

## Drill-down obligatoire

Un KPI consolide doit pouvoir etre recompose en descendant vers:

1. la periode et le scope selectionnes;
2. les contrats contributes;
3. les decisions contribuant au KPI;
4. le detail `baseline / recommended / actual` de chaque decision;
5. la methode ROI et les revisions associees.

Un cockpit sans drill-down n'est pas une preuve finance-grade.

## Exports finance-grade

Les exports mensuels doivent etre gouvernes comme des artefacts produit:

- CSV pour relecture et rapprochement;
- PDF pour partage formel;
- JSON pour integrer des controles aval.

Chaque export doit porter:

- la periode;
- le scope;
- le contrat ou l'ensemble de contrats concernes;
- la date d'emission;
- les statuts finance et de preuve;
- la revision des entries exportees;
- le schema de colonnes ou payload attendu.

Un export ne doit pas perdre:

- le lien vers les decisions source;
- la methode ROI;
- le statut `estimated / validated / contested`;
- le statut `proved / cannot_prove_yet`.

## Coherence transverse a garantir

Le ledger doit rester coherent avec:

| Objet amont ou aval | Ce qui doit rester aligne                                                 |
| ------------------- | ------------------------------------------------------------------------- |
| `DecisionContract`  | formule ROI, scope, version de contrat, seuils de preuve                  |
| `ScenarioRun`       | `run_id`, hypotheses de calcul, horizon, options comparees                |
| `Approval`          | justification humaine, overrides, separation entre algorithme et jugement |
| `ActionDispatch`    | statut final, fallback, execution partielle ou complete                   |
| `Proof pack`        | references et artefacts de preuve, sans devenir la source economique      |
| `ROI Cockpit`       | aggregation lisible et drill-down sans divergence                         |

## Merge evidence minimale

- tests unitaires sur mapping ledger, statuts finance et revisions;
- tests d'integration sur `Ledger Detail`, revisions, drill-down et exports;
- tests de coherence `ROI / ledger / proof packs / decisions`;
- tests sur les etats `proved`, `cannot_prove_yet`, `recalculated`, `contested`;
- verification que les proof packs ne portent plus de champs economiques inventes hors persistance.

## Release evidence minimale

- smoke sur `Ledger Detail` et export mensuel;
- preuve qu'une revue mensuelle peut etre tenue sans extraction ad hoc;
- traces corrigeables via `request_id`, `run_id`, `contract_version`, `action_id`, `ledger_id`;
- runbook de relecture Finance/Ops sur un exemple de cloture mensuelle.

## Interpretation du TODO.md a travers ce spec

| Section du `TODO.md`               | Fermeture apportee                                                                  |
| ---------------------------------- | ----------------------------------------------------------------------------------- |
| 8. Ledger, ROI et mesure de valeur | entree complete, drill-down, exports, coherence ROI, separation proof pack / ledger |
| 7. Approval / Action Mesh          | relecture du payload final et des overrides dans la preuve economique               |
| 9. UX operationnelle               | alignement `Ledger Detail` et `ROI Cockpit` autour de la meme verite source         |
| 11. API / tests                    | exports et preuves de coherence governes                                            |
| 12. Observabilite / supportability | correlation des revisions ledger et de la revue mensuelle                           |

## Ordre de fermeture recommande

1. figer la definition source de verite du `Decision Ledger`;
2. fermer la difference `ledger` vs `proof pack`;
3. garantir l'entree complete par decision et les revisions;
4. exposer drill-down et exports mensuels gouvernes;
5. ajouter les tests de coherence et la preuve de revue mensuelle.

## Decision de cadrage

Tant que ce spec n'est pas vrai, Praedixa peut montrer des preuves utiles de parcours, mais ne ferme pas encore sa promesse de ROI decision par decision lisible, defendable et partageable entre Ops, Produit et Finance.
