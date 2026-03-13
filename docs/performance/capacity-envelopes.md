# Capacity envelopes

Date de reference: 2026-03-12

Ce document fixe les envelopes de charge et de cout a tenir avant d'ouvrir une nouvelle piste d'optimisation structurelle. Les chiffres sont des garde-fous internes de pilotage, pas des engagements contractuels.

## Baseline machine-readable

Le bloc suivant est la baseline executable de ce document. Il doit rester aligne avec la prose et valider via `pnpm performance:validate-budgets`.

<!-- performance-capacity-baseline:start -->

```json
{
  "baseline_type": "performance-capacity-envelopes",
  "schema_version": "1",
  "reference_date": "2026-03-12",
  "target_load_profile": "T2",
  "load_classes": {
    "T1": {
      "sites_per_org_max": 5,
      "monthly_active_users_max": 100,
      "active_connectors_max": 10,
      "canonical_rows_per_day_max": 250000
    },
    "T2": {
      "sites_per_org_max": 25,
      "monthly_active_users_max": 500,
      "active_connectors_max": 30,
      "canonical_rows_per_day_max": 2000000
    },
    "T3": {
      "sites_per_org_max": 75,
      "monthly_active_users_max": 1500,
      "active_connectors_max": 80,
      "canonical_rows_per_day_max": 10000000
    }
  },
  "connector_limits": [
    {
      "id": "runs_per_connection",
      "direction": "max",
      "unit": "count",
      "standard": 1,
      "soft": 1,
      "hard": 1
    },
    {
      "id": "runs_per_org",
      "direction": "max",
      "unit": "count",
      "standard": 1,
      "soft": 2,
      "hard": 4
    },
    {
      "id": "runs_platform_wide",
      "direction": "max",
      "unit": "count",
      "standard": 4,
      "soft": 8,
      "hard": 12
    },
    {
      "id": "default_sync_interval_minutes",
      "direction": "min",
      "unit": "minutes",
      "standard": 30,
      "soft": 15,
      "hard": 5
    },
    {
      "id": "raw_rows_per_incremental_sync",
      "direction": "max",
      "unit": "rows",
      "standard": 20000,
      "soft": 50000,
      "hard": 200000
    },
    {
      "id": "compressed_payload_mb_per_sync",
      "direction": "max",
      "unit": "megabytes",
      "standard": 25,
      "soft": 100,
      "hard": 500
    },
    {
      "id": "canonical_rows_per_org_per_day",
      "direction": "max",
      "unit": "rows",
      "standard": 500000,
      "soft": 2000000,
      "hard": 10000000
    }
  ],
  "backfill_profiles": [
    {
      "id": "standard",
      "max_days": 30,
      "max_raw_rows": 1000000,
      "p95_minutes": 360,
      "p99_minutes": 720,
      "max_active_per_org": 1,
      "max_active_platform_wide": 3
    },
    {
      "id": "extended",
      "max_days": 90,
      "max_raw_rows": 5000000,
      "p95_minutes": 1440,
      "p99_minutes": 2880,
      "max_active_per_org": 1,
      "max_active_platform_wide": 3
    }
  ],
  "quotas": [
    {
      "id": "api_reads_per_user_rps",
      "direction": "max",
      "unit": "req_per_second",
      "standard": 10,
      "soft": 10,
      "hard": 20
    },
    {
      "id": "api_reads_per_org_rps",
      "direction": "max",
      "unit": "req_per_second",
      "standard": 30,
      "soft": 30,
      "hard": 60
    },
    {
      "id": "api_writes_per_user_rps",
      "direction": "max",
      "unit": "req_per_second",
      "standard": 2,
      "soft": 2,
      "hard": 5
    },
    {
      "id": "api_writes_per_org_rps",
      "direction": "max",
      "unit": "req_per_second",
      "standard": 10,
      "soft": 10,
      "hard": 20
    },
    {
      "id": "job_launches_per_org_per_10_minutes",
      "direction": "max",
      "unit": "jobs",
      "standard": 3,
      "soft": 3,
      "hard": 10
    },
    {
      "id": "connector_probes_per_connection_per_10_minutes",
      "direction": "max",
      "unit": "tests",
      "standard": 5,
      "soft": 5,
      "hard": 20
    },
    {
      "id": "synchronous_json_payload_kb",
      "direction": "max",
      "unit": "kilobytes",
      "standard": 250,
      "soft": 250,
      "hard": 1024
    },
    {
      "id": "ui_rows_per_page",
      "direction": "max",
      "unit": "rows",
      "standard": 50,
      "soft": 50,
      "hard": 200
    }
  ],
  "resource_guardrails": [
    {
      "id": "frontend_cpu_percent",
      "comparison": "greater_than",
      "yellow": 70,
      "red": 85,
      "unit": "percent"
    },
    {
      "id": "api_ts_db_pool_usage_percent",
      "comparison": "greater_than",
      "yellow": 70,
      "red": 80,
      "unit": "percent"
    },
    {
      "id": "connectors_backlog_cadence_multiplier",
      "comparison": "greater_than",
      "yellow": 2,
      "red": 6,
      "unit": "ratio"
    },
    {
      "id": "python_job_queue_wait_minutes",
      "comparison": "greater_than",
      "yellow": 10,
      "red": 30,
      "unit": "minutes"
    },
    {
      "id": "cost_budget_consumption_percent",
      "comparison": "greater_than",
      "yellow": 90,
      "red": 110,
      "unit": "percent"
    }
  ],
  "cost_envelopes_eur": [
    {
      "id": "shared_online_monthly",
      "ceiling_eur": 1200
    },
    {
      "id": "shared_data_plane_monthly",
      "ceiling_eur": 1200
    },
    {
      "id": "staging_ci_and_margin_monthly",
      "ceiling_eur": 400
    },
    {
      "id": "shared_platform_total_monthly",
      "ceiling_eur": 2800
    },
    {
      "id": "tenant_variable_t1_monthly",
      "ceiling_eur": 120
    },
    {
      "id": "tenant_variable_t2_monthly",
      "ceiling_eur": 350
    },
    {
      "id": "tenant_variable_t3_monthly",
      "ceiling_eur": 900
    },
    {
      "id": "standard_backfill_per_connection",
      "ceiling_eur": 20
    },
    {
      "id": "extended_backfill_per_connection",
      "ceiling_eur": 75
    }
  ],
  "architecture_review_triggers": [
    "multi_connector_polling_below_15_minutes",
    "retention_doubles_storage_within_90_days",
    "interactive_endpoint_requires_full_db_scan",
    "commercial_need_exceeds_t3_without_budget",
    "backfill_or_replay_threatens_interactive_traffic"
  ]
}
```

