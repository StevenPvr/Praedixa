# TODO - Monorepo Build-Ready

Objectif: fermer tous les chantiers structurels du monorepo avant de construire de nouvelles features par-dessus.

Ce document est volontairement strict:

- `- [x]` = verifie dans le repo ou dans la doc/versioning aujourd'hui
- `- [ ]` = reste a fermer avant de pouvoir considerer le monorepo "build-ready"

Definition retenue de "build-ready":

- le socle architecture, securite, scalabilite, optimisation, maintenabilite, CI/CD, exploitation et documentation est suffisamment ferme pour que les prochains travaux relevent uniquement de la livraison de features
- aucun chantier de refondation structurelle critique ne doit rester ouvert

Sources de verite utilisees pour cette checklist:

- `docs/prd/Praedixa_PRD_DecisionOps_PRD_final.md`
- `docs/prd/coverage-v1-thin-slice-spec.md`
- `docs/prd/decision-contract-governed-publish-spec.md`
- `docs/prd/decision-graph-and-scenario-runtime-spec.md`
- `docs/prd/decision-ledger-and-roi-proof-spec.md`
- `docs/prd/control-plane-trust-gate-spec.md`
- `docs/prd/ux-and-e2e-trust-paths-spec.md`
- `docs/prd/approval-and-action-mesh-governance-spec.md`
- `docs/ARCHITECTURE.md`
- `docs/DATABASE.md`
- `docs/TESTING.md`
- `docs/security/devops-audit.md`
- `docs/runbooks/`
- `scripts/README.md`
- l'etat reel des apps/packages/services du monorepo

Regle d'interpretation pour les sections encore ouvertes:

- les sections 4 a 12 qui touchent le chemin `connector -> contract -> signal -> compare -> approve -> dispatch -> ledger` doivent etre lues a travers `docs/prd/coverage-v1-thin-slice-spec.md`, qui sert de tranche canonique V1 avant l'expansion multi-pack
- la section 4 doit etre lue a travers `docs/prd/connector-activation-and-dataset-trust-spec.md`
- les sections 1 et 3, ainsi que les parties de la 12 et de la 15 qui touchent les chemins demo/legacy/fallback, l'auth/RBAC/tenant safety, l'audit append-only et les acces privilegies, doivent etre lues a travers `docs/prd/control-plane-trust-gate-spec.md`
- les sections 2, 5, 7 et 8 qui touchent le lifecycle du contrat, la publication, les policies, les permissions de write-back et la preuve ledger doivent etre lues a travers `docs/prd/decision-contract-governed-publish-spec.md`
- les sections 5 et 6, ainsi que les parties de la 9 et de la 12 qui touchent le `DecisionGraph`, la semantic query API, le runtime scenario, les etats degrades et les preuves de regression, doivent etre lues a travers `docs/prd/decision-graph-and-scenario-runtime-spec.md`
- la section 8, ainsi que les parties des sections 7, 9, 11 et 12 qui touchent le `Decision Ledger`, le ROI, les revisions, les exports mensuels et la frontiere avec les proof packs, doivent etre lues a travers `docs/prd/decision-ledger-and-roi-proof-spec.md`
- la section 9, ainsi que les parties des sections 10, 12 et 15 qui touchent les page models, les etats degrades, la neutralite multi-pack des shells et les E2E critiques, doivent etre lues a travers `docs/prd/ux-and-e2e-trust-paths-spec.md`
- la section 7, ainsi que les parties des sections 5, 8, 9 et 12 qui touchent la matrice d'approbation, la justification structuree, la SoD critique, l'idempotence, les composites et la sandbox, doivent etre lues a travers `docs/prd/approval-and-action-mesh-governance-spec.md`
- les sections 6, 7, 8, 9 et une partie de la 12 doivent etre lues a travers `docs/prd/decisionops-operating-loop-spec.md`
- les sections 10, 11, 12, 13 et 15 doivent etre lues a travers `docs/prd/build-release-sre-readiness-spec.md`

Cartographie rapide des artefacts de fermeture:

