# Coverage V1 Thin Slice Spec

## Role de ce document

Ce document ajoute la couche qui manquait entre:

- le PRD cible dans `docs/prd/Praedixa_PRD_DecisionOps_PRD_final.md`;
- l'ordre d'execution dans `docs/prd/decisionops-v1-execution-backbone.md`;
- la preuve merge/release dans `docs/prd/matrice-verification-parcours-confiance.md`;
- la checklist structurelle dans `docs/prd/TODO.md`.

Il decrit la tranche canonique V1 a fermer pour que Praedixa soit credible sur le pack Coverage.
Cette tranche n'est pas "une demo Coverage".
Elle sert de colonne vertebrale reusable pour Flow, puis Allocation.

## Questions auxquelles ce document doit repondre

- Quelle est la plus petite boucle produit complete qui rend la categorie DecisionOps tangible ?
- Quels objets, etats, ecrans, routes et preuves doivent exister ensemble pour que Coverage soit defendable ?
- Quels chantiers ouverts du `TODO.md` doivent etre interpretes comme un seul systeme plutot que comme une suite de tickets isoles ?

## Sources de verite

- `docs/prd/Praedixa_PRD_DecisionOps_PRD_final.md`
- `docs/prd/decisionops-v1-execution-backbone.md`
- `docs/prd/matrice-verification-parcours-confiance.md`
- `docs/prd/TODO.md`

## Definition de la tranche canonique Coverage V1

Coverage V1 est fermee quand un compte pilote peut:

1. brancher ses sources coverage critiques sans intervention dev;
2. publier un `DecisionContract` Coverage versionne;
3. recevoir un signal coverage exploitable avec fraicheur et confiance explicites;
4. comparer baseline, alternatives et meilleure option avec contraintes lisibles;
5. demander ou donner l'approbation selon une matrice gouvernee;
6. previsualiser puis dispatcher une action write-back autorisee;
7. relire la decision dans un ledger `baseline / recommended / actual`;
8. tenir une revue mensuelle Ops + Finance sans extraction artisanale.

Si un de ces maillons manque, la boucle n'est pas V1 complete.

## Non-objectifs de cette tranche

- couvrir tous les cas metier Coverage des la premiere release;
- automatiser sans approbation des decisions humaines sensibles;
- fermer Allocation ou les raffinements semantiques complets du `DecisionGraph`;
- construire une UX "universelle" avant d'avoir prouve la boucle cible.

## Acteurs et responsabilites

| Acteur              | Role dans la tranche                                       | Sortie attendue                              |
| ------------------- | ---------------------------------------------------------- | -------------------------------------------- |
| Admin client        | branche les sources, configure les policies, suit la sante | connecteurs activables, policies applicables |
| Designer de contrat | adapte un template Coverage, teste, publie                 | `DecisionContract` versionne et publiable    |
| Operateur           | lit les signaux, compare les options, demande l'action     | scenario choisi ou demande d'approbation     |
| Approver            | valide ou rejette avec justification                       | decision gouvernee et auditee                |
| Systeme Praedixa    | calcule, orchestre, journalise, degrade proprement         | action fiable, ledger lisible                |
| Finance / COO       | relit la valeur et les ecarts                              | revue mensuelle defendable                   |

## Objets canoniques et IDs a propager

| Objet            | Etat minimal requis                                                        | ID cle                           |
| ---------------- | -------------------------------------------------------------------------- | -------------------------------- |
| Connector        | `draft -> auth_pending -> syncing -> healthy/degraded/failed/paused`       | `connector_run_id`               |
| Dataset health   | severite + freshness + lineage + volume + error-rate                       | `run_id`                         |
| DecisionContract | `draft -> testing -> approved -> published -> archived`                    | `contract_version`               |
| ScenarioRun      | `queued -> running -> completed/failed/timed_out/expired`                  | `run_id`                         |
| Approval         | `requested -> approved/rejected/canceled`                                  | `request_id`                     |
| ActionDispatch   | `dry-run -> pending -> dispatched -> acknowledged/failed/retried/canceled` | `action_id`                      |
| LedgerEntry      | `open -> measuring -> closed/recalculated/disputed`                        | `action_id` + `contract_version` |

Les IDs `request_id`, `run_id`, `contract_version`, `connector_run_id` et `action_id` doivent traverser logs, UI, jobs, mutations et preuves.

## Boucle Coverage V1 de bout en bout

### Etape 0 - Setup de confiance

Avant tout calcul Coverage, le tenant, l'auth, le RBAC, l'audit, les secrets et la separation des environnements doivent deja etre fermes.
La tranche Coverage n'est pas autorisee a introduire un mode demo implicite pour rendre un ecran "plus pratique".

Condition d'entree:

- acces admin et webapp sans fallback auth/data;
- same-origin ferme sur les routes JSON sensibles;
- audit append-only sur contrats, approbations, actions et elevations;
- secret management et restauration documentes.