<!-- performance-capacity-baseline:end -->

## Envelope de charge cible

La cible build-ready par defaut est `T2`:

- jusqu'a `25` sites par org;
- jusqu'a `500` utilisateurs actifs par mois par org;
- jusqu'a `30` connecteurs actifs par org;
- jusqu'a `2M` lignes canoniques par jour par org.

`T3` reste supportable sans refonte seulement si les quotas et la priorisation de file restent actifs. Au-dela, il faut une revue architecture/cout.

## Volumes connecteurs

| Dimension                             | Cible standard | Limite soft | Limite hard | Cadre                                              |
| ------------------------------------- | -------------: | ----------: | ----------: | -------------------------------------------------- |
| Runs simultanes par connexion         |              1 |           1 |           1 | une connexion ne lance jamais 2 syncs en parallele |
| Runs simultanes par org               |              1 |           2 |           4 | au-dela, file et priorisation obligatoires         |
| Runs simultanes plateforme            |              4 |           8 |          12 | proteger API, DB et workers                        |
| Intervalle de sync par defaut         |         30 min |      15 min |       5 min | < 15 min demande une exception explicite           |
| Lignes brutes par sync incremental    |            20k |         50k |        200k | chunking obligatoire au-dela de 50k                |
| Payload compresse par sync            |          25 MB |      100 MB |      500 MB | au-dela: staging objet + traitement par lot        |
| Lignes canoniques par org et par jour |           500k |          2M |         10M | au-dela de 2M on entre en zone `T3`                |

## Backfill et replay

Regles de base:

- Le mode normal reste incremental depuis watermark.
- Le backfill est toujours async, idempotent, chunked par page ou par jour, et observable.
- Un backfill ne doit jamais faire tomber les budgets API/UI du trafic interactif.

| Type de demande   | Volume max                                       | Cadre d'execution                              | Delai cible |
| ----------------- | ------------------------------------------------ | ---------------------------------------------- | ----------- |
| Backfill standard | <= 30 jours ou <= 1M lignes brutes par connexion | fond de file, heures creuses preferees         | <= 6 h p95  |
| Backfill etendu   | <= 90 jours ou <= 5M lignes brutes par connexion | validation ops + surveillance DB/queue         | <= 24 h p95 |
| Replay massif     | > 90 jours ou > 5M lignes brutes                 | revue architecture + budget cout + kill switch | plan dedie  |

Gardes obligatoires:

- `1` backfill actif max par org.
- `3` backfills actifs max sur la plateforme.
- Pause automatique des nouveaux backfills si `Postgres`, la file connecteurs ou les APIs interactives passent en zone rouge.
- Pas de backfill si le modele de scoping tenant/site ou la logique de quarantaine n'est pas preserve.

## Quotas applicatifs

| Quota                                  | Valeur par defaut |         Limite hard | Objectif                            |
| -------------------------------------- | ----------------: | ------------------: | ----------------------------------- |
| Lectures API par utilisateur           |          10 req/s |      20 req/s burst | eviter le spam UI ou scripts        |
| Lectures API par org                   |          30 req/s | 60 req/s burst 30 s | proteger le multi-tenant            |
| Ecritures API par utilisateur          |           2 req/s |       5 req/s burst | proteger transactions et lock DB    |
| Ecritures API par org                  |          10 req/s |      20 req/s burst | eviter les tempetes de mutations    |
| Lancement sync/export/backfill par org |        3 / 10 min |              10 / h | limiter l'auto-saturation ops       |
| Probe/test connecteur par connexion    |        5 / 10 min |              20 / h | proteger vendors et secret backends |
| Taille JSON synchrone                  |      250 KB cible |                1 MB | au-dela: pagination ou export       |
| Lignes retournees par page UI          |          50 cible |                 200 | au-dela: pagination ou export CSV   |

## Capacity planning containers

Les containers se dimensionnent par classe de surface et non par "taille moyenne de la plateforme". Le but est de garder une marge claire avant saturation et d'eviter qu'un scale-out Node detruise le budget DB.

| Surface                                          | Capacite a planifier                     | Cible build-ready                                | Zone jaune                           | Zone rouge                                    | Premiere action                                   |
| ------------------------------------------------ | ---------------------------------------- | ------------------------------------------------ | ------------------------------------ | --------------------------------------------- | ------------------------------------------------- |
| Frontends Next.js (`landing`, `webapp`, `admin`) | replicas, CPU, memoire, cold starts      | marge CPU >= 30% sur charge `T2`                 | CPU > 70% ou cold starts > 5% trafic | CPU > 85%, OOM ou `p99` > 2x budget           | corriger bundle/media/fetch puis ajouter replicas |
| `app-api-ts`                                     | replicas, pool DB, event loop            | pool DB avec marge >= 25%, event loop lag faible | CPU > 70%, memoire > 75%, pool > 70% | pool > 80%, event loop lag > 150 ms, 5xx > 1% | corriger route/SQL avant scale-out                |
| `app-connectors`                                 | workers d'ingestion, concurrence par org | backlog <= 2x cadence normale                    | backlog > 2x cadence, retries > 5%   | backlog > 6x cadence, DLQ > 1% runs           | reduire concurrence, chunker, throttler           |
| Jobs Python                                      | workers forecasts/proof/backfill separes | attente file <= 10 min                           | attente > 10 min                     | attente > 30 min ou OOM                       | reprioriser files, reduire batch                  |

Regles associees:

- Toute augmentation de replicas `app-api-ts` ou workers doit recalculer le maximum de connexions DB et la memoire associee.
- Une surface online ne depend pas d'un worker batch pour rester navigable.
- Les classes de job lourdes doivent rester separees des classes interactives pour que la saturation soit contenue.

