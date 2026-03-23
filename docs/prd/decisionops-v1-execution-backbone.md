# DecisionOps V1 Execution Backbone

## Role de ce document

Ce document sert de pont entre le PRD cible et la checklist `TODO.md`.
Il ne remplace ni la vision produit, ni la preuve runtime.
Il fixe l'epine dorsale de build V1 a fermer avant d'ouvrir de nouveaux chantiers transverses.

Sources de verite amont:

- `docs/prd/Praedixa_PRD_DecisionOps_PRD_final.md`
- `docs/prd/TODO.md`
- `docs/architecture/ownership-matrix.md`
- `docs/governance/adding-features-without-breaking-the-socle.md`
- `docs/runbooks/remote-ci-governance.md`

## Tranche canonique V1

La V1 credible n'est pas "une collection de modules".
La tranche minimale a fermer pour Coverage est la suivante:

| Etape                       | Ce qui doit etre vrai                                                                                                                        | Preuve attendue                                                                                               |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1. Trust skeleton           | Le tenant, l'auth, le RBAC, l'audit, les secrets et les routes admin sensibles sont fermes sans fallback implicite.                          | Les chemins demo/legacy critiques sont supprimes ou fail-close; les invariants auth/tenant/audit sont testes. |
| 2. Connector activation     | Un admin peut brancher un connecteur standard, obtenir un verdict de readiness, tester l'acces et activer la sync sans intervention dev.     | Surface admin + API + runtime connecteur + certification minimale alignes.                                    |
| 3. Mapping et dataset trust | Les champs critiques sont mappes, les records invalides sont quarantaines, le replay/backfill est operable et la freshness est lisible.      | Mapping studio operable, dataset health unique, preuves de replay/backfill et de quarantaine.                 |
| 4. Contract publish         | Un template Coverage devient un `DecisionContract` versionne avec cycle `draft -> testing -> approved -> published -> archived`.             | Contract object versionne, backtest avant publish, rollback et audit lisibles.                                |
| 5. Scenario compare         | Un operator voit baseline, alternatives, contraintes liantes, confiance, etat degrade et motif d'absence de solution.                        | Runtime scenario persistant, versionne et explicable.                                                         |
| 6. Approval                 | L'approbation applique une matrice gouvernee, une justification structuree et une separation des roles.                                      | Approval inbox + policies + audit append-only coherents.                                                      |
| 7. Dispatch                 | L'action approuvee passe par `dry-run -> dispatch -> acknowledged/failed/retried/canceled` avec idempotence, permissions et fallback humain. | Action Mesh persistant, sandboxable, observable et sans doublon silencieux.                                   |
| 8. Ledger & ROI             | La decision aboutit a une entree `baseline / recommended / actual` avec methode contrefactuelle, statut finance et recalcul.                 | Ledger detail, exports mensuels, preuve ROI decision par decision.                                            |
| 9. Monthly review           | Ops, produit et finance lisent la meme verite lors de la revue mensuelle.                                                                    | Cockpit ROI, drill-down, exports et definitions de statut alignes.                                            |

Si cette tranche n'est pas fermee, Praedixa reste une base prometteuse, pas encore une boucle DecisionOps V1 complete.

## Regles de sequencement

- Fermer la confiance avant le write-back: pas d'Action Mesh "utile" si auth, RBAC, audit, restore et release restent implicites.
- Fermer la confiance data avant le graphe semantique: pas de `DecisionGraph` credible si le mapping, la quarantaine et la freshness ne sont pas pilotables.
- Faire du contrat l'objet logiciel central: le `DecisionContract` doit preceder les raffinements UX et les variantes pack-specific.
- Fermer la boucle `signal -> approve -> dispatch -> ledger` avant l'expansion pack: Coverage doit etre defendable avant de disperser l'equipe sur Flow/Allocation.
- Prouver les parcours critiques par couches: unit, integration, securite, E2E, smoke, observabilite et gate release.

## Gates d'execution

### Gate A - Trust Gate

Aucune action write-back ni publication de contrat critique ne doit dependre d'un mode demo, d'un fallback legacy, d'une auth partielle ou d'un audit incomplet.

Gate A est verte quand:

