# Modele De Donnees Global

Statut: draft
Owner: CTO / platform
Derniere revue: 2026-03-21
Source de verite: `app-api/app/models/*`, `app-api/alembic/versions/*`
Depend de: `docs/DATABASE.md`, `docs/ARCHITECTURE.md`
Voir aussi: `docs/cto/04-schema-public-postgres.md`, `docs/cto/visuals/erd-global.mmd`, `docs/cto/visuals/schema-public-domains.mmd`

## Role

Cette page donne une vue CTO du modele de donnees Praedixa.

Elle repond a quatre questions:

1. Quelles sont les vraies sources de verite du schema.
2. Comment le schema `public` se decoupe par domaines.
3. Comment les schemas `{org_slug}_data` completent ce schema public.
4. Quelles zones sont encore ambigues, legacy ou en convergence.

## Ordre de verite

Pour raisonner correctement sur la base, utiliser cet ordre:

1. `app-api/app/models/*`
   Ce dossier porte l'etat ORM courant de la majorite du schema PostgreSQL structure.
2. `app-api/alembic/versions/*`
   Ce dossier explique comment le schema a evolue, ce qui a ete ajoute, durci ou retire.
3. `docs/DATABASE.md`
   Bonne synthese humaine, mais a verifier contre les modeles et migrations quand un doute existe.
4. Les runtimes consommateurs
   `app-api-ts`, `app-connectors` et les apps web disent comment les tables sont lues, pas toujours ce qui fait foi structurellement.

## Topologie globale

Le stockage se decoupe en deux couches:

- `public`
  Tables applicatives stables, versionnees par Alembic, lues et ecrites par les runtimes Python et Node/TS.
- `{org_slug}_data`
  Schemas dynamiques crees par client pour les tables raw et transformed du pipeline medallion.

Le schema `public` porte surtout la gouvernance, la structure metier, les read models, les journaux et les metadonnees. Les schemas `{org_slug}_data` portent la matiere operationnelle chargee, transformee puis agregee vers les tables canoniques, forecasts et preuves.

## Domaines du schema public

### 1. Tenant, structure et RBAC

Racine du systeme multi-tenant:

- `organizations`
- `sites`
- `departments`
- `users`

Ce bloc fournit les identites metier de base, les partitions tenant, le scope site et les relations de rattachement utilisees presque partout ailleurs.

### 2. Data catalog et ingestion

Registre des datasets client et de leur gouvernance:

- `client_datasets`
- `dataset_columns`
- `fit_parameters`
- `ingestion_log`
- `quality_reports`
- `pipeline_config_history`

Ce domaine sert de charniere entre les schemas dynamiques `{org_slug}_data` et les couches plus metier.

### 3. Couche operationnelle

Representation calculee du reel operationnel:

- `canonical_records`
- `cost_parameters`
- `coverage_alerts`
- `scenario_options`
- `operational_decisions`
- `proof_records`
- `forecast_runs`
- `daily_forecasts`
- `dashboard_alerts`

Ce bloc est le coeur du loop DecisionOps: federer, predire, calculer, arbitrer, prouver.

### 4. Runtime DecisionOps

Persistance du triplet approbation / action / ledger:

- `decision_approvals`
- `action_dispatches`
- `decision_ledger_entries`

Ce domaine est plus recent et plus finance-grade que les surfaces historiques de decision.

### 5. Admin, audit et conformite

Pilotage transversal et traces de gouvernance:

- `admin_audit_log`
- `plan_change_history`
- `rgpd_erasure_requests`
- `rgpd_erasure_audit_events`
- `contact_requests`

Ces tables ne sont pas toutes tenant-scoped de la meme facon. Certaines gardent volontairement des references historiques simples plutot que des FKs vivantes.

### 6. Onboarding

Deux generations coexistent:

- historique:
  `onboarding_states`
- BPM/control plane recent:
  `onboarding_cases`
  `onboarding_case_tasks`
  `onboarding_case_blockers`
  `onboarding_case_events`