| Sections `TODO.md` | Artefact principal                                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1 et 3             | `control-plane-trust-gate-spec.md`                                                                                                  |
| 4                  | `connector-activation-and-dataset-trust-spec.md`                                                                                    |
| 5                  | `decision-contract-governed-publish-spec.md` + `decision-graph-and-scenario-runtime-spec.md`                                        |
| 6                  | `decision-graph-and-scenario-runtime-spec.md` + `decisionops-operating-loop-spec.md`                                                |
| 7                  | `approval-and-action-mesh-governance-spec.md` + `decision-contract-governed-publish-spec.md` + `decisionops-operating-loop-spec.md` |
| 8                  | `decision-ledger-and-roi-proof-spec.md` + `decisionops-operating-loop-spec.md`                                                      |
| 9                  | `ux-and-e2e-trust-paths-spec.md` + `decisionops-operating-loop-spec.md` + `coverage-v1-thin-slice-spec.md`                          |
| 10 a 13, 15        | `build-release-sre-readiness-spec.md`                                                                                               |

## 1. Architecture repo et frontieres de responsabilite

- [x] Le monorepo est deja separe entre `app-landing`, `app-webapp`, `app-admin`, `app-api-ts`, `app-api`, `app-connectors`, `packages/ui` et `packages/shared-types`
- [x] La frontiere "apps/web HTTP en TypeScript" vs "data/ML/workers en Python" est deja documentee et visible dans le repo
- [x] Les packages partages `ui` et `shared-types` existent deja
- [x] Le repo dispose deja d'une doc d'architecture, de base de donnees, de testing et de runbooks
- [x] Versionner un petit lot d'ADRs structurants pour les decisions deja prises et encore vivantes
- [x] Declarer et outiller les regles de dependances inter-apps/inter-packages pour empecher les couplages illegitimes
- [x] Supprimer les faux succes runtime les plus trompeurs de `app-api-ts` (`contact-requests`, scenarios/workspace synthétiques, `cost-params` admin, vues admin `proof-packs`) pour imposer un fail-close honnete tant que la persistance cible n'existe pas
- [ ] Supprimer, isoler ou documenter explicitement toutes les branches legacy/demo/fallback qui ne font pas partie du contrat cible
- [x] Normaliser le vocabulaire de domaine entre PRD, code, docs et APIs (`contract`, `decision`, `workspace`, `ledger`, `proof`, `scenario`, `action`)
- [x] Declarer un ownership clair par sous-systeme (webapp, admin, API TS, connectors, data/ML, infra, docs)
- [x] Outiller des garde-fous de taille/focalisation pour les fichiers et fonctions critiques du socle

**Definition of done**

- [x] Aucune frontiere critique n'est implicite ou seulement "dans la tete de l'equipe"
- [x] Un nouvel ingenieur peut comprendre ou placer une nouvelle feature sans hesiter sur le bon runtime, le bon package ou le bon point d'entree

## 2. Contrats partages, schemas et versioning d'interface

- [x] `packages/shared-types` existe deja comme source de types partages
- [x] `contracts/openapi/public.yaml` existe deja
- [x] Aligner `contracts/openapi/public.yaml` avec la surface reelle exposee par `app-api-ts`
- [x] Decider et documenter la separation entre contrat public, contrat admin et event schemas internes
- [x] Introduire un schema versionne de `DecisionContract`
- [x] Introduire un schema versionne de `DecisionGraph` / semantic query API
- [x] Introduire un schema versionne de `LedgerEntry` / ROI / counterfactual
- [x] Introduire un schema versionne des evenements transverses (`scenario.completed`, `approval.requested`, `action.failed`, `ledger.closed`, `dataset.freshness.breached`)
- [x] Ajouter des tests de compatibilite contrat <-> runtime <-> types partages
- [x] Ajouter une politique explicite de compatibilite ascendante et deprecation des payloads publics
- [x] Resserer les schemas de reponse OpenAPI encore publies avec des placeholders `additionalProperties: true`

**Definition of done**

- [ ] Aucune interface critique n'existe uniquement en code sans schema/versioning/documentation
- [ ] Toute evolution d'API ou de payload detecte automatiquement les divergences de contrat, y compris sur les schemas de reponse publies

## 3. Control plane, auth, RBAC et securite logique

