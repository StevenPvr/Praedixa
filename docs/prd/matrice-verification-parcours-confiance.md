# Matrice de verification des parcours de confiance

## Role de ce document

Ce document ne remplace pas `docs/TESTING.md`.
Il relie les parcours produit critiques aux preuves attendues dans le repo.
Il sert a verifier qu'un merge et une release ferment bien les chemins qui rendent Praedixa credible en tant que plateforme DecisionOps.

Parcours couverts:

- `admin -> connectors -> medallion -> dataset health`
- `auth -> signal -> compare -> approve -> dispatch -> ledger`

IDs metier a propager quand applicables:

- `request_id`
- `run_id`
- `contract_version`
- `connector_run_id`
- `action_id`

## Regle d'usage

- `Merge evidence`: ce qui doit vivre dans les tests, contrats, schemas, pages et gates distants avant fusion.
- `Release evidence`: ce qui doit etre prouve sur un environnement deploiement/release/smoke/observabilite avant de presenter le parcours comme operable.

## Parcours 1 - Admin -> Connectors -> Medallion -> Dataset Health

| Etape                                            | Surfaces impliquees                         | Source de verite                                                         | Preuve happy path                                                                                   | Preuve degrade / fail-close                                                                                            | Evidence minimale                                                                                 | IDs et gate                                                            |
| ------------------------------------------------ | ------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1. Acces admin a la surface connecteurs          | `app-admin`, auth, BFF/proxy                | session OIDC, policy de route admin, catalogue connecteurs               | Un admin autorise voit le catalogue standard et peut ouvrir le wizard.                              | Un role insuffisant, une origine invalide ou un tenant hors scope bloque la route et ne degrade pas vers un mode demo. | Unit policy; security tests auth/origin; E2E acces admin; smoke login admin.                      | IDs: `request_id`. Merge + Release.                                    |
| 2. Creation de connexion et stockage des secrets | `app-admin`, `app-api-ts`, `app-connectors` | schema de connexion, inventory secrets, runtime config                   | Une connexion draft est creee avec auth mode valide et champs requis.                               | Secret manquant, host interdit ou payload invalide retourne une erreur explicite et auditee.                           | Unit validation; integration route->service; security tests host allowlist; smoke create draft.   | IDs: `request_id`, `connector_run_id` si probe lance. Merge + Release. |
| 3. Readiness et connection test                  | `app-admin`, `app-connectors`               | verdict `activation_readiness`, probe cible, fixtures certification      | Le connecteur obtient un verdict vert sur `config`, `credentials`, `authorization`, `probe target`. | Le verdict reste rouge/orange tant qu'un pre-requis manque; aucun "success" optimiste.                                 | Certification fixtures; integration readiness; E2E wizard; smoke connection test.                 | IDs: `request_id`, `connector_run_id`. Merge + Release.                |
| 4. Full sync initiale vers Bronze                | `app-connectors`, `app-api`                 | raw retention append-only, manifests de sync                             | Une full sync cree un run observable, persiste le Raw et expose son statut.                         | Timeout, auth revoke, schema drift ou 429 laissent un run en echec observable sans ecriture partielle silencieuse.     | Unit extractor/mapper; integration sync; resilience tests; smoke sync pilote.                     | IDs: `request_id`, `connector_run_id`. Merge + Release.                |
| 5. Mapping publish et quarantaine                | `app-admin`, `app-api`, medallion Python    | mapping publie, quarantaine append-only, preview stable                  | Un mapping valide publie des champs exploitable et expose un preview fiable.                        | Records invalides, collisions ou champs manquants partent en quarantaine avec motif et compteur.                       | Unit mapping rules; integration publish; security validation; E2E mapping preview; smoke publish. | IDs: `request_id`, `connector_run_id`. Merge + Release.                |
| 6. Replay / backfill / progression medallion     | `app-api`, `app-connectors`, ops admin      | scripts/versioned runtime de replay-backfill, lineage Bronze/Silver/Gold | Un replay ou backfill cible relance proprement une fenetre et reconstruit les couches attendues.    | Une fenetre invalide, un tenant hors scope ou une dependance manquante bloque la relance de facon explicite.           | Integration medallion; regression replay/backfill; smoke reprocess; runbook execute.              | IDs: `request_id`, `connector_run_id`, `run_id`. Merge + Release.      |
| 7. Dataset health unique                         | `app-admin`, `app-api`, `app-api-ts`        | surface typee dataset health, freshness, lineage, volume, error-rate     | L'admin lit un etat unique par dataset avec severite, actions recommandees et dernier succes.       | Data stale, lineage casse ou run critique en echec degradent clairement les surfaces aval.                             | Unit status mapping; integration API; E2E health view; synthetic/smoke lecture health.            | IDs: `request_id`, `connector_run_id`, `run_id`. Merge + Release.      |

## Parcours 2 - Auth -> Signal -> Compare -> Approve -> Dispatch -> Ledger