### Etape 1 - Activation connecteur self-service

Un admin ouvre le wizard connecteur, choisit la source Coverage cible, configure l'auth, teste la connexion et obtient un verdict de readiness.
Le systeme doit repondre avec un vrai etat d'activation, pas avec une simulation optimiste.

Must:

- creation d'une connexion draft editable;
- verdict `activation_readiness` sur config, credentials, authorization et probe target;
- test de connexion observable et audite;
- full sync initiale vers Bronze avec statut lisible;
- echec explicite si host, secret, auth ou scope ne sont pas valides.

### Etape 2 - Mapping et dataset trust

Une fois la source activee, l'admin ou le designer doit pouvoir publier un mapping exploitable et comprendre pourquoi un dataset n'est pas encore apte a alimenter Coverage.

Must:

- mapping studio avec preview stable et validation humaine;
- quarantaine des records invalides avec motif, compteur et relance;
- replay/backfill par connecteur sans reconstruction manuelle;
- surface unique de dataset health pour freshness, lineage, volume, erreur et dernier succes.

Fail-close:

- aucun `mock_*` ou alias legacy n'est canonicalise silencieusement;
- un dataset stale ou casse degrade explicitement les surfaces aval;
- aucune recommendation Coverage n'est presentee comme fiable si le dataset trust n'est pas vert.

### Etape 3 - Publication d'un Decision Contract Coverage

Le premier objet logiciel central n'est pas l'ecran Scenario.
C'est le `DecisionContract`.
Le template Coverage doit pouvoir etre instancie, teste, approuve et publie avec une gouvernance visible.

Must:

- template Coverage comme point de depart, pas un contrat ecrit from scratch;
- metadata, scope, objective, decision variables, hard constraints, soft constraints, approvals, actions et ROI formula;
- cycle de vie `draft -> testing -> approved -> published -> archived`;
- auteur, raison du changement, version, rollback et audit append-only;
- hooks de policy globaux relies au contrat plutot qu'aux pages individuelles.

Sortie attendue:

- une version publiee, queryable, reliee a ses policies et a ses permissions de write-back.

### Etape 4 - Signal coverage exploitable

Le signal doit etre consomme comme un declencheur de contrat, pas comme une simple alerte statistique.

Must:

- horizon explicite;
- confiance visible;
- freshness du dataset source;
- version modele/policy associee;
- etat degrade si anomaly, drift, no-data ou stale data.

L'operateur doit comprendre en un ecran:

- pourquoi maintenant;
- quelle population ou quel site est touche;
- quel niveau d'urgence est estime;
- si le contrat peut etre execute ou s'il reste bloque par la confiance data.

### Etape 5 - Scenario compare et explicabilite minimum

Coverage V1 n'est pas "une recommandation unique".
L'interface doit comparer baseline, alternatives et meilleure option avec les raisons qui comptent pour l'operateur.

Must:

- baseline + 2 a 5 alternatives viables si le solveur trouve des solutions;
- etat `no-feasible-solution` avec contraintes bloquantes quand aucune solution n'existe;
- comparaison lisible cout/service/risque;
- contraintes liantes et top drivers exposes;
- version du couple modele/solver/policy partout ou la recommendation apparait;
- what-if tracable ou, a minima, futur emplacement explicite dans le design.

Fail-close:

- pas de faux "best option" si le runtime n'est pas persistant;
- pas de masquage des etats `degraded`, `fallback-used` ou `shadow-mode`.

### Etape 6 - Approbation gouvernee

L'operateur doit soit agir directement si le contrat et le risque l'autorisent, soit demander l'approbation adequate.
La question n'est pas seulement "qui clique approve ?".
La question est "quelle autorite produit et operationnelle valide quoi, dans quel contexte, et avec quelle trace ?".

Must:

- matrice d'approbation configurable par contrat, perimetre, cout, risque et type d'action;
- justification structuree pour approve, reject et override;
- separation des roles pour publication de contrats et approbations critiques;
- file d'approbation lisible avec impact attendu, payload final et urgence;
- refus explicite si role, scope ou separation des taches ne sont pas respectes.

Sortie attendue:

- une decision d'approbation auditee, reliee au `ScenarioRun`, au `DecisionContract` et au futur `ActionDispatch`.

### Etape 7 - Dry-run, dispatch et feedback loop

Praedixa change de categorie au moment ou la recommandation approuvee devient une action cible fiable.
Le dry-run doit montrer exactement ce qui sera envoye.
Le dispatch doit etre idempotent et observable.

Must:

- catalogue de templates d'action versionnes par destination;
- previsualisation du payload final avant envoi;
- permissions de write-back par contrat et destination;
- lifecycle `dry-run -> dispatched -> acknowledged/failed/retried/canceled`;
- idempotence end-to-end et prevention des doublons;
- fallback humain explicite en cas d'echec de write-back;
- sandbox ou mode test pour les destinations sensibles quand la destination le requiert.