- [x] L'auth OIDC existe deja pour `app-webapp` et `app-admin`
- [x] Les guards role-based existent deja cote API TS et apps Next
- [x] Le scoping tenant/site existe deja dans les couches applicatives
- [x] Le socle RLS / tenant isolation existe deja cote Python/PostgreSQL
- [x] Le runtime connecteurs applique deja des allowlists et des garde-fous sortants
- [x] Durcir et unifier les controles same-origin sur toutes les routes JSON sensibles cookie-authentifiees des apps Next
- [x] Rendre l'auth OIDC de `app-webapp` vraiment prod-ready avec origine publique explicite, aucun fallback implicite vers l'host entrant en production, fail-close et tests de regression dedies
- [x] Poser une fondation append-only typée pour l'audit DecisionOps (`contract`, `approval`, `action`, `ledger`) avec chainage et filtres déterministes
- [ ] Fermer tous les chemins auth/data encore dependants d'un mode demo non explicitement voulu en cible
- [ ] Etendre l'audit append-only aux changements de contrats, approbations, actions et elevations de privilege
- [x] Ajouter une politique explicite de break-glass admin/support avec journalisation obligatoire
- [x] Faire de la MFA admin une exigence de prod bloquante, documentee et testee
- [x] Normaliser la taxonomie des permissions et verifier qu'aucune route sensible n'echappe au meme modele
- [x] Documenter et tester la rotation des secrets applicatifs, connecteurs et release
- [x] Documenter et tester la restauration des metadonnees critiques de control plane

**Definition of done**

- [ ] Aucun acces privilegie ou cross-tenant ne repose sur une hypothese implicite
- [ ] Les controles auth/RBAC/tenant/site sont coherents, testables et audites de bout en bout

## 4. Data plane, connecteurs et qualite de donnees

- [x] Un catalogue de connecteurs standards existe deja
- [x] Le runtime connecteurs gere deja onboarding, test, sync runs, ingest credentials et raw events
- [x] Le pipeline medallion Bronze/Silver/Gold existe deja cote Python
- [x] Des surfaces admin existent deja pour datasets, ingestion, qualite et lecture Gold
- [x] Un moteur de mapping de colonnes existe deja cote Python
- [ ] Ajouter un vrai mapping studio admin UI/API avec preview, validation humaine et persistance des mappings
- [ ] Ajouter un flux de quarantaine de records invalides avec motifs, compteur et relance
- [x] Ajouter replay/backfill par connecteur sans reconstruction manuelle
- [ ] Exposer dataset freshness, lineage, volume traite, taux d'erreur et last successful run dans une surface unique
- [x] Poser une fondation typée unique pour freshness, lineage, volume, error-rate et last-success des datasets
- [x] Poser une fondation Mapping Studio typée avec preview stable, couverture et validation de publication
- [x] Poser une surface API typée pour dataset health (summary, regroupements, severite, actions recommandees)
- [x] Definir une matrice de certification des connecteurs standards (auth, sync, health, replay, raw retention, tests)
- [x] Ajouter des tests d'integration par connecteur standard avec fixtures representatives
- [x] Rejeter fail-close les datasets Bronze legacy `mock_*` et les colonnes runtime Gold `mock_*` au lieu de les canonicaliser silencieusement
- [x] Documenter la politique de separation stricte entre raw, harmonise, features, audit et config
- [ ] Valider que chaque connecteur standard peut etre active sans intervention dev sur les cas vises par le PRD

**Definition of done**

- [ ] Un nouveau design partner peut brancher ses sources standards sans projet d'integration artisanal
- [ ] La qualite et la fraicheur des donnees deviennent pilotables avant toute recommendation critique

## 5. Decision Contracts, Decision Graph et primitives produit transverses

- [x] Un moteur de `decision-config` versionne existe deja pour horizons et policies
- [x] Un moteur de scenario/recommandation existe deja pour le pack coverage
- [x] Poser des fondations typées + helpers purs pour `DecisionContract` (cycle de vie, validation, fork, rollback, audit)
- [x] Poser une primitive de domaine `DecisionContractTemplate` versionnée avec eligibility et sections pré-remplies
- [x] Poser des fondations typées + helpers purs pour `DecisionGraph` (lecture, transitions, impact analysis)
- [x] Poser une surface Contract Studio typée pour liste/detail/readiness/fork/rollback de `DecisionContract`
- [x] Poser une fondation typée de templates de contrats avec bootstrap de draft par pack
- [x] Poser une surface Graph Explorer typée pour requête, lineage, impact et debug de `DecisionGraph`
- [x] Poser une lecture de compatibilite typée entre `DecisionContract` et `DecisionGraph`
- [x] Exposer des routes admin read-only pour templates de contrats et check de compatibilite contrat/graphe
- [x] Faire de `DecisionContract` un objet logiciel de premier rang, distinct du simple `decision-config`
- [x] Definir le cycle de vie complet `draft -> testing -> approved -> published -> archived`
- [x] Ajouter versioning, auteur, motif de changement, rollback et audit pour les contrats
- [x] Ajouter des templates de contrats par pack (`Coverage`, `Flow`, `Allocation`)
- [ ] Ajouter des hooks de policy globaux relies aux contrats plutot que dupliques dans chaque surface
- [ ] Construire un vrai `DecisionGraph` semantique versionne au-dessus du canonique et du Gold
- [ ] Exposer une API stable de requete semantique pour scenarios, UI et ROI
- [ ] Ajouter entity resolution controlee et impact analysis de changement
- [ ] Ajouter un graph explorer / debug surface pour verifier dependances et metriques
- [ ] Ajouter tests de compatibilite entre version de graph, version de contrat et versions d'evenements