## Capacity planning Postgres

| Dimension                     | Cible build-ready `T2`           | Zone jaune     | Zone rouge                | Decision attendue                                     |
| ----------------------------- | -------------------------------- | -------------- | ------------------------- | ----------------------------------------------------- |
| Connexions actives            | <= 70% du pool total             | > 70%          | > 80%                     | geler scale-out online, revoir pooling et concurrence |
| Requete dominante interactive | <= 300 ms p95                    | > 300 ms       | > 1000 ms                 | index, projection, cache ou pagination avant upscale  |
| Requete dominante analytique  | <= 2 s p95 hors online           | > 2 s          | > 5 s                     | basculer hors trafic online, materialiser, decouper   |
| Croissance stockage utile     | <= 5% / semaine                  | > 5% / semaine | > 10% / semaine           | retention, archive, reduction full refresh            |
| Vacuum/bloat                  | vacuum a l'heure, bloat maitrise | retard > 1 h   | retard > 6 h ou deadlocks | reduire ecritures concurrentes, maintenance ciblee    |

Regles associees:

- Un endpoint interactif ne doit jamais faire un scan complet multi-tenant pour tenir un cas nominal.
- Les lectures qui servent plusieurs ecrans doivent viser des projections stables ou des requetes indexees, pas des jointures opportunistes.
- Une hausse de stockage due a des snapshots, exports ou raw payloads doit etre visible separement du stockage transactionnel.

## Capacity planning stockage objet

Le stockage objet couvre typiquement raw payloads connecteurs, evidence packs, exports et artefacts de reparation.

| Classe d'objet                    | Usage nominal                      | Regle de retention build-ready          | Signal jaune                        | Signal rouge                            |
| --------------------------------- | ---------------------------------- | --------------------------------------- | ----------------------------------- | --------------------------------------- |
| Payloads bruts connecteurs        | relecture, debug, reprocess limite | retention courte explicite + lifecycle  | croissance > 10% / semaine          | croissance > 25% / semaine              |
| Proof packs et exports            | consultation et audit              | retention versionnee et duree explicite | egress ou stockage > budget mensuel | objet critique sans politique lifecycle |
| Artefacts temporaires de backfill | reparation ponctuelle              | expiration automatique obligatoire      | reste > 7 jours                     | pas d'expiration                        |

Regles associees:

- Pas de stockage objet illimite "au cas ou".
- Une feature qui ajoute un nouvel objet doit definir taille moyenne, cardinalite, retention et egress attendue.
- Un full refresh qui produit des artefacts volumineux doit etre budgete comme un cout one-shot visible.

## Full refresh et operations d'exception

Le build-ready exclut toute dependance implicite a un full refresh sur les surfaces critiques. Les seuls cas admis sont:

- bootstrap initial d'un connecteur;
- reparation operateur explicite;
- migration de schema ou reindexation planifiee.

Chaque exception doit porter les cinq champs suivants:

1. volume maximal par execution;
2. fenetre horaire autorisee;
3. file ou workers dedies;
4. kill switch ou bouton d'arret;
5. cout max attendu en compute, DB et stockage objet.

Si un de ces champs manque, l'operation n'est pas consideree build-ready.

## Signaux de saturation

| Couche               | Zone jaune                                                                                 | Zone rouge                                                                | Reaction attendue                                                     |
| -------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| UI/API Node          | `p95` > budget +20% sur 15 min, CPU > 70%, memoire > 75%, event loop lag > 75 ms           | `p99` > 2x budget sur 5 min, 5xx > 1%, redemarrages repetes               | reduire polling, throttler routes lourdes, isoler endpoint fautif     |
| Postgres             | connexions actives > 70% du pool, requete lente > 500 ms, croissance stockage > 5%/semaine | connexions > 80%, requete > 1 s, deadlock non nul, vacuum en retard > 1 h | couper concurrence, corriger index/requetes, repousser backfills      |
| Connecteurs          | age du plus vieux job > 2x intervalle de sync, retries > 5%, erreurs vendor 429 > 2%       | age > 6x intervalle, DLQ > 100 items ou > 1% des runs, backlog > 24 h     | ralentir cadence, reduire concurrence, prioriser incremental          |
| Jobs Python/forecast | attente file > 10 min, CPU > 80%, memoire > 75%                                            | attente > 30 min, taux echec > 2%/jour, worker OOM                        | stopper replays non critiques, ajouter marge batch, corriger hot path |
| Cout infra           | projection mensuelle > 90% budget avant J20, observabilite > 15% de la facture             | projection > 110% budget mensuel, un tenant > 20% de la facture           | geler nouvelles charges, revoir quotas, recalibrer retention          |