- les sections 1 et 3 du `TODO.md` ne laissent plus de chemin critique demo/legacy implicite;
- l'audit append-only couvre au minimum contrats, approbations, actions et elevations de privilege;
- la CI distante est effectivement bloquante au merge;
- la release, le rollback et la restauration ne dependent plus d'une connaissance orale.

### Gate B - Dataset Trust Gate

Le produit ne peut pas promettre un design partner "branchable" tant que l'onboarding connecteur, le mapping, la quarantaine, le replay/backfill et la surface unique de dataset health ne sont pas operables.

Gate B est verte quand:

- un connecteur standard peut etre active sans projet artisanal;
- le dataset health expose freshness, lineage, volume, error-rate et last success;
- les jeux de donnees invalides sont quarantaines et relancables;
- les proofs de sync, replay et backfill existent au niveau integration, smoke et observabilite.

### Gate C - Governed Publish & Dispatch Gate

Praedixa ne ferme pas sa categorie DecisionOps tant que publier un contrat, approuver une recommandation et dispatcher une action ne sont pas gouvernes de bout en bout.

Gate C est verte quand:

- le `DecisionContract` a un lifecycle complet et audite;
- le scenario runtime est persistant, explicable et versionne;
- l'approbation applique une matrice configurable et tracee;
- le dispatch garantit idempotence, permissions, fallback humain et etats stables.

### Gate D - Recovery & Proof Gate

Une V1 pilote n'est pas "build-ready" si elle n'est pas testable, releasable, corrigeable et prouvable.

Gate D est verte quand:

- les parcours critiques ont une matrice de preuve merge/release;
- les IDs metier (`request_id`, `run_id`, `contract_version`, `connector_run_id`, `action_id`) sont propages de bout en bout;
- les synthetics, alertes, dashboards, runbooks, restore proofs et budgets perf/cout sont actifs;
- le `TODO.md` section 15 peut etre execute sans hypothese implicite.

## Streams et workstreams prioritaires

### W1 - Nettoyage target state et confiance de base

- Objectif: supprimer les branches legacy/demo/fallback qui brouillent le contrat cible et fermer les acces privilegies implicites.
- Owner principal: `Platform TS`
- Co-review minimum: `Security review`, `Architecture tournante`
- Dependances: aucune
- TODO principal: sections 1, 3, 14, 15
- Story slices:
  - inventorier les branches demo/legacy encore vivantes sur les chemins critiques;
  - supprimer ou isoler les chemins qui ne font pas partie du contrat cible;
  - documenter explicitement les rares transitoires encore acceptes;
  - fermer les definitions of done "no privileged or cross-tenant assumption".
- Acceptance pattern:
  - happy path sans donnee demo;
  - negative path explicite si config ou auth manque;
  - aucune route sensible ne "sauve" une experience en inventant un resultat.
- Exit evidence:
  - doc a jour;
  - tests de securite/tenant;
  - invariants ou assertions equivalentes;
  - plus aucun chemin critique reposant sur un mode demo non voulu.

### W2 - Merge authority et gouvernance de release

- Objectif: rendre la qualite distante reelle, bloquante et coherente avec les gates locaux.
- Owner principal: `Infra/DevOps`
- Co-review minimum: `Platform TS`, `Security review`
- Dependances: W1
- TODO principal: sections 10, 11, 12, 13, 15
- Story slices:
  - finaliser la branch protection autour de `Autorite - Required`, review obligatoire et `enforce_admins = true`;
  - ajouter les suites de charge/regression scenario-action-ledger dans le pipeline officiel;
  - fermer bootstrap, rollback, migration, backup/restore et provenance;
  - versionner la preuve SRE minimale: synthetics, alertes, dashboards, severity matrix.
- Acceptance pattern:
  - chaque changement sait ce qui bloque le merge et ce qui bloque la release;
  - la release suit un chemin unique versionne;
  - le rollback et la restauration sont testes, pas seulement documentes.
- Exit evidence:
  - branch protection active;
  - runbooks executes;
  - smoke post-deploy vert;
  - restore evidence et budgets perf/cout valides.

### W3 - Onboarding connecteur operable

- Objectif: permettre l'activation d'un connecteur standard sans intervention dev.
- Owner principal: `Integrations`
- Co-review minimum: `Platform TS`, `Data platform`
- Dependances: Gate A
- TODO principal: section 4
- Story slices:
  - creation/edit/pause d'une connexion dans l'admin;
  - verdict de readiness stable (`config`, credentials, authorization, probe target);
  - connection test realiste et expose;
  - certification minimale pour les connecteurs standards du wedge V1.