**Definition of done**

- [ ] Les primitives "contract", "graph", "policy" et "version" existent comme fondations stables reutilisables
- [ ] Les futures features n'ont plus besoin de reinventer leurs schemas ou leur logique de gouvernance

## 6. Signal engine, optimisation et explicabilite

- [x] Des forecasts persistants et des surfaces live/admin existent deja
- [x] Un moteur de scenarios avec Pareto frontier et recommendation policy existe deja
- [x] Des horizons actifs/configurables existent deja
- [x] Brancher `GET /api/v1/live/scenarios/alert/:alertId` et `GET /api/v1/live/decision-workspace/:alertId` sur `coverage_alerts` + `scenario_options` persistants
- [x] Retirer des routes runtime les options de scenario synthetiques qui donnaient l'illusion d'un moteur persistant deja disponible
- [x] Exiger une configuration de cout explicite pour les blueprints scenario et marquer `selection_state=no_gap` quand aucun gap n'est present
- [ ] Remplacer le fail-close de `POST /api/v1/scenarios/generate/:alertId` par un runtime de generation persistant, versionne et explicable
- [ ] Etendre le signal engine au format PRD: quantiles, exogenous features, drift, anomaly detection, lineage de features
- [ ] Ajouter les etats explicites `no-feasible-solution`, `degraded`, `fallback-used`, `shadow-mode`
- [ ] Introduire une interface de solver adapters reutilisable par pack
- [ ] Introduire un what-if interactif trace et rejouable
- [ ] Ajouter une comparaison explicite baseline vs alternatives vs meilleure option
- [ ] Versionner partout le couple modele/solver/policy ayant produit une recommendation
- [ ] Ajouter la couche minimum d'explicabilite requise (drivers, contraintes liantes, raisons du rejet d'options)
- [ ] Ajouter des golden datasets de regression pour surveiller les derives silencieuses des recommendations

**Definition of done**

- [ ] Les recommandations deviennent expliquables, versionnees, mesurables et comparables dans le temps
- [ ] Coverage et Flow peuvent partager la plateforme sans etre enfermes dans un seul solveur ad hoc

## 7. Approval workflow, Action Mesh et execution plane

- [x] La persistance des `operational_decisions` existe deja
- [x] Brancher `GET/POST /api/v1/operational-decisions` et `GET /api/v1/operational-decisions/override-stats` sur la verite persistante existante, sans payload frontend legacy
- [x] Le runtime integrations/connectors existe deja comme premier pont d'execution
- [x] Poser des fondations typées + state machines pures pour `Approval` et `ActionDispatch`
- [x] Poser une surface typée d'approval inbox avec priorisation, resume et filtres stables
- [x] Exposer une route admin read-only pour l'approval inbox avec validation stricte des filtres
- [x] Brancher `approval-inbox` sur une persistance runtime reelle (`decision_approvals`)
- [x] Exposer une route admin write pour `approvals/:approvalId/decision` avec validation stricte du body, justification et contexte acteur
- [x] Persister les decisions d'approbation avec cascade cohérente sur rejet (annulation des approbations soeurs encore ouvertes, annulation du dispatch pending, synchronisation ledger interne)
- [x] Rendre la page admin `approval inbox` actionnable avec justification inline et refresh propre apres mutation
- [ ] Introduire une matrice d'approbation configurable par contrat, perimetre, cout, risque et type d'action
- [ ] Ajouter une justification structuree pour approbations, rejets et overrides sur tout le flux, pas seulement l'inbox admin
- [ ] Imposer la separation des roles pour publication de contrats et approbations critiques
- [x] Introduire des templates d'action versionnes par destination
- [x] Exposer une route admin read-only pour le catalogue de templates d'action
- [x] Ajouter un vrai lifecycle `dry-run -> dispatch -> acknowledged -> failed -> retried -> canceled`
- [ ] Garantir l'idempotence et la prevention des doublons de bout en bout pour chaque write-back
- [x] Ajouter les permissions de write-back par contrat et par destination
- [x] Ajouter un fallback humain explicite quand l'ecriture cible echoue
- [ ] Ajouter des actions composites orchestrees pour les cas critiques
- [ ] Ajouter une sandbox ou un mode test pour les destinations sensibles
- [x] Poser une surface typée de detail d'action (timeline, retry eligibility, fallback, payload refs)
- [x] Exposer une route admin read-only pour le detail d'action avec validation stricte des params
- [x] Brancher `action-dispatch detail` sur une persistance runtime reelle (`action_dispatches`)
- [x] Initialiser le triplet `approval -> action -> ledger` dans la meme transaction que `operational_decisions`

