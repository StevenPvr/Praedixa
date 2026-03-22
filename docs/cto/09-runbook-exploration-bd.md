# Runbook CTO - Explorer la base de donnees Praedixa

- Statut: draft operationnel
- Owner: plateforme / architecture
- Derniere revue: 2026-03-21
- Source de verite:
  - `app-api/app/models/*`
  - `app-api/alembic/versions/*`
  - `app-api-ts/src/services/*`
- Depend de:
  - `docs/DATABASE.md`
  - `docs/ARCHITECTURE.md`
  - `app-api/app/models/README.md`
  - `app-api-ts/src/services/README.md`
- Voir aussi:
  - `docs/cto/03-modele-de-donnees-global.md`
  - `docs/cto/04-schema-public-postgres.md`
  - `docs/cto/05-schemas-tenant-et-medallion.md`
  - `docs/cto/06-flux-de-donnees-applicatifs.md`
  - `docs/cto/07-connecteurs-et-sync-runs.md`
  - `docs/cto/14-telemetry-et-correlation.md`

## Objectif

Ce runbook sert a:

- verifier rapidement ce qui existe vraiment en base;
- partir d'un tenant, d'un flux, d'une table ou d'un endpoint et remonter le reste du chemin;
- distinguer schema reel, read-models, historique legacy et projections runtime;
- donner a un CTO un jeu de requetes concretes pour comprendre le socle sans relire tout le monorepo.

## Avant de commencer

### Acces et prudence

- Utiliser un acces lecture seule quand c'est possible.
- Ne jamais mettre de secret ou de mot de passe en dur dans une commande ou dans ce document.
- Preferer un `DATABASE_URL` deja exporte dans l'environnement.
- Pour toute lecture sensible multi-tenant, garder en tete que:
  - la verite structurelle vit dans les modeles + migrations;
  - la verite runtime de lecture/ecriture depend aussi des services Node/TS et Python;
  - certaines docs historiques peuvent encore mentionner des tables legacy.

### Outils conseilles

```bash
psql "$DATABASE_URL"
```

Exemples utiles:

```bash
psql "$DATABASE_URL" -c "select now();"
psql "$DATABASE_URL" -c "\dn"
psql "$DATABASE_URL" -c "\dt public.*"
```

Si vous travaillez dans une session `psql`, definir des variables une seule fois:

```sql
\set org_id '00000000-0000-0000-0000-000000000000'
\set dataset_id '00000000-0000-0000-0000-000000000000'
\set run_id '00000000-0000-0000-0000-000000000000'
```

### Regle pratique de lecture

Pour toute investigation, suivre cet ordre:

1. verifier la table dans `app-api/app/models/*`;
2. verifier son historique ou ses contraintes dans `app-api/alembic/versions/*`;
3. verifier quels services la lisent ou l'ecrivent dans `app-api-ts/src/services/*` et `app-api/app/services/*`;
4. verifier quel endpoint ou workflow l'expose.

## 1. Cartographier l'existant reel

## Schemas disponibles

```sql
select
  schema_name
from information_schema.schemata
where schema_name not in ('pg_catalog', 'information_schema')
order by schema_name;
```

Ce que vous devez voir:

- `public`
- zero ou plusieurs schemas `{org_slug}_data`

## Tables `public`

```sql
select
  table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
```

Utiliser cette requete en premier pour comparer:

- ce que decrit `docs/DATABASE.md`;
- ce que versionnent les modeles SQLAlchemy;
- ce que lisent les services `app-api-ts`.

## Tables par schema tenant

```sql
select
  table_schema,
  table_name
from information_schema.tables
where table_schema like '%\_data' escape '\'
order by table_schema, table_name;
```

## Colonnes, PK et index d'une table

Remplacer `TABLE_NAME` par la table cible.

```sql
select
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name = 'TABLE_NAME'
order by c.ordinal_position;
```

```sql
select
  i.relname as index_name,
  pg_get_indexdef(ix.indexrelid) as index_def
from pg_class t
join pg_index ix on t.oid = ix.indrelid
join pg_class i on i.oid = ix.indexrelid
join pg_namespace n on n.oid = t.relnamespace
where n.nspname = 'public'
  and t.relname = 'TABLE_NAME'
order by i.relname;
```

