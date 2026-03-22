# Schemas Tenant Et Medallion

Statut: draft durable
Owner: Platform + Data
Derniere revue: 2026-03-21
Source de verite: `docs/DATABASE.md`, `docs/medallion-pipeline.md`, `app-api/app/services/schema_manager.py`, `app-api/scripts/medallion_pipeline.py`
Depend de: `app-api`, `app-api-ts`, `app-connectors`, PostgreSQL
Voir aussi: `03-modele-de-donnees-global.md`, `04-schema-public-postgres.md`, `06-flux-de-donnees-applicatifs.md`, `visuals/lineage-medallion.mmd`

## Pourquoi cette page existe

Le repo expose deux facons complementaires de parler des donnees:

- PostgreSQL porte les tables metier du schema `public` et les schemas dynamiques `{org}_data`.
- Le pipeline medallion Python decrit un contrat de transformation Bronze -> Silver -> Gold avec des sorties fichier versionnees dans `data-ready/`.

Pour un CTO entrant, le point cle est de ne pas opposer ces deux vues. Elles servent des usages differents et se croisent dans les lectures live, l'observabilite et la gouvernance du pipeline.

## Vue d'ensemble

### 1. Schema `public`

Le schema `public` contient les tables applicatives gouvernees par Alembic:

- tenant et identite: `organizations`, `sites`, `departments`, `users`
- catalogue de donnees: `client_datasets`, `dataset_columns`, `ingestion_log`, `quality_reports`
- operationnel: `canonical_records`, `coverage_alerts`, `operational_decisions`, `proof_records`, `forecast_runs`, `daily_forecasts`
- integrations: tables `integration_*`
- onboarding, admin, MLOps, collaboration

Cette couche est la reference pour les frontends, les BFF Next, `app-api-ts`, les workers Python et les parcours admin.

### 2. Schemas tenant `{org}_data`

Chaque organisation peut disposer d'un schema dedie, cree dynamiquement par `schema_manager.py`:

- nom de schema derive de `org_slug`
- tables par dataset client
- separation entre table brute et table transformee

Le but de ces schemas n'est pas de remplacer `public`, mais d'heberger les donnees operationnelles client-specifiques et leurs transformations de facon isolee par tenant.

### 3. Pipeline medallion

Le pipeline Python standardise le passage entre:

- Bronze: copie source immuable et controlee
- Silver: normalisation et qualite
- Gold: enrichissement, features temporelles et exposition analytique

Dans le repo actuel, ce pipeline materialise explicitement des sorties fichier (`data-ready/bronze`, `data-ready/silver`, `data-ready/gold`) tout en alimentant des services Python et des lectures live consommees ensuite par `app-api-ts`.

## Ce que porte exactement un schema tenant

Pour chaque dataset client, le schema `{org}_data` genere en pratique deux tables:

- `{table_name}` pour les donnees brutes
- `{table_name}_transformed` pour les donnees preparees

On y retrouve:

- des colonnes systeme de suivi (`_row_id`, `_ingested_at`, `_batch_id`, `_transformed_at`, `_pipeline_version`)
- les colonnes metier issues du dataset
- les enrichissements ou transformations utiles au pipeline

Le schema tenant est donc une couche de travail et d'isolation, pas une interface publique. Les apps web ne le lisent pas directement depuis le navigateur.

## Contrat Bronze / Silver / Gold

| Couche | Role                                                                         | Forme visible dans le repo                        | Usage principal                        |
| ------ | ---------------------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------- |
| Bronze | copie source immuable, watermark, quarantaine                                | `data-ready/bronze/`, manifests, etat append-only | tracabilite, reprise, audit source     |
| Silver | schema normalise, qualite, imputations, garde anti-leakage                   | `data-ready/silver/silver_site_day.csv`           | base propre pour calculs et features   |
| Gold   | enrichissement final, features temporelles, meteo, vacances, agregats utiles | `data-ready/gold/*.csv` et lectures live Python   | exposition analytique et surfaces live |

Le CTO doit retenir que Bronze/Silver/Gold est d'abord un contrat de transformation et de gouvernance. Selon le flux, la persistance finale visible cote produit peut passer par:

- des artefacts fichier du pipeline
- des tables Postgres du domaine
- des lectures Python qui reprojectent ensuite les donnees vers `app-api-ts`

## Relation avec `app-api-ts`

`app-api-ts` ne rejoue pas le pipeline medallion. Il consomme ses resultats via:

- des tables metier Postgres maintenues par le data-plane Python
- des services de lecture comme `gold_live_data.py`
- les routes live `/api/v1/live/gold/*`, `/api/v1/live/canonical*`, `/api/v1/live/forecasts*`, `/api/v1/proof*`

Le coupling important a memoriser:

- pas d'acces direct navigateur -> Python
- pas d'appel HTTP direct `app-api-ts -> app-api` observe dans le repo pour les lectures courantes
- la jointure entre la couche Node/TS et la couche Python passe surtout par PostgreSQL, les read-models et les workers batch

## Relation avec les integrations

Les connecteurs et `sync_runs` servent a alimenter le pipeline amont:

1. `app-api-ts` pilote la surface admin integrations.
2. `app-connectors` gere connexion, auth, queue, payloads et `raw events`.
3. le worker Python reclame les runs, lit l'`execution plan`, puis alimente le pipeline d'ingestion.
4. le pipeline medallion produit la normalisation Bronze/Silver/Gold.
5. les resultats reapparaissent via les lectures live et les surfaces admin.

Le schema tenant et la logique medallion sont donc les charnieres entre le control plane integrations et les tables metier exposees aux produits.

## Ce qu'un CTO doit verifier en premier

- quels flux alimentent encore des artefacts fichier seulement et lesquels sont vraiment reflates dans Postgres
- quelles tables `public` sont des sources de verite metier et lesquelles sont des projections/runtime read-models
- comment la qualite est mesuree entre Bronze, Silver et Gold
- quelles donnees vivent dans `{org}_data` vs `public`
- quelle part du pipeline est encore orientee batch et quelle part est lue quasi-live par `app-api-ts`

## Risques de confusion a eviter

### Confusion 1: "`public` suffit a tout expliquer"

Faux. `public` explique la structure metier applicative, mais pas l'ensemble des etapes de transformation ni l'isolation dataset par tenant.

### Confusion 2: "Bronze/Silver/Gold = seulement des CSV"

Faux. Les CSV sont une preuve materielle du pipeline, mais le contrat medallion sert aussi a structurer les lectures live, la qualite et la production de tables ou read-models consommes par les apps.

### Confusion 3: "Les schemas tenant sont une API"

Faux. Les schemas `{org}_data` sont une couche interne de persistance et de transformation. Les frontends passent par les BFF Next puis `app-api-ts`.

## Ordre de lecture recommande

1. `docs/DATABASE.md` pour la vue schema.
2. `docs/medallion-pipeline.md` pour le contrat Bronze/Silver/Gold.
3. `visuals/lineage-medallion.mmd` pour la chaine complete.
4. `06-flux-de-donnees-applicatifs.md` pour replacer ces couches dans les flux inter-apps.