**Definition of done**

- [ ] Une recommendation approuvee peut se transformer en action cible fiable sans bricolage manuel ou doublon silencieux
- [ ] Le systeme sait expliquer qui a valide quoi, quand, pourquoi et avec quel payload final

## 8. Ledger, ROI et mesure de valeur

- [x] Des `proof_records` et proof packs existent deja
- [x] Le repo dispose deja d'un debut de trace attendu/observe sur les decisions
- [x] Fermer les vues runtime/admin qui enrichissaient les proof packs avec des champs fabriques (`status`, `generatedAt`, `downloadUrl`) non portes par la persistance
- [x] Poser une fondation `Decision Ledger` typée avec ROI, validation status et lineage de recalcul
- [x] Poser une surface `Ledger Detail` typée pour drill-down ROI, validation finance et lineage de revision
- [x] Exposer une route admin read-only pour `Ledger Detail` avec validation stricte des params
- [x] Brancher `Ledger Detail` sur une persistance runtime reelle (`decision_ledger_entries`)
- [x] Faire echouer la preuve Gold live sans inputs BAU/optimized explicites et versionner les etats `proved` / `cannot_prove_yet`
- [ ] Promouvoir l'existant vers un vrai `Decision Ledger` avec entree complete par decision
- [x] Distinguer systematiquement `baseline`, `recommended`, `actual`
- [x] Persister la methode contrefactuelle utilisee pour chaque calcul de ROI
- [x] Ajouter un statut de validation finance (`estimated`, `validated`, `contested`)
- [x] Ajouter recalcul versionne des entries quand les donnees reelles arrivent plus tard
- [ ] Ajouter drill-down depuis les KPI consolides vers les decisions sous-jacentes
- [ ] Ajouter exports mensuels finance-grade CSV/PDF/JSON
- [ ] Ajouter tests de coherence ROI / ledger / proof packs / decisions
- [ ] Eliminer toute ambiguite entre "proof pack marketing/ops" et "ledger economique de reference"

**Definition of done**

- [ ] Le produit peut prouver le ROI decision par decision sans s'appuyer sur des logs techniques opaques
- [ ] Ops, produit et finance lisent la meme verite source

## 9. Apps Next, UX operationnelle et surfaces admin/client

- [x] `app-webapp` existe deja comme shell authentifie
- [x] `app-admin` existe deja comme shell multi-tenant super-admin
- [x] Les patterns BFF/proxy same-origin existent deja
- [x] Des pages critiques existent deja pour dashboard, previsions, actions, donnees, config et monitoring
- [x] Reconciler les inventories documentes de routes avec les routes reellement presentes dans `app-webapp` et `app-admin`
- [x] Aligner les docs runtime avec le fait que `contact-requests`, `scenarios/generate`, `cost-params` admin et `proof-packs` admin restent fail-close jusqu'a implementation persistante, tandis que `live scenarios/workspace` et `operational decisions` sont maintenant branches sur la persistance reelle
- [x] Ajouter les surfaces de socle typées pour approval inbox, ledger detail, contract studio et graph explorer
- [x] Brancher des routes admin read-only et des pages admin read-only pour `approval inbox`, `action dispatch detail` et `ledger detail`
- [x] Remplacer le fail-close de `approval inbox`, `action dispatch detail` et `ledger detail` par des sources persistantes de bout en bout
- [ ] Standardiser les patterns de fetch, page model, empty states, degraded states et retries entre webapp et admin
- [x] Verifier que toutes les pages admin sensibles ont la meme protection server-side que leur navigation UI
- [ ] Eliminer les ecrans miroirs trop specifiques coverage qui bloqueraient l'arrivee de Flow/Allocation
- [ ] Ajouter des tests E2E sur les parcours de confiance critiques (auth -> signal -> compare -> approve -> dispatch -> ledger)
- [x] Supprimer les docs de page ou inventaires qui decrivent des routes non presentes ou des comportements plus riches que l'existant