- Acceptance pattern:
  - happy path d'activation self-service;
  - fail-close si permission, secret ou readiness est incomplet;
  - audit des tests de connexion et des activations.
- Exit evidence:
  - surface admin operable;
  - tests de certification;
  - smoke d'activation;
  - runbook onboarding court et repetable.

### W4 - Mapping, quarantaine et dataset health

- Objectif: rendre le chemin `raw -> harmonized -> features` pilotable et explicable.
- Owner principal: `Data platform`
- Co-review minimum: `Integrations`, `Front admin`
- Dependances: W3
- TODO principal: section 4
- Story slices:
  - mapping studio UI/API avec preview et validation humaine;
  - quarantaine des records invalides avec motif et compteur;
  - replay/backfill pilotables;
  - surface unique dataset health avec freshness, lineage, volumes et erreurs.
- Acceptance pattern:
  - une erreur de mapping degrade l'etat proprement;
  - aucune canonicalisation silencieuse de `mock_*` ou de colonnes legacy;
  - un operator sait quoi corriger et quoi relancer.
- Exit evidence:
  - tests integration medallion;
  - dataset health lisible cote admin;
  - proofs de replay/backfill;
  - `activation_readiness` et `dataset trust` relies.

### W5 - Lifecycle de contrat et bibliotheque de templates

- Objectif: faire du `DecisionContract` un objet logiciel de premier rang.
- Owner principal: `Platform TS`
- Co-review minimum: `Front produit`, `Architecture tournante`
- Dependances: W1, W4
- TODO principal: sections 2 et 5
- Story slices:
  - lifecycle `draft -> testing -> approved -> published -> archived`;
  - versioning, auteur, raison du changement, rollback et audit;
  - templates Coverage/Flow/Allocation;
  - hooks de policy relies au contrat plutot qu'aux ecrans.
- Acceptance pattern:
  - aucun contrat publie sans etape de test/backtest;
  - toute mutation laisse une trace append-only;
  - les templates pack restent gouvernes par le meme schema central.
- Exit evidence:
  - schemas partages versionnes;
  - compatibilite contrat/runtime/types;
  - surfaces admin read/write coherentes;
  - tests de lifecycle et de rollback.

### W6 - Decision Graph semantique et compatibilite transverse

- Objectif: relier canonique, graph, contrats et evenements sur une semantique stable.
- Owner principal: `Architecture tournante`
- Co-review minimum: `Platform TS`, `Data platform`
- Dependances: W4, W5
- TODO principal: sections 2 et 5
- Story slices:
  - graph versionne au-dessus du canonique et du Gold;
  - API de requete semantique stable;
  - entity resolution controlee et impact analysis;
  - tests de compatibilite graph/contract/events.
- Acceptance pattern:
  - pas de primitive `graph` implicite seulement dans le code;
  - tout changement de schema casse en CI s'il drift avec contrat ou runtime;
  - un designer/support peut debugger dependances et lineage.
- Exit evidence:
  - graph explorer credible;
  - contract-check compatibilite;
  - tests de compatibilite;
  - docs de semantique et ownership a jour.

### W7 - Scenario runtime persistant et explicable

- Objectif: remplacer le fail-close de generation scenario par un runtime V1 versionne, mesurable et comprehensible.
- Owner principal: `ML/OR Engineer`
- Co-review minimum: `Data platform`, `Front produit`
- Dependances: W5, W6
- TODO principal: section 6
- Story slices:
  - generation scenario persistante par alert/workspace;
  - solver adapters reutilisables par pack;
  - etats `no-feasible-solution`, `degraded`, `fallback-used`, `shadow-mode`;
  - baseline vs alternatives vs meilleure option, avec drivers et contraintes.
- Acceptance pattern:
  - toute recommendation affiche horizon, fraicheur, confiance et version modele/solver/policy;
  - les etats de non-solution ou de fallback sont visibles et actionnables;
  - les derives silencieuses sont surveillees par golden datasets.
- Exit evidence:
  - routes runtime branchees sur la persistance;
  - compare view exploitable;
  - monitoring modele/solver;
  - tests de regression scenario.

