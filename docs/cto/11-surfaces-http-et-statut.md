# Surfaces HTTP Et Statut

- Statut: draft durable
- Owner: platform + product engineering
- Derniere revue: 2026-03-21
- Source de verite:
  - `contracts/openapi/public.yaml`
  - `app-api-ts/src/routes.ts`
  - `app-api-ts/src/routes/*`
  - `app-connectors/src/routes.ts`
- Depend de:
  - `docs/cto/01-systeme-et-runtimes.md`
  - `docs/cto/06-flux-de-donnees-applicatifs.md`
  - `docs/cto/08-contrats-et-types-partages.md`
- Voir aussi:
  - `docs/cto/10-ownership-et-tracabilite-des-donnees.md`
  - `docs/cto/07-connecteurs-et-sync-runs.md`
  - `docs/cto/16-legacy-et-surfaces-fermees.md`

## Objectif

Rendre visible, pour un CTO, la difference entre:

- une surface HTTP deja live et persistante;
- une surface encore volontairement `fail-close`;
- une surface publique versionnee;
- une surface interne/admin non exposee comme contrat public.

## Legende

| Statut             | Sens                                                                          |
| ------------------ | ----------------------------------------------------------------------------- |
| `live`             | route active avec lecture/ecriture ou calcul reel                             |
| `persistant`       | route active avec persistence durable verifiee                                |
| `fail-close`       | route volontairement fermee tant que le backend cible n'est pas industrialise |
| `proxy`            | route front same-origin qui relaie vers `app-api-ts`                          |
| `public versionne` | route couverte par `contracts/openapi/public.yaml`                            |
| `interne/admin`    | route utile au produit ou a l'ops, mais hors contrat public                   |

## Surfaces frontales

| Surface                 | Type                     | Statut                                | Point d'entree                             |
| ----------------------- | ------------------------ | ------------------------------------- | ------------------------------------------ |
| `app-webapp /api/v1/*`  | BFF Next                 | `proxy`                               | `app-webapp/app/api/v1/[...path]/route.ts` |
| `app-admin /api/v1/*`   | BFF Next                 | `proxy`                               | `app-admin/app/api/v1/[...path]/route.ts`  |
| `app-landing app/api/*` | routes publiques locales | `live` pour les formulaires marketing | `app-landing/app/api/*`                    |

## Surfaces `app-api-ts` produit

| Famille de routes                                                                                                                                                                                                                                                          | Statut               | Contrat                                       | Notes                                                |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | --------------------------------------------- | ---------------------------------------------------- |
| `/api/v1/live/dashboard/summary`                                                                                                                                                                                                                                           | `live`, `persistant` | public versionne                              | lecture KPI live                                     |
| `/api/v1/live/forecasts*`                                                                                                                                                                                                                                                  | `live`, `persistant` | public versionne                              | forecasts et daily latest                            |
| `/api/v1/live/gold/*`                                                                                                                                                                                                                                                      | `live`, `persistant` | public versionne                              | schema, rows, coverage, provenance                   |
| `/api/v1/live/canonical*`                                                                                                                                                                                                                                                  | `live`, `persistant` | public versionne                              | canonical et quality                                 |
| `/api/v1/live/coverage-alerts*` et `/api/v1/coverage-alerts/*`                                                                                                                                                                                                             | `live`, `persistant` | public versionne                              | queue, ack, resolve                                  |
| `/api/v1/live/scenarios/alert/:alertId`                                                                                                                                                                                                                                    | `live`, `persistant` | public versionne                              | generation/lecture scenario                          |
| `/api/v1/live/decision-workspace/:alertId`                                                                                                                                                                                                                                 | `live`, `persistant` | public versionne                              | workspace de decision                                |
| `/api/v1/operational-decisions*`                                                                                                                                                                                                                                           | `live`, `persistant` | public versionne                              | mutations et historique                              |
| `/api/v1/proof*`                                                                                                                                                                                                                                                           | `live`, `persistant` | public versionne                              | proof et summary                                     |
| `/api/v1/public/contact-requests`                                                                                                                                                                                                                                          | `live`, `persistant` | public versionne                              | lead/contact public                                  |
| `/api/v1/organizations/me`, `/api/v1/departments`, `/api/v1/sites`, plusieurs `/api/v1/forecasts/*`, `/api/v1/decisions*`, `/api/v1/arbitrage*`, `/api/v1/datasets*`, une partie `/api/v1/conversations*`, `/api/v1/users/me/preferences*`, `/api/v1/product-events/batch` | `fail-close`         | public versionne pour plusieurs d'entre elles | routes encore fermees via `liveFallbackFailure(...)` |

## Surfaces `app-api-ts` admin

| Famille de routes                                                       | Statut               | Contrat       | Notes                             |
| ----------------------------------------------------------------------- | -------------------- | ------------- | --------------------------------- |
| `/api/v1/admin/organizations*`, users, billing, audit, contact requests | `live`, `persistant` | interne/admin | coeur du back-office              |
| `/api/v1/admin/onboarding*`                                             | `live`, `persistant` | interne/admin | projection SQL + Camunda          |
| `/api/v1/admin/integrations*`                                           | `live`, `persistant` | interne/admin | facade admin sur `app-connectors` |
| `/api/v1/admin/decision-contract*`                                      | `live`, `persistant` | interne/admin | studio contrats                   |
| `/api/v1/admin/approval-inbox`, `action-dispatches/*`, `ledgers/*`      | `live`, `persistant` | interne/admin | surfaces DecisionOps              |

## Surfaces `app-connectors`

| Famille de routes                                                                 | Statut               | Contrat          | Notes            |
| --------------------------------------------------------------------------------- | -------------------- | ---------------- | ---------------- |
| catalogue, connexions, autorisation, tests, creation sync                         | `live`, `persistant` | interne/operator | control plane TS |
| `POST /v1/runtime/sync-runs/claim`                                                | `live`, `persistant` | interne/runtime  | worker-only      |
| `POST /v1/organizations/:orgId/sync-runs/:runId/execution-plan`                   | `live`, `persistant` | interne/runtime  | worker-only      |
| `GET /v1/runtime/organizations/:orgId/connections/:connectionId/access-context`   | `live`, `persistant` | interne/runtime  | worker-only      |
| `POST /v1/runtime/organizations/:orgId/connections/:connectionId/provider-events` | `live`, `persistant` | interne/runtime  | worker-only      |

## Ce qu'un CTO doit retenir

- `public versionne` ne veut pas dire `operable aujourd'hui`: plusieurs routes du contrat public restent volontairement `fail-close`.
- les surfaces admin et `app-connectors` sont critiques pour le fonctionnement du systeme, meme si elles ne vivent pas dans `contracts/openapi/public.yaml`.
- pour prioriser un chantier produit, il faut d'abord lire cette page puis remonter vers les services et tables associes.

## Aller plus loin

Si une surface reste difficile a classer, lire ensuite `docs/cto/16-legacy-et-surfaces-fermees.md` pour distinguer:

- une surface legacy;
- une surface en convergence;
- une fermeture volontaire `fail-close`;
- une surface reellement operable.