**Definition of done**

- [ ] Les shells client/admin peuvent accueillir de nouvelles features sans refonte de navigation, de permissions ou de pattern d'ecran
- [ ] Les parcours critiques de confiance sont lisibles, testables et coherents avec le PRD cible

## 10. Qualite, tests, gates et CI/CD

- [x] Le gate local exhaustif existe deja
- [x] La verification signee des rapports de gate existe deja
- [x] Les hooks `pre-commit`, `pre-push` et `commit-msg` sont deja versionnes
- [x] Une strategie de test projet existe deja
- [x] Des scripts de release/deploy et de preflight existent deja
- [x] Reactiver les workflows GitHub sur `push` / `pull_request` pour en faire une autorite distante utile
- [x] Supprimer le gap `path-scoped` des workflows requis pour que les checks distants existent sur toute PR/push gouverne
- [ ] Configurer la protection de branche / la politique plateforme pour rendre `Admin - Required` et `API - Required` effectivement bloquants au merge
- [x] Pinner les GitHub Actions par SHA
- [x] Aligner la CI distante avec le gate local sur le minimum bloquant attendu
- [x] Etendre `CI - API` a `app-connectors` et aux dependances de gouvernance effectivement consommees par les validateurs de policy
- [x] Ajouter des checks de contrat OpenAPI / types partages dans la CI distante
- [x] Ajouter des checks de dependances/architecture (`dep-cruiser`, `knip`, equivalents Python) explicitement bloquants si absents
- [ ] Ajouter des suites de charge et de regression scenario/ledger/action dans le pipeline officiel
- [x] Versionner et durcir une politique de budgets perf/scalabilite/outils sans echappatoire manuelle
- [x] Documenter la matrice unique "ce qui bloque un merge" vs "ce qui bloque une release"

**Definition of done**

- [ ] Aucun changement ne peut atteindre staging ou prod sans passer les controles distants et locaux definis
- [ ] La qualite n'est plus seulement une discipline locale, elle est enforcee de bout en bout

## 11. Infra, environnements, release et reprise

- [x] Les scripts de deploiement/release Scaleway existent deja
- [x] La landing dispose deja d'un chemin OpenNext/Cloudflare versionne
- [x] Des runbooks de go/no-go et de gate existent deja
- [x] Produire une matrice unique et a jour des variables d'environnement, secrets, owners et valeurs par environnement
- [ ] Valider un bootstrap propre et reproductible de local -> staging -> prod pour chaque service deployable
- [x] Standardiser le mode de livraison des artefacts immuables entre toutes les cibles deployables
- [x] Valider au moins une image `linux/amd64` standalone reelle pour `app-webapp`, avec smoke conteneurise sur `/login`
- [ ] Ajouter un rollback teste et documente pour chaque service deployable
- [x] Ajouter des smoke tests post-deploy pour landing, webapp, admin, API, auth et connecteurs critiques
- [ ] Documenter et tester la strategie de migration base de donnees / compat applicative
- [ ] Documenter et tester la strategie de backup/restore, avec preuve de restore reelle
- [x] Capturer une evidence supply-chain machine-readable (SBOM + scan) attachable au manifest signe et reverifiee par digest
- [ ] Ajouter une vraie provenance/attestation signee uniquement quand le repo sait la produire et la verifier de bout en bout

**Definition of done**

- [ ] Une release ou un rollback ne depend plus d'une connaissance orale du repo
- [ ] Les environnements sont predictibles, auditables et restaurables

## 12. Observabilite, supportability et SRE