## Envelopes de cout infra

Ces envelopes servent a juger si une feature reste dans la zone "build-ready" sans plan FinOps dedie.

| Poste                                                                                         |              Envelope mensuelle |
| --------------------------------------------------------------------------------------------- | ------------------------------: |
| Base partagee online (`landing`, `webapp`, `admin`, `api`, `auth`, control plane connecteurs) |                     <= 1200 EUR |
| Data plane partage (`Postgres`, sauvegardes, stockage objet, logs essentiels)                 |                     <= 1200 EUR |
| Staging, CI, tests de charge et marge incident                                                |                      <= 400 EUR |
| Total plateforme partagee avant sizing dedie                                                  |                     <= 2800 EUR |
| Cout variable incremental `T1` par tenant                                                     |                      <= 120 EUR |
| Cout variable incremental `T2` par tenant                                                     |                      <= 350 EUR |
| Cout variable incremental `T3` par tenant                                                     | <= 900 EUR avec revue explicite |
| Backfill standard 30 jours / 1M lignes                                                        |         <= 20 EUR par connexion |
| Backfill etendu 90 jours / 5M lignes                                                          |         <= 75 EUR par connexion |

## Regles de mesure du cout

1. Mesurer le cout sur un equivalent mensuel, pas sur un pic de 30 minutes.
2. Distinguer cout partage et cout variable par tenant.
3. Inclure seulement le cout infra recurrent ou one-shot technique: compute, DB, stockage, egress, logs/metrics, pas le temps humain.
4. Toute feature qui ajoute > `150 EUR/mois` de cout partage ou > `15%` de cout variable par tenant doit arriver avec quota, kill switch et plan d'extinction.

## Monitoring cout et capacite

Le suivi build-ready doit pouvoir attribuer un cout et un volume minimum a chaque surface critique:

| Surface               | Mesure minimale attendue                          | Cadence de revue            | Action si derive                               |
| --------------------- | ------------------------------------------------- | --------------------------- | ---------------------------------------------- |
| Frontends online      | requetes, CPU, memoire, cold starts               | hebdomadaire                | corriger bundle/fetch, ajuster replicas        |
| API online            | req/s, `p95`, erreurs, connexions DB, poids JSON  | hebdomadaire                | optimiser route, throttler, scaler si legitime |
| Connecteurs           | runs, backlog, retries, 429 vendors, volume brut  | hebdomadaire                | ralentir cadence, chunker, revoir quota        |
| Jobs Python           | temps file, duree job, echec, consommation worker | hebdomadaire                | separer files, reduire batch, scaler workers   |
| DB + stockage objet   | croissance utile, backup, retention, egress       | hebdomadaire et fin de mois | archive, lifecycle, revue retention            |
| Cout total plateforme | partage vs variable par tenant                    | mensuelle                   | geler nouvelles charges non budgetees          |

Regles associees:

- Un tenant ne doit pas pouvoir representer > 20% du cout plateforme sans revue explicite.
- Une hausse de cout sans hausse de volume exploitable est consideree comme un incident de capacite ou d'hygiene.
- Les dashboards de cout doivent distinguer compute, DB, objet, observabilite et trafic de fond.

## Cas qui imposent une revue architecture

- nouvelle feature qui exige un polling < `15 min` sur plusieurs connecteurs;
- augmentation de retention qui double le stockage utile en moins de 90 jours;
- endpoint interactif qui a besoin d'un scan DB complet ou d'une agregation multi-tenant non materialisee;
- demande commerciale qui depasse `T3` sans budget infra dedie;
- backfill ou replay qui menace le trafic interactif ou les delais forecast/proof pack.