## 2. Partir d'une organisation

## Lister les organisations

```sql
select
  id,
  slug,
  name,
  status,
  plan,
  created_at
from organizations
order by created_at desc;
```

## Remonter la topologie d'un tenant

```sql
select
  o.id as organization_id,
  o.slug,
  o.name,
  o.status,
  o.plan,
  count(distinct s.id) as site_count,
  count(distinct d.id) as department_count,
  count(distinct u.id) as user_count
from organizations o
left join sites s on s.organization_id = o.id
left join departments d on d.organization_id = o.id
left join users u on u.organization_id = o.id
where o.id = :'org_id'::uuid
group by o.id, o.slug, o.name, o.status, o.plan;
```

## Inspecter les sites et departements

```sql
select
  s.id,
  s.code,
  s.name,
  s.timezone,
  s.headcount
from sites s
where s.organization_id = :'org_id'::uuid
order by s.name;
```

```sql
select
  d.id,
  d.site_id,
  d.parent_id,
  d.name,
  d.cost_center
from departments d
where d.organization_id = :'org_id'::uuid
order by d.name;
```

## Inspecter les utilisateurs

```sql
select
  u.id,
  u.email,
  u.role,
  u.status,
  u.site_id,
  u.auth_user_id,
  u.last_login_at
from users u
where u.organization_id = :'org_id'::uuid
order by u.created_at desc;
```

Services a relier:

- `app-api-ts/src/services/admin-backoffice.ts`
- `app-api-ts/src/services/admin-monitoring.ts`

## 3. Partir d'un dataset et de l'ingestion

## Datasets d'une organisation

```sql
select
  cd.id,
  cd.name,
  cd.table_name,
  cd.schema_data,
  cd.temporal_index,
  cd.status,
  cd.created_at
from client_datasets cd
where cd.organization_id = :'org_id'::uuid
order by cd.created_at desc;
```

## Colonnes d'un dataset

```sql
select
  dc.dataset_id,
  dc.name,
  dc.dtype,
  dc.role,
  dc.ordinal_position,
  dc.nullable
from dataset_columns dc
where dc.dataset_id = :'dataset_id'::uuid
order by dc.ordinal_position;
```

## Historique d'ingestion

```sql
select
  il.id,
  il.dataset_id,
  il.mode,
  il.status,
  il.rows_received,
  il.rows_transformed,
  il.file_name,
  il.started_at,
  il.completed_at
from ingestion_log il
join client_datasets cd on cd.id = il.dataset_id
where cd.organization_id = :'org_id'::uuid
order by il.started_at desc
limit 50;
```

## Qualite et config pipeline

```sql
select
  qr.id,
  qr.dataset_id,
  qr.ingestion_log_id,
  qr.rows_received,
  qr.duplicates_found,
  qr.outliers_found,
  qr.created_at
from quality_reports qr
join client_datasets cd on cd.id = qr.dataset_id
where cd.organization_id = :'org_id'::uuid
order by qr.created_at desc
limit 50;
```

```sql
select
  pch.id,
  pch.dataset_id,
  pch.changed_by,
  pch.created_at
from pipeline_config_history pch
join client_datasets cd on cd.id = pch.dataset_id
where cd.organization_id = :'org_id'::uuid
order by pch.created_at desc
limit 20;
```

Services a relier:

- Python: `app-api/app/services/datasets.py`
- Node/TS: `app-api-ts/src/services/admin-backoffice.ts`

## 4. Partir des couches operationnelles

## Canonical

```sql
select
  cr.organization_id,
  cr.site_id,
  cr.date,
  cr.shift,
  cr.charge_units,
  cr.capacite_plan_h,
  cr.realise_h,
  cr.abs_h,
  cr.hs_h,
  cr.interim_h
from canonical_records cr
where cr.organization_id = :'org_id'::uuid
order by cr.date desc, cr.site_id, cr.shift
limit 100;
```