- [x] Le repo expose deja des surfaces de monitoring admin
- [x] Des runbooks incident/securite existent deja
- [x] Standardiser le logging JSON structure sur Node, Python et les scripts critiques
- [x] Propager `X-Request-ID`, `traceparent` et `tracestate` entre BFF Next, API TS et runtime connecteurs
- [ ] Etendre la propagation bout-en-bout aux identifiants metier `request_id`, `run_id`, `contract_version`, `connector_run_id`, `action_id`
- [ ] Ajouter dashboards et alertes pour freshness connecteurs, latence scenario, echec dispatch, auth, drift, fermeture ledger
- [ ] Ajouter traces distribuees ou propagation explicite de contexte inter-services
- [x] Versionner une baseline machine-readable des synthetics critiques (`landing`, `webapp`, `admin`, `api`, `auth`, `connectors`)
- [ ] Ajouter du synthetic monitoring provider-backed sur landing, webapp, admin, API et auth, au-dela de la baseline JSON versionnee
- [ ] Ajouter une vraie support console least-privilege couvrant jobs, actions et erreurs par tenant
- [ ] Ajouter maintenance mode et degraded mode par tenant
- [ ] Ajouter une matrice de severite, d'escalade et de runbooks par type d'incident

**Definition of done**

- [ ] Tout incident critique est detectable, correlable et operable sans SSH artisanal ou memoire implicite
- [ ] Le support peut diagnostiquer vite sans augmenter inutilement l'exposition des donnees

## 13. Performance, scalabilite et cout

- [x] Le PRD et les docs portent deja une ambition explicite de performance et de qualite operationnelle
- [x] Transformer les cibles perf du PRD en budgets mesurables et suivis automatiquement
- [x] Definir la strategie de scalabilite horizontale pour `app-api-ts`, `app-connectors` et les workers Python
- [x] Ajouter des regles de backpressure / queueing sur sync, recompute, write-back et generation de rapports
- [x] Definir la strategie de cache et d'invalidation pour les surfaces a latence critique
- [x] Ajouter du capacity planning pour DB, object storage, compute et concurrency containers/workers
- [ ] Ajouter du cost monitoring et des alertes budget pour l'infra et les outils tiers structurants
- [ ] Profiler et durcir les requetes SQL chaudes, les index et les chemins de pagination critiques
- [ ] Verifier qu'aucune surface critique ne depend d'un full refresh ou d'une intervention operateur non budgetee

**Definition of done**

- [ ] Les limites de charge, de latence et de cout sont connues, mesurees et gardees sous controle
- [ ] Ajouter une nouvelle feature ne force pas a redecouvrir les goulots d'etranglement de base

## 14. Documentation distribuee, gouvernance et handoff

- [x] `docs/README.md` existe deja comme point d'entree principal
- [x] `docs/prd/README.md` documente maintenant les sources PRD et cette checklist
- [x] `docs/README.md` reference maintenant le dossier `prd/`
- [x] Ajouter un index d'ADRs et de decisions structurantes
- [x] Documenter une politique de feature flags, deprecation et compatibilite
- [x] Documenter l'ownership et la RACI minimum par sous-systeme
- [x] Ajouter une checklist "comment ajouter une feature sans casser le socle"
- [x] Ajouter une politique explicite de suppression des docs obsoletes et surfaces legacy
- [ ] Reviser regulierement cette checklist a chaque fermeture de chantier structurel

**Definition of done**

- [ ] La doc ne ment plus sur l'etat du socle
- [ ] Le repo peut etre repris ou etendu sans transfert oral massif

## 15. Exit gate final - monorepo build-ready

- [ ] Toutes les cases ouvertes des sections 1 a 14 sont fermees
- [ ] `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, les suites E2E utiles et les tests Python passent depuis un checkout propre
- [ ] `pnpm gate:exhaustive`, `pnpm gate:verify` et `pnpm gate:prepush` passent sur le commit cible
- [ ] La CI distante est active, verte et bloquante
- [ ] Le staging est deployable de facon reproductible et smoke green
- [ ] Le rollback prod est teste et documente
- [ ] Aucun chemin critique ne depend de donnees demo, de fallback implicite, de scripts manuels non documentes ou d'une personne cle unique
- [ ] Les contrats publics, les types partages, le runtime reel et la documentation sont alignes
- [ ] Une fois cette section fermee, le travail restant releve uniquement de la construction de features
