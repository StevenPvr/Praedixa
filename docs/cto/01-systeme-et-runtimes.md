# Systeme Et Runtimes

Statut: actif
Owner: CTO / platform engineering
Derniere revue: 2026-03-21
Source de verite: cette page synthétise les frontières runtime; les vérités d'implémentation restent dans `app-landing/`, `app-webapp/`, `app-admin/`, `app-api-ts/`, `app-connectors/` et `app-api/`
Depend de: `docs/ARCHITECTURE.md`, `README.md`, `app-api-ts/README.md`, `app-connectors/README.md`, `app-api/README.md`
Voir aussi: `README.md`, `docs/README.md`, `docs/cto/README.md`, `docs/cto/06-flux-de-donnees-applicatifs.md`, `docs/cto/07-connecteurs-et-sync-runs.md`

## Vue courte

Praedixa s'appuie sur six briques visibles du point de vue CTO:

- `app-landing`: acquisition et formulaires publics
- `app-webapp`: produit client
- `app-admin`: back-office opérateur
- `app-api-ts`: pivot HTTP, auth, services admin/produit, lecture/écriture PostgreSQL
- `app-connectors`: control plane des intégrations
- `app-api`: data-plane Python, pipelines, transformations, workers batch

Deux dépendances externes structurent les flux:

- `Keycloak` pour l'identité et les claims OIDC
- `Camunda` pour l'onboarding BPM

La base PostgreSQL concentre la persistance durable partagée, avec:

- un schéma `public` pour les tables applicatives;
- des schémas `{org}_data` pour les données client raw/transformed.

## Qui fait quoi

| Runtime          | Rôle principal                                 | Lit                                             | Écrit                                                   | Dépendances majeures                                  |
| ---------------- | ---------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------- |
| `app-landing`    | marketing, captation lead, formulaires publics | peu ou pas de lecture DB directe                | relaie des demandes publiques vers l'API TS             | `app-api-ts`                                          |
| `app-webapp`     | expérience client                              | APIs BFF same-origin puis `app-api-ts`          | mutations produit via BFF                               | `Keycloak`, `app-api-ts`                              |
| `app-admin`      | back-office et opérations cross-org            | APIs BFF same-origin puis `app-api-ts`          | mutations admin via BFF                                 | `Keycloak`, `app-api-ts`, `app-connectors`            |
| `app-api-ts`     | pivot HTTP produit/admin                       | PostgreSQL, Keycloak, Camunda, `app-connectors` | PostgreSQL, appels sortants contrôlés                   | `PostgreSQL`, `Keycloak`, `Camunda`, `app-connectors` |
| `app-connectors` | control plane intégrations                     | config, runs, payload store, secrets            | connexions, sync runs, raw events, audit d'intégration  | `PostgreSQL`, object store, vendors                   |
| `app-api`        | pipelines Data/ML et workers batch             | PostgreSQL, `app-connectors`                    | PostgreSQL, schémas `{org}_data`, transformations, jobs | `PostgreSQL`, `app-connectors`, vendors               |

## Frontieres de vérité

### Fronts Next

- `app-webapp` et `app-admin` ne doivent pas être lus comme des runtimes métier de persistance.
- Leur rôle est de porter l'UI, le BFF same-origin, la session et la navigation.
- Le navigateur ne parle pas directement à PostgreSQL ni au data-plane Python.

### API applicative TypeScript

- `app-api-ts` est la frontière HTTP principale du produit.
- C'est ici que se trouvent les routes produit/admin, le RBAC, les appels à `app-connectors`, l'orchestration Camunda et une partie significative des lectures/écritures SQL.
- Pour un CTO, c'est la meilleure porte d'entrée pour remonter d'une route ou d'un écran vers les tables.

### Control plane intégrations

- `app-connectors` ne fait pas le traitement Data/ML.
- Il gère les connexions, l'onboarding fournisseur, les credentials, les `sync_runs`, les `raw_events` et la sécurité des intégrations.
- Il sert de frontière entre les surfaces opérateur (`app-admin`/`app-api-ts`) et les workers Python.

### Data-plane Python

- `app-api` est la source de vérité pipeline pour l'ingestion, la transformation et les jobs batch.
- Il porte les modèles SQLAlchemy, les migrations Alembic et la logique Bronze/Silver/Gold.
- Il consomme les signaux et payloads du control plane connecteurs, puis alimente les tables et schémas consommés ensuite par le produit.

## Hiérarchie de lecture recommandée

### Si le point de départ est un écran

1. front concerné (`app-webapp` ou `app-admin`)
2. BFF Next `/api/v1/*`
3. `app-api-ts/src/routes.ts`
4. service `app-api-ts/src/services/*`
5. tables PostgreSQL ou runtime externe appelé

### Si le point de départ est une table

1. `docs/DATABASE.md`
2. `app-api/app/models/*`
3. migration Alembic associée
4. services Python ou TS qui lisent/écrivent la table
5. écrans ou endpoints qui exposent la donnée

### Si le point de départ est un flux d'intégration

1. `app-connectors/README.md`
2. `docs/cto/07-connecteurs-et-sync-runs.md`
3. routes `app-connectors/src/routes.ts`
4. services/workers Python dans `app-api/app/services/*`
5. tables `integration_*` et schémas `{org}_data`

## Ce qui n'est pas une source de vérité primaire

- `docs/plans/*`: utile pour l'historique de décision, pas pour l'état runtime courant
- `docs/prd/*`: utile pour le contrat produit visé, pas pour prouver ce qui tourne aujourd'hui

## Risques de confusion à garder en tête

- Le schéma est riche et certaines surfaces historiques coexistent avec des surfaces plus récentes.
- Une partie de la compréhension passe par PostgreSQL partagé, pas seulement par des appels HTTP entre services.
- Le périmètre intégrations porte une différence importante entre cible relationnelle documentée et runtime actuel du control plane.

## Où aller ensuite

- Pour la hiérarchie documentaire et le parcours CTO: [`docs/cto/README.md`](./README.md)
- Pour le schéma et les domaines de tables: [`03-modele-de-donnees-global.md`](./03-modele-de-donnees-global.md)
- Pour les flux applicatifs: [`06-flux-de-donnees-applicatifs.md`](./06-flux-de-donnees-applicatifs.md)
- Pour les intégrations: [`07-connecteurs-et-sync-runs.md`](./07-connecteurs-et-sync-runs.md)
