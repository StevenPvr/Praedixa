# Decision Graph And Scenario Runtime Spec

## Role de ce document

Ce document ferme le trou documentaire entre:

- la vision PRD cible;
- la gouvernance du `DecisionContract`;
- la boucle runtime quotidienne `signal -> compare -> approve -> dispatch -> ledger`;
- les preuves merge/release deja decrites dans la matrice de verification.

Il ne remplace pas:

- `docs/prd/decision-contract-governed-publish-spec.md` pour le lifecycle et la SoD du contrat;
- `docs/prd/decisionops-operating-loop-spec.md` pour les surfaces UX et les etats runtime;
- `docs/prd/build-release-sre-readiness-spec.md` pour la readiness merge/release/SRE.

Il fixe le contrat de build du noyau encore ouvert:

- `DecisionGraph` semantique versionne;
- API de requete semantique stable;
- runtime de generation scenario persistant et explicable;
- compatibilite `graph <-> contract <-> events <-> modele/solver/policy`;
- preuves de regression et de compatibilite.

## Pourquoi ce document existe

Le repo dispose deja:

- d'un modele canonique et de surfaces typees de compatibilite;
- d'un `DecisionContract` gouverne avec versioning et lifecycle;
- de lectures runtime Coverage persistantes pour `live scenarios` et `decision workspace`.

Le principal gap restant n'est plus de "nommer" le graph ou le scenario.
Le gap est de rendre impossible qu'une recommendation:

- repose sur un graph implicite seulement en code;
- change de sens sans version explicite;
- soit generee par un runtime non persistent ou non explicable;
- derive silencieusement entre UI, ROI, support et moteurs.

## Sources de verite

- `docs/prd/Praedixa_PRD_DecisionOps_PRD_final.md`
- `docs/prd/TODO.md`
- `docs/prd/coverage-v1-thin-slice-spec.md`
- `docs/prd/decision-contract-governed-publish-spec.md`
- `docs/prd/decisionops-operating-loop-spec.md`
- `docs/prd/decisionops-v1-execution-backbone.md`
- `docs/prd/matrice-verification-parcours-confiance.md`

## Resultat attendu

Le noyau `graph + scenario` est credible quand le produit sait:

1. relier les objets metier harmonises a une semantique stable;
2. expliquer quelle version du graph et du contrat a servi a chaque run;
3. generer un run persistant plutot qu'un faux succes ou un fail-close opaque;
4. exposer baseline, alternatives, contraintes liantes, confiance et etats degrades;
5. propager les memes identifiants et les memes verites vers UI, approval, action, ledger et support.

## Frontieres de responsabilite

| Couche             | Role                                                                                    | Ce qu'elle ne doit pas absorber                                                  |
| ------------------ | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Modele canonique   | Harmoniser les objets metier et les mesures brutes utiles                               | Les regles d'arbitrage pack-specific et la logique solver                        |
| `DecisionGraph`    | Exposer entites, relations, metriques derivees, lineage et dependances pour la decision | Les seuils d'approbation, la formule ROI ou les permissions de write-back        |
| `DecisionContract` | Gouverner objectif, contraintes, policies, approvals, actions et formule ROI            | Les snapshots source, le lineage detaille du graph ou la sortie brute du solveur |
| Event schemas      | Standardiser les evenements qui relient runtime, support, observabilite et ledger       | Les API de lecture synchrones ou les decisions de rendu UI                       |
| Scenario runtime   | Produire et persister les recommandations a partir du contrat, du graph et du contexte  | Les policies globales dupliquees dans l'ecran ou une logique graph implicite     |

Le produit ne doit pas confondre:

- un dataset harmonise avec une entite semantique;
- une compatibilite de schema avec une compatibilite de decision;
- une lecture live persistante avec un runtime de generation complet;
- un score solver avec une explication lisible par un operator.

## Versioning transverse obligatoire

Toute recommendation gouvernee doit etre relisible avec les versions suivantes:

| Cle                    | Role                                                   |
| ---------------------- | ------------------------------------------------------ |
| `graph_version`        | version de la semantique et des projections consommees |
| `contract_version`     | version publiee du `DecisionContract`                  |
| `event_schema_version` | version des evenements emis et consommes autour du run |
| `model_version`        | version du modele predictif ou du pipeline de features |
| `solver_version`       | version du solveur ou de l'heuristique                 |
| `policy_version`       | version de la policy globale qui borne la decision     |
| `run_id`               | identifiant du run scenario persistant                 |
| `request_id`           | identifiant de correlation inter-services              |