## Coverage alerts

```sql
select
  ca.id,
  ca.site_id,
  ca.alert_date,
  ca.shift,
  ca.horizon,
  ca.severity,
  ca.status,
  ca.p_rupture,
  ca.gap_h
from coverage_alerts ca
where ca.organization_id = :'org_id'::uuid
order by ca.alert_date desc
limit 100;
```

## Scenarios

```sql
select
  so.id,
  so.coverage_alert_id,
  so.option_type,
  so.cout_total_eur,
  so.service_attendu_pct,
  so.is_recommended,
  so.is_pareto_optimal
from scenario_options so
where so.organization_id = :'org_id'::uuid
order by so.created_at desc
limit 100;
```

## Decisions operationnelles

```sql
select
  od.id,
  od.coverage_alert_id,
  od.chosen_option_id,
  od.decision_date,
  od.is_override,
  od.override_reason,
  od.cout_observe_eur
from operational_decisions od
where od.organization_id = :'org_id'::uuid
order by od.decision_date desc
limit 100;
```

## Proof / ROI

```sql
select
  pr.id,
  pr.site_id,
  pr.month,
  pr.cout_bau_eur,
  pr.cout_reel_eur,
  pr.gain_net_eur,
  pr.capture_rate,
  pr.adoption_pct
from proof_records pr
where pr.organization_id = :'org_id'::uuid
order by pr.month desc
limit 24;
```

Services a relier:

- `app-api-ts/src/services/operational-data.ts`
- `app-api-ts/src/services/operational-decisions.ts`
- `app-api-ts/src/services/admin-monitoring.ts`
- `app-api-ts/src/services/gold-explorer.ts`

## 5. Partir de DecisionOps

## Approvals

```sql
select
  da.approval_id,
  da.recommendation_id,
  da.site_id,
  da.contract_id,
  da.status,
  da.approver_role,
  da.requested_at,
  da.updated_at
from decision_approvals da
where da.organization_id = :'org_id'::uuid
order by da.requested_at desc
limit 100;
```

## Action dispatches

```sql
select
  ad.action_id,
  ad.recommendation_id,
  ad.approval_id,
  ad.site_id,
  ad.contract_id,
  ad.status,
  ad.dispatch_mode,
  ad.updated_at
from action_dispatches ad
where ad.organization_id = :'org_id'::uuid
order by ad.updated_at desc
limit 100;
```

## Ledger entries

```sql
select
  dle.ledger_id,
  dle.revision,
  dle.recommendation_id,
  dle.action_id,
  dle.site_id,
  dle.contract_id,
  dle.status,
  dle.validation_status,
  dle.updated_at
from decision_ledger_entries dle
where dle.organization_id = :'org_id'::uuid
order by dle.updated_at desc
limit 100;
```

## Contrats et configuration de decision

Ces tables sont surtout portees par la couche TypeScript:

- `decision_engine_config_versions`
- `decision_engine_config_audit`
- `decision_contract_versions`
- `decision_contract_audit`

Exemples:

```sql
select *
from decision_engine_config_versions
where organization_id = :'org_id'::uuid
order by created_at desc
limit 20;
```

```sql
select *
from decision_contract_versions
where organization_id = :'org_id'::uuid
order by created_at desc
limit 20;
```

Services a relier:

- `app-api-ts/src/services/decisionops-runtime.ts`
- `app-api-ts/src/services/decisionops-runtime-approval.ts`
- `app-api-ts/src/services/decisionops-runtime-action.ts`
- `app-api-ts/src/services/decisionops-runtime-ledger.ts`
- `app-api-ts/src/services/decision-config.ts`
- `app-api-ts/src/services/decision-contract-runtime.ts`

## 6. Partir de l'onboarding

Il existe deux surfaces a ne pas melanger:

- historique: `onboarding_states`
- BPM courant: `onboarding_cases`, `onboarding_case_tasks`, `onboarding_case_blockers`, `onboarding_case_events`

## Etats historiques