Fail-close:

- une destination non autorisee ne passe pas en dry-run vert;
- un retry ne peut pas creer un doublon silencieux;
- un echec de write-back ne clot pas artificiellement la recommendation comme "done".

### Etape 8 - Decision Ledger et revue mensuelle

Le ledger n'est pas un export post-hoc.
Il est la preuve economique et operationnelle de la boucle DecisionOps.

Must:

- une entree par decision significative;
- distinction `baseline`, `recommended`, `actual`;
- methode contrefactuelle explicite;
- statut finance `estimated`, `validated` ou `contested`;
- recalcul versionne quand les donnees reelles arrivent plus tard;
- drill-down depuis le KPI consolide vers les decisions sous-jacentes;
- exports mensuels CSV/PDF/JSON utilisables en revue.

Le produit doit distinguer clairement:

- `cannot_prove_yet`;
- ROI estime;
- ROI valide;
- ROI conteste.

## Surfaces minimum a rendre coherentes

| Surface                                                | Role minimum dans la tranche                        |
| ------------------------------------------------------ | --------------------------------------------------- |
| `app-admin` Sources & Connectors                       | creation, readiness, test, sync, replay, health     |
| `app-admin` Mapping Studio                             | preview, validation, quarantaine, publication       |
| `app-admin` Contract Library / Builder                 | template Coverage, lifecycle, policies, versioning  |
| `app-webapp` Signal Inbox                              | priorisation, fraicheur, confiance, etats degrades  |
| `app-webapp` Scenario Compare                          | baseline, alternatives, contraintes, action preview |
| `app-admin` / `app-webapp` Approval Inbox              | approbation gouvernee et justification              |
| `app-admin` Action Center                              | payload final, timeline, retry, fallback            |
| `app-admin` / `app-webapp` Ledger Detail + ROI Cockpit | preuve decision par decision et vue mensuelle       |

## Etats degrades obligatoires

Les ecrans de la tranche Coverage V1 doivent tous traiter explicitement:

- no data;
- data stale;
- no feasible solution;
- fallback used;
- dispatch failed;
- cannot prove yet.

Une page vide, un score ambigu ou un faux succes n'est jamais un etat acceptable.

## Regles de preuve pour dire que la tranche est fermee

### Merge evidence

- schemas partages, contrats et routes alignes;
- tests unitaires sur lifecycle states, policies, idempotence et mapping;
- tests d'integration sur connecteurs, scenarios, approbations, dispatch et ledger;
- E2E sur le parcours `auth -> signal -> compare -> approve -> dispatch -> ledger`;
- assertions de fail-close sur auth, tenant, scope, dataset trust et write-back permissions.

### Release evidence

- smoke sur activation connecteur, lecture dataset health, scenario compare, approval et ledger detail;
- observabilite avec IDs metier propages;
- dashboards et alertes pour freshness, latence scenario, echec dispatch et fermeture ledger;
- revue mensuelle prouvable avec export et drill-down.

## Interpretation du TODO.md a travers cette tranche

| Section du `TODO.md`                       | Ce que la tranche Coverage V1 force a fermer                                          |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| 3. Control plane                           | plus aucun chemin auth/data demo implicite sur admin, webapp ou approbations          |
| 4. Data plane                              | activation self-service, mapping, quarantaine, replay/backfill, dataset health unique |
| 5. Contracts & Graph                       | contrat Coverage versionne, policies centralisees, compatibilite contrat/runtime      |
| 6. Signal engine                           | runtime scenario persistant, explicable et versionne                                  |
| 7. Approval & Action Mesh                  | matrice d'approbation, dry-run, idempotence, fallback humain, write-back permissions  |
| 8. Ledger & ROI                            | ledger finance-grade avec contrefactuel, statuts finance et exports mensuels          |
| 9. UX operationnelle                       | surfaces admin/web coherentes, etats degrades partages, parcours critique testable    |
| 10 a 12. Qualite / release / observabilite | preuve merge/release, propagation des IDs et operabilite sans SSH artisanal           |

## Reuse attendu pour Flow

Flow ne doit pas redefinir une autre boucle de confiance.
Il doit reemployer:

- le lifecycle de `DecisionContract`;
- la matrice d'approbation;
- le lifecycle `ActionDispatch`;
- le `Decision Ledger`;
- les regles de preuve merge/release;
- les etats degrades standardises.

Flow ajoute surtout:

- un autre vocabulaire metier;
- d'autres types de contraintes et de solveurs;
- d'autres destinations write-back.

## Decision de cadrage

Tant que cette tranche Coverage V1 n'est pas fermee, le repo ne doit pas se raconter qu'il construit "trois packs".
Il construit encore la boucle canonique unique qui permettra ensuite aux packs de se multiplier sans reintroduire des fondations divergentes.