Le bloc BPM est la trajectoire actuelle. `onboarding_states` reste un repere de compatibilite historique a clarifier dans la doc et, a terme, dans la simplification du schema.

### 7. Integrations et synchronisation

Plan de controle des connecteurs:

- `integration_connections`
- `integration_sync_runs`
- `integration_sync_state`
- `integration_raw_events`
- `integration_field_mappings`
- `integration_error_events`
- `integration_dead_letter_queue`
- `integration_webhook_receipts`
- `integration_audit_events`

Ce domaine est critique pour comprendre la frontiere entre `app-connectors`, `app-api` et les vendors.

### 8. MLOps et lineage

Gouvernance des modeles et jobs:

- `model_registry`
- `model_inference_jobs`
- `model_artifact_access_log`
- `data_lineage_events`

### 9. Collaboration

Messagerie entre client et admin:

- `conversations`
- `messages`

## Relation entre `public` et `{org_slug}_data`

Le parcours cible est:

1. un dataset est declare dans `client_datasets`;
2. son schema physique est cree sous `{org_slug}_data`;
3. les runs et controles vivent dans `ingestion_log`, `quality_reports`, `fit_parameters`;
4. les services Python consolident ensuite les sorties utiles vers:
   `canonical_records`, `daily_forecasts`, `coverage_alerts`, `proof_records`, et autres tables `public`;
5. `app-api-ts` et les BFF web lisent principalement ces tables `public`.

Autrement dit:

- `{org_slug}_data` porte la matiere changeante;
- `public` porte la structure metier exploitable par les produits et les fonctions support.

## Invariants transverses

- `TenantMixin` impose `organization_id` sur les tables tenant-scoped.
- `TimestampMixin` normalise `created_at` / `updated_at`.
- Les revisions Alembic les plus structurantes pour le schema actuel sont:
  `019`, `026`, `027`, `028`, `029`, `030`, `031`, `032`.
- Le schema public n'est pas uniquement "business"; il porte aussi des journaux, des read models et des tables de convergence entre runtimes.

## Zones ambigues ou legacy a surveiller

### `Decision` vs runtime DecisionOps

Le modele `Decision` pointe encore sur la table `decisions` et reference des FKs vers `employees.id`, alors que la migration `019_remove_orphan_models.py` a retire `employees`, `absences` et `action_plans`.

Conclusion prudente:

- `decisions` reste visible dans le code ORM;
- le runtime recent s'appuie surtout sur `operational_decisions`, `decision_approvals`, `action_dispatches` et `decision_ledger_entries`;
- il existe donc une zone de convergence ou de nettoyage a traiter explicitement, sans supposer qu'elle est deja resolue.

### `onboarding_states` vs `onboarding_cases*`

Le schema contient a la fois:

- une surface historique simple `onboarding_states`;
- une surface BPM riche `onboarding_cases*`, durcie par `029_onboarding_camunda_only.py`.

La documentation CTO doit montrer que la cible actuelle est le bloc BPM, sans masquer la coexistence de l'ancien et du nouveau.

### Integrations: cible relationnelle vs runtime reel

Le domaine `integration_*` est bien modele cote Python et migrations. Il faut toutefois le lire avec prudence cote architecture globale, car le runtime `app-connectors` porte encore son propre modele de persistence operationnelle. Cette page ne tranche pas la convergence; elle signale simplement que le schema relationnel cible existe bien cote `app-api`.

## Ce que ce document couvre, et ne couvre pas

Ce document couvre:

- la structure logique du schema global;
- les domaines portes par les modeles Python;
- les points de vigilance necessaires a une lecture CTO correcte.

Ce document ne couvre pas en detail:

- les tables creees uniquement par les migrations SQL de `app-api-ts`;
- les payloads JSON complets des contrats runtime;
- les diagrammes de sequence applicatifs, traites ailleurs.

## Diagrammes associes

- ERD global: `docs/cto/visuals/erd-global.mmd`
- Schema du public par domaines: `docs/cto/visuals/schema-public-domains.mmd`