```sql
select
  os.id,
  os.organization_id,
  os.status,
  os.current_step,
  os.steps_completed,
  os.updated_at
from onboarding_states os
where os.organization_id = :'org_id'::uuid;
```

## Cases BPM

```sql
select
  oc.id,
  oc.organization_id,
  oc.status,
  oc.phase,
  oc.activation_mode,
  oc.environment_target,
  oc.workflow_provider,
  oc.process_instance_key,
  oc.updated_at
from onboarding_cases oc
where oc.organization_id = :'org_id'::uuid
order by oc.updated_at desc;
```

## Taches

```sql
select
  oct.id,
  oct.case_id,
  oct.task_key,
  oct.domain,
  oct.task_type,
  oct.status,
  oct.assignee_user_id,
  oct.sort_order
from onboarding_case_tasks oct
join onboarding_cases oc on oc.id = oct.case_id
where oc.organization_id = :'org_id'::uuid
order by oct.sort_order, oct.created_at;
```

## Blockers

```sql
select
  ocb.id,
  ocb.case_id,
  ocb.blocker_key,
  ocb.domain,
  ocb.severity,
  ocb.status,
  ocb.opened_at,
  ocb.resolved_at
from onboarding_case_blockers ocb
join onboarding_cases oc on oc.id = ocb.case_id
where oc.organization_id = :'org_id'::uuid
order by ocb.opened_at desc;
```

## Evenements

```sql
select
  oce.id,
  oce.case_id,
  oce.actor_user_id,
  oce.event_type,
  oce.message,
  oce.occurred_at
from onboarding_case_events oce
join onboarding_cases oc on oc.id = oce.case_id
where oc.organization_id = :'org_id'::uuid
order by oce.occurred_at desc
limit 100;
```

Services a relier:

- `app-api-ts/src/services/admin-onboarding.ts`
- `app-api-ts/src/services/admin-onboarding-store.ts`
- `app-api-ts/src/services/admin-onboarding-runtime.ts`
- `app-api-ts/src/services/admin-onboarding-camunda.ts`

## 7. Partir d'un `sync_run` d'integration

## Lister les connexions

```sql
select
  ic.id,
  ic.vendor,
  ic.auth_mode,
  ic.status,
  ic.created_at
from integration_connections ic
where ic.organization_id = :'org_id'::uuid
order by ic.created_at desc;
```

## Lister les runs

```sql
select
  isr.id,
  isr.connection_id,
  isr.trigger_type,
  isr.status,
  isr.source_window_start,
  isr.source_window_end,
  isr.started_at,
  isr.ended_at,
  isr.records_fetched,
  isr.records_written,
  isr.error_code
from integration_sync_runs isr
where isr.organization_id = :'org_id'::uuid
order by isr.created_at desc
limit 100;
```

## Partir d'un run et retrouver le state, les raw events et les erreurs

```sql
select *
from integration_sync_state
where last_run_id = :'run_id'::uuid;
```

```sql
select
  ire.id,
  ire.connection_id,
  ire.sync_run_id,
  ire.source_object,
  ire.source_record_id,
  ire.event_id,
  ire.source_updated_at,
  ire.object_store_key,
  ire.created_at
from integration_raw_events ire
where ire.sync_run_id = :'run_id'::uuid
order by ire.created_at desc
limit 200;
```

```sql
select
  iee.id,
  iee.connection_id,
  iee.sync_run_id,
  iee.error_class,
  iee.error_code,
  iee.message_redacted,
  iee.created_at
from integration_error_events iee
where iee.sync_run_id = :'run_id'::uuid
order by iee.created_at desc;
```

```sql
select
  idl.id,
  idl.connection_id,
  idl.sync_run_id,
  idl.reason_code,
  idl.status,
  idl.requeue_count,
  idl.next_retry_at,
  idl.created_at
from integration_dead_letter_queue idl
where idl.sync_run_id = :'run_id'::uuid
order by idl.created_at desc;
```

Services et runtimes a relier:

- `app-connectors/src/service.ts`
- `app-api/app/services/integration_runtime_worker.py`
- `app-api/app/services/integration_sync_queue_worker.py`
- `app-api/app/services/integration_event_ingestor.py`