| Etape                                 | Surfaces impliquees                                  | Source de verite                                                       | Preuve happy path                                                                                  | Preuve degrade / fail-close                                                                                      | Evidence minimale                                                                                                             | IDs et gate                                                                                        |
| ------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1. Acces authentifie au shell produit | `app-webapp`, auth, BFF/proxy                        | session OIDC, scoping tenant/site, permissions                         | Un utilisateur autorise entre dans le bon workspace et voit ses sites accessibles.                 | Token/API incompatibles, origine invalide ou site hors allowlist bloquent la lecture sans fuite cross-tenant.    | Unit session helpers; integration auth routes; security tests tenant/site; E2E login webapp; smoke `/login`.                  | IDs: `request_id`. Merge + Release.                                                                |
| 2. Signal inbox                       | `app-webapp`, `app-api-ts`, data plane               | alertes persistantes, freshness, horizon, confiance                    | Le signal affiche horizon, confiance, dernier refresh et priorisation.                             | Dataset stale, no-data ou signal invalide passent en etat degrade visible et ne pretendent pas recommander.      | Unit page model; integration alert reads; E2E signal inbox; smoke live workspace.                                             | IDs: `request_id`, `run_id`. Merge + Release.                                                      |
| 3. Scenario compare                   | `app-webapp`, `app-api-ts`, solver/runtime Python    | `scenario_options`, policy versionnee, baseline vs alternatives        | L'operator voit baseline, alternatives, contraintes liantes, cout, service, risque et confiance.   | `no-feasible-solution`, `degraded`, `fallback-used` ou absence de runtime persistent sont visibles et expliques. | Unit serializers; integration scenario reads; regression scenario; E2E compare; perf/load evidence.                           | IDs: `request_id`, `run_id`, `contract_version`. Merge + Release.                                  |
| 4. Demande ou decision d'approbation  | `app-webapp`, `app-admin`, `app-api-ts`              | matrice d'approbation, justification structuree, audit append-only     | Le bon approver peut approuver/rejeter avec contexte complet et justification obligatoire.         | Role insuffisant, SoD casse ou payload incomplet bloque la mutation et laisse une trace auditee.                 | Unit state machine; integration mutation; security tests role/SoD; E2E approval inbox; smoke mutation admin.                  | IDs: `request_id`, `run_id`, `contract_version`, `action_id` si dispatch prepare. Merge + Release. |
| 5. Dry-run et preparation dispatch    | `app-admin`, `app-api-ts`, `app-connectors`          | template d'action versionne, permission de destination, payload final  | Le payload final est previsualisable avant ecriture cible et reference le bon template/version.    | Destination interdite, permission absente ou contrat non publie bloque le dry-run.                               | Unit payload builder; integration template read; security tests destination allowlist; E2E preview payload.                   | IDs: `request_id`, `run_id`, `contract_version`, `action_id`. Merge.                               |
| 6. Dispatch, ack, retry, fallback     | `app-api-ts`, `app-connectors`, surface admin detail | `action_dispatches`, idempotency key, timeline d'etats                 | Une action approuvee atteint `acknowledged` ou un etat terminal explicite sans doublon.            | `failed`, `retried`, `canceled` et fallback humain sont visibles; un retry n'ecrit pas deux fois.                | Unit state machine; integration dispatch; regression idempotence; resilience tests; smoke dispatch non destructif ou sandbox. | IDs: `request_id`, `run_id`, `contract_version`, `action_id`. Merge + Release.                     |
| 7. Ledger detail et statut ROI        | `app-admin`, `app-webapp`, `app-api-ts`, data plane  | `decision_ledger_entries`, baseline/recommended/actual, statut finance | La decision produit une entree lisible avec methode contrefactuelle, statut finance et drill-down. | `cannot_prove_yet`, donnees BAU manquantes ou recalcul en attente sont distingues d'un ROI nul.                  | Unit ledger mapping; integration detail read; regression ROI; E2E ledger detail; smoke read ledger.                           | IDs: `request_id`, `run_id`, `contract_version`, `action_id`. Merge + Release.                     |
| 8. Revue mensuelle et exports         | `app-admin`, data plane, exports                     | cockpit ROI, exports CSV/PDF/JSON, evidence mensuelle                  | Ops, produit et finance lisent la meme verite pour un contrat/periode donnes.                      | Export incomplet, statut conteste ou preuve insuffisante degrade l'etat de cloture et bloque la sur-promesse.    | Integration exports; finance-grade regression; smoke export mensuel; runbook revue mensuelle.                                 | IDs: `request_id`, `run_id`, `contract_version`, `action_id`. Release.                             |

## Gaps actuellement ouverts a fermer

### Connecteurs et donnees

- mapping studio admin complet;
- quarantaine des records invalides;
- replay/backfill sans reconstruction manuelle;
- surface unique de dataset health;
- activation des connecteurs standards sans intervention dev.

### Boucle DecisionOps

- runtime de generation scenario persistant;
- matrice d'approbation configurable et justification structuree;
- lifecycle complet Action Mesh et prevention des doublons;
- ledger finance-grade complet;
- E2E du parcours `auth -> signal -> compare -> approve -> dispatch -> ledger`.

### Gouvernance merge/release

- branch protection effectivement bloquante;
- suites de charge/regression scenario-action-ledger;
- propagation complete des IDs metier;
- synthetics, dashboards, alertes, restore proof et rollback testes.

## Comment s'en servir

- Avant implementation: verifier quelle ligne de parcours la feature doit fermer.
- Avant merge: s'assurer qu'une evidence explicite existe au bon niveau de test.
- Avant release: rejouer la preuve smoke/observabilite correspondante.
- Quand `TODO.md` change: mettre cette matrice a jour si une exigence de preuve evolue.