### W8 - Gouvernance d'approbation et fiabilite Action Mesh

- Objectif: fermer la boucle gouvernee entre publication, approbation et execution.
- Owner principal: `Backend / Workflow Engineer`
- Co-review minimum: `Security review`, `Platform TS`
- Dependances: Gate A, W5, W7
- TODO principal: section 7
- Story slices:
  - matrice d'approbation configurable par contrat, perimetre, cout, risque et destination;
  - justification structuree pour approve/reject/override;
  - separation des roles sur publications et approbations critiques;
  - lifecycle `dry-run -> dispatch -> acknowledged -> failed -> retried -> canceled`;
  - idempotence, sandbox et fallback humain explicite.
- Acceptance pattern:
  - aucun write-back sans regle d'approbation, permission explicite et audit;
  - un retry ne peut pas doubler une ecriture;
  - une destination sensible peut etre testee sans effet irreversible.
- Exit evidence:
  - approval inbox et action detail branches de bout en bout;
  - tests de mutation et d'idempotence;
  - audit append-only complet;
  - modes dry-run et fallback prouves.

### W9 - Ledger finance-grade et preuve de valeur

- Objectif: prouver la valeur decision par decision sans ambiguite entre preuve ops et verite economique.
- Owner principal: `Data platform`
- Co-review minimum: `Platform TS`, `Front produit`
- Dependances: W7, W8
- TODO principal: section 8
- Story slices:
  - entree complete par decision;
  - distinction `baseline`, `recommended`, `actual`;
  - methode contrefactuelle versionnee;
  - statut finance `estimated`, `validated`, `contested`;
  - recalcul quand les donnees reelles arrivent;
  - exports mensuels finance-grade.
- Acceptance pattern:
  - un reviewer finance comprend la source de chaque composante ROI;
  - un ROI pending est distingue d'un ROI nul;
  - les proof packs ne se substituent pas au ledger de reference.
- Exit evidence:
  - ledger detail et cockpit alignes;
  - tests de coherence ROI/ledger/proof packs/decisions;
  - exports defendables en revue mensuelle.

### W10 - Parcours de confiance et readiness Coverage/Flow

- Objectif: rendre la boucle produit lisible, testable et vendable pour Coverage GA puis Flow beta.
- Owner principal: `Front produit`
- Co-review minimum: `Front admin`, `Platform TS`, `Infra/DevOps`
- Dependances: W3 a W9
- TODO principal: sections 9, 10, 12, 13, 15
- Story slices:
  - standardiser les page models, empty states, degraded states et retries;
  - eliminer les ecrans trop coverage-specific qui bloquent Flow/Allocation;
  - ajouter les E2E du parcours `auth -> signal -> compare -> approve -> dispatch -> ledger`;
  - verifier les proofs merge/release avec la matrice de verification.
- Acceptance pattern:
  - un operator comprend l'etat du systeme sans expertise data/ML;
  - un incident, un fallback ou une absence de solution est visible sans SSH artisanal;
  - Coverage est utilisable par un design partner avant extension pack.
- Exit evidence:
  - E2E parcours de confiance;
  - smoke post-deploy;
  - synthetics critiques;
  - KPI Coverage GA et Flow beta lisibles.

## Cut line avant "build-ready"

Doivent etre fermes avant de declarer le socle DecisionOps V1 build-ready:

- W1 a W10 au niveau Coverage;
- Gate A a Gate D;
- la section 15 du `TODO.md` avec preuves repo et runbooks executables.

Peuvent attendre apres fermeture de cette epine dorsale:

- enrichissements LLM au-dela de l'assistance strictement sourcee;
- Allocation beta;
- expansions publiques larges d'API;
- marketplace exhaustive de connecteurs;
- self-service pack designer complet.

## Handoff vers backlog sprint

Chaque carte de backlog issue de ce document doit conserver:

- un objet source de verite (`connector`, `mapping`, `contract`, `scenario run`, `approval`, `action dispatch`, `ledger entry`);
- un etat metier autorise et les transitions interdites;
- un parcours happy path et un parcours fail-close;
- une preuve d'observabilite;
- une preuve merge et une preuve release.

Si une story ne sait pas dire quel gate elle ferme ou quel objet central elle renforce, elle n'est probablement pas encore assez bien cadree.