## 8. Partir de Gold et de la provenance

La couche Gold expose une lecture produit via `app-api-ts/src/services/gold-explorer.ts`, mais une partie de la provenance vient:

- du schema `public`
- des tables catalogue/ingestion
- des schemas `{org}_data`

## Lister les schemas tenant pour une organisation

```sql
select
  o.id,
  o.slug,
  o.name,
  o.slug || '_data' as expected_data_schema
from organizations o
where o.id = :'org_id'::uuid;
```

## Lister les tables `raw` et `transformed` d'un tenant

Remplacer `ORG_SCHEMA` par le schema cible, par exemple `acme_data`.

```sql
select
  table_name
from information_schema.tables
where table_schema = 'ORG_SCHEMA'
order by table_name;
```

## Voir les dernieres ingestions qui alimentent la lecture Gold

```sql
select
  cd.name as dataset_name,
  cd.table_name,
  il.status,
  il.rows_received,
  il.rows_transformed,
  il.completed_at
from client_datasets cd
join ingestion_log il on il.dataset_id = cd.id
where cd.organization_id = :org_id::uuid
order by il.completed_at desc nulls last
limit 50;
```

## Voir la provenance fonctionnelle cote produit

La lecture produit des surfaces Gold et provenance passe surtout par:

- `app-api-ts/src/services/gold-explorer.ts`
- `app-api-ts/src/services/operational-data.ts`

Le but du CTO n'est pas seulement de verifier qu'une table existe, mais de repondre a:

- quelle source alimente la vue;
- quelle couche fait foi;
- quelle table est persistante et laquelle est derivee;
- quel service renvoie le JSON final.

## 9. Verifier RLS et scope tenant

Ne pas supposer qu'un `SELECT` brut depuis `psql` reproduit le comportement applicatif. Pour verifier le mecanisme, simuler le contexte RLS:

```sql
begin;
select set_config('app.current_organization_id', :'org_id'::text, true);

select current_setting('app.current_organization_id', true);

select count(*)
from users;

rollback;
```

Pour une table tenant-scoped:

```sql
begin;
select set_config('app.current_organization_id', :'org_id'::text, true);

select
  organization_id,
  count(*)
from coverage_alerts
group by organization_id;

rollback;
```

Ce test ne remplace pas la verification applicative, mais permet de confirmer:

- la presence de la variable de contexte;
- la reaction des policies RLS;
- la separation entre lecture brute et lecture scopee.

## 10. Remonter d'une page ou d'un endpoint vers les tables

## A partir d'une page admin

Exemple: detail d'organisation admin.

1. partir du path UI;
2. retrouver l'endpoint appele dans `app-admin/lib/api/*`;
3. retrouver la route `app-api-ts/src/routes.ts`;
4. retrouver le service Node/TS appele;
5. relever les tables SQL lues ou ecrites;
6. verifier si la table est Python-owned, TS-owned ou shared.

Exemples rapides:

- organisations / users / audit:
  `app-api-ts/src/services/admin-backoffice.ts`
- monitoring:
  `app-api-ts/src/services/admin-monitoring.ts`
- onboarding:
  `app-api-ts/src/services/admin-onboarding.ts`
- integrations:
  `app-api-ts` puis `app-connectors` puis `app-api`

## A partir d'une page produit

Exemples rapides:

- dashboard, forecasts, proof:
  `app-api-ts/src/services/operational-data.ts`
- workspace de decision:
  `app-api-ts/src/services/operational-decisions.ts`
- surfaces Gold:
  `app-api-ts/src/services/gold-explorer.ts`

## 11. Remonter d'une table vers les services

Raccourcis utiles:

```bash
rg -n "TABLE_NAME" app-api app-api-ts app-connectors
```

Exemples:

```bash
rg -n "coverage_alerts" app-api app-api-ts
rg -n "integration_sync_runs" app-api app-api-ts app-connectors
rg -n "onboarding_cases" app-api app-api-ts
rg -n "decision_ledger_entries" app-api app-api-ts
```

Logique de lecture:

- si la table est dans `app-api/app/models/*`, elle fait partie du schema versionne principal;
- si la table n'existe que dans les migrations TS, elle peut etre surtout portee par `app-api-ts`;
- si la lecture passe par `app-connectors`, verifier aussi l'etat reel runtime snapshot vs la cible relationnelle `integration_*`.

## 12. Signaux d'alerte a garder en tete

- `docs/DATABASE.md` est tres utile, mais peut encore contenir des references historiques.
- `employees` et `action_plans` apparaissent dans l'historique, mais il faut verifier le schema courant avant de conclure.
- `decisions` ne doit pas etre confondu avec `operational_decisions` ni avec le runtime DecisionOps.
- `onboarding_states` ne doit pas etre confondu avec `onboarding_cases*`.
- cote integrations, ne pas confondre la cible `integration_*` avec la persistence runtime actuelle de `app-connectors`.

## 13. Checklist rapide pour une investigation CTO

- [ ] J'ai identifie l'organisation et son schema tenant attendu.
- [ ] J'ai localise la table dans les modeles et les migrations.
- [ ] J'ai verifie quel service la lit ou l'ecrit.
- [ ] J'ai distingue table source, projection, read-model et surface legacy.
- [ ] J'ai regarde le flux complet jusqu'a l'endpoint ou a la page.
- [ ] J'ai note les points de divergence doc-vers-code a corriger dans la doc durable.

## 14. Suivre un flux de donnees de bout en bout dans les logs

Voir aussi: `docs/cto/14-telemetry-et-correlation.md`

Le but n'est pas de remplacer l'investigation SQL, mais de recoller rapidement:

- le hop front/BFF;
- `app-api-ts`;
- `app-connectors` si le flux touche aux integrations;
- les workers Python si le flux devient batch ou data-plane.

### Champs a utiliser

Ordre pratique:

1. `request_id` quand vous partez d'une requete ou d'un ecran;
2. `trace_id` quand le flux traverse plusieurs hops;
3. `connector_run_id` quand un `sync_run` est implique;
4. `run_id` pour les jobs ou executions longues;
5. `organization_id` pour filtrer le tenant.

### Rechercher dans les logs structures

Exemples generiques:

```bash
rg -n '"request_id":"REQ_ID"' /path/to/logs
rg -n '"trace_id":"TRACE_ID"' /path/to/logs
rg -n '"connector_run_id":"RUN_ID"' /path/to/logs
rg -n '"organization_id":"ORG_ID"' /path/to/logs
```

### Cas 1: partir d'une erreur admin ou produit

1. Recuperer le `request_id` depuis la reponse, les headers ou le log HTTP.
2. Chercher ce `request_id` dans les logs BFF et `app-api-ts`.
3. Noter le `trace_id` associe.
4. Si la route appelle `app-connectors`, rechercher ce `trace_id` puis le `organization_id` dans les logs connecteurs.
5. Si le flux devient batch, rechercher le meme `trace_id` ou le `connector_run_id` cote Python.

### Cas 2: partir d'un `sync_run`

1. Partir du `connector_run_id` ou de l'identifiant du run.
2. Chercher ce champ dans `app-connectors`.
3. Chercher le meme champ dans les logs Python des workers (`integration_sync_queue_worker`, `integration_runtime_worker`, `integration_sync_worker.py`).
4. Revenir ensuite en base sur:
   - `integration_sync_runs`
   - `integration_sync_state`
   - `integration_raw_events`
   - et, si besoin, le payload store.

### Cas 3: partir d'une anomalie data/ML

1. Partir de `organization_id` et, si disponible, de `run_id`.
2. Chercher `run_id` dans les logs Python batch.
3. Relever `trace_id` et `request_id` quand ils sont presents.
4. Recoller les hops amont dans `app-api-ts` ou `app-connectors` avant de revenir aux tables et schemas impactes.

### Regle de prudence

Les logs aident a reconstituer le parcours, mais ils ne remplacent pas:

- la verite structurelle des modeles et migrations;
- la verite persistante des tables et read-models;
- la verification des scopes tenant et RLS.