## Regles de compatibilite

- un `contract_version` publie ne peut etre execute que contre un `graph_version` explicitement compatible;
- un `graph_version` ne peut pas etre active silencieusement si la resolution d'entites ou le calcul de metriques change;
- un `solver_version` ou `model_version` ne peut pas remplacer un precedent sans laisser une trace comparable dans les runs;
- un `policy_version` global doit etre resolu au runtime, pas recopie ecran par ecran;
- un `event_schema_version` incompatible doit casser les validateurs de contrat ou de runtime avant merge.

## DecisionGraph canonique V1

### Ce que le graph doit representer

Le `DecisionGraph` doit exposer au minimum:

- les entites operables du scope courant;
- les relations utiles a la decision;
- les metriques derivees qui alimentent scenario, UI, ROI et support;
- le lineage des calculs et des dependances;
- les granularites `organization`, `workspace`, `site`, `team`, `time bucket`.

Le graph V1 ne demande pas une base graphe dediee.
Il demande une semantique versionnee, requetable et relisible.

### Requetes minimales a supporter

| Famille de requete        | Usage                                                                      |
| ------------------------- | -------------------------------------------------------------------------- |
| `graph/read-model`        | alimenter les vues de contexte et les cartes de diagnostic                 |
| `graph/lineage`           | expliquer d'ou vient une metrique ou une contrainte                        |
| `graph/impact-analysis`   | evaluer ce que change une mutation de mapping, policy ou contrat           |
| `graph/entity-resolution` | resoudre explicitement les entites canoniques sans heuristique silencieuse |
| `graph/scenario-context`  | fournir au runtime les objets et mesures necessaires au calcul             |
| `graph/roi-context`       | fournir au ledger et au cockpit ROI la meme semantique source              |

### Entity resolution controlee

L'entity resolution doit:

- etre versionnee;
- etre explicite sur ses regles de matching;
- produire un resultat contestable et relisible;
- refuser les overlaps ambigus plutot que d'inventer un rattachement.

Un changement de resolution d'entite doit pouvoir:

- etre compare avant publication;
- montrer les objets impacts;
- invalider les verdicts de compatibilite ou les runs si necessaire.

### Impact analysis minimum

Un impact analysis credible doit montrer:

- les contrats touches;
- les metriques ou features impactees;
- les vues UI ou exports potentiellement modifies;
- les evenements transverses qui changent de sens;
- les jeux de regression a rejouer.

## Runtime scenario persistant

### Regle de cadrage

Le produit ne peut plus rester a l'etat:

- lecture live persistante d'un cote;
- `POST /api/v1/scenarios/generate/:alertId` fail-close de l'autre.

Le runtime cible doit produire un `run_id` persistant, versionne et relisible.

### Lifecycle canonique

| Etat        | Ce qui doit etre vrai                                        |
| ----------- | ------------------------------------------------------------ |
| `requested` | le run est cree avec ses versions et son scope               |
| `queued`    | le travail attend une execution                              |
| `running`   | le moteur calcule baseline et alternatives                   |
| `completed` | les options persistentes sont disponibles et lisibles        |
| `failed`    | le run echoue avec motif explicite et trace relisible        |
| `timed_out` | le budget temps est depasse avec motif et fallback explicite |
| `canceled`  | le run est interrompu intentionnellement et auditable        |

Les modalites runtime obligatoires sont:

- `no-feasible-solution`;
- `degraded`;
- `fallback-used`;
- `shadow-mode`.

Ces modalites ne remplacent pas le status du run.
Elles le qualifient.

### Entrees minimum d'un run

Chaque run doit persister:

- `run_id`;
- `contract_id`;
- `contract_version`;
- `graph_version`;
- `model_version`;
- `solver_version`;
- `policy_version`;
- `request_id`;
- la fenetre de donnees et l'horizon utilises;
- le statut de confiance dataset au moment du calcul.

### Sorties minimum d'un run

Chaque run doit produire de facon stable:

- une baseline;
- 2 a 5 alternatives quand elles existent;
- une meilleure option;
- les contraintes liantes;
- la raison d'absence de solution si applicable;
- les top drivers;
- la confiance et la fraicheur;
- le couple `model/solver/policy` effectivement utilise.

## Solver adapters et reutilisation pack

Coverage, Flow et Allocation doivent partager:

- le meme contrat de run;
- les memes IDs et versions;
- les memes etats runtime;
- les memes surfaces d'explicabilite.

Ils ne doivent pas etre forces:

- dans le meme solveur;
- dans la meme heuristique de fallback;
- dans la meme granularite de contraintes.

Chaque adapter doit declarer:

- les inputs obligatoires;
- les contraintes supportees;
- les etats de degradation possibles;
- les temps/budgets cibles;
- les sorties explicables promises.

## Explicabilite minimum obligatoire

La vue compare ne doit jamais afficher une recommendation sans:

- baseline vs alternatives vs meilleure option;
- top drivers;
- contraintes liantes;
- raisons du rejet des autres options;
- horizon et fraicheur;
- niveau de confiance;
- versions `contract/graph/model/solver/policy`.

Les etats degrades doivent etre lisibles:

- `no-feasible-solution` explique ce qui bloque;
- `degraded` explique ce qui manque ou ce qui a ete simplifie;
- `fallback-used` explique quelle heuristique a remplace le chemin nominal;
- `shadow-mode` explique que rien n'est encore actionne en production.

## Policy hooks globaux relies au contrat

Le runtime ne doit pas repliquer des politiques dans chaque surface.
Les `policy hooks` globaux doivent etre resolus a partir du contrat et evaluer au minimum:

- freshness minimale;
- contraintes de risque ou de cout;
- destinations write-back permises;
- modes `shadow`, `read-only`, `blocked`, `sandbox-only`;
- conditions d'approbation ou de blocage.

Une policy globale non resolue doit bloquer:

- la generation de run si elle conditionne la validite du calcul;
- la presentation d'une recommendation comme "actionnable";
- la transition vers approval ou dispatch.

## Surfaces produit a aligner

| Surface          | Ce qu'elle doit lire depuis ce noyau                                  |
| ---------------- | --------------------------------------------------------------------- |
| Signal inbox     | `run_id`, confiance, horizon, fraicheur, severite                     |
| Scenario compare | baseline, alternatives, drivers, contraintes, versions                |
| Graph explorer   | entites, relations, lineage, impact analysis                          |
| Approval inbox   | `contract_version`, risque, justification attendue, modalite degradee |
| Action detail    | payload derive du contrat et du run, pas d'invention locale           |
| Ledger detail    | meme `run_id`, meme `contract_version`, meme semantique source        |
| Support tooling  | corriger et relire un incident avec les memes IDs et versions         |

## Merge evidence minimale

- tests de compatibilite `graph_version <-> contract_version <-> event_schema_version`;
- tests de compatibilite `model/solver/policy` contre les contracts publies;
- golden datasets de regression scenario par pack prioritaire;
- tests sur les etats `no-feasible-solution`, `degraded`, `fallback-used`, `shadow-mode`;
- tests de requete semantique pour UI, ROI et debug;
- E2E minimum sur `auth -> signal -> compare`.

## Release evidence minimale

- smoke du runtime de generation persistant ou de son chemin pilote equivalent;
- traces corrigeables via `request_id`, `run_id`, `contract_version`, `graph_version`;
- dashboards sur latence scenario, taux de fallback, no-feasible-solution et drift;
- preuve qu'un changement de graph, policy ou solveur peut etre relu apres coup.

## Interpretation du TODO.md a travers ce spec

| Section du `TODO.md`            | Fermeture apportee                                                                                             |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 5. Decision Contracts / Graph   | `DecisionGraph` versionne, semantic query API, policy hooks globaux, impact analysis, compatibilite transverse |
| 6. Signal engine / optimisation | runtime de generation persistant, solver adapters, etats degrades, explicabilite, golden datasets              |
| 9. UX operationnelle            | compare view et graph explorer lisibles sans logique divergente par surface                                    |
| 12. Observabilite               | propagation explicite de `request_id`, `run_id`, `contract_version`, `graph_version`                           |

## Ordre de fermeture recommande

1. figer la semantique `DecisionGraph` et son versioning;
2. exposer l'API de requete stable pour UI, scenario et ROI;
3. remplacer le fail-close de generation par un runtime persistant;
4. imposer l'explicabilite minimale et les etats degrades;
5. ajouter golden datasets, compatibilite transverse et preuves E2E compare.

## Decision de cadrage

Tant que ce spec n'est pas vrai, Praedixa sait decrire une categorie DecisionOps credible, mais ne ferme pas encore le noyau qui rend ses recommandations versionnees, explicables, rejouables et comparables dans le temps.
