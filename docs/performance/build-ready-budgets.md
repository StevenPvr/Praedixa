# Budgets performance build-ready

Date de reference: 2026-03-12

Ces budgets couvrent le chemin synchrone visible par l'utilisateur et les delais async qui conditionnent la promesse produit. Ils sont calibres pour une charge `T2` par defaut; `T1` doit passer avec marge, `T3` reste acceptable tant qu'il ne force pas de re-architecture.

## Baseline machine-readable

Le bloc suivant est la baseline executable de ce document. Il doit rester aligne avec la prose et valider via `pnpm performance:validate-budgets`.

<!-- performance-budget-baseline:start -->

```json
{
  "baseline_type": "performance-budgets",
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
  "api_budgets": [
    {
      "id": "tenant_indexed_read",
      "p95_ms": 300,
      "p99_ms": 700,
      "max_response_kb": 250,
      "max_dominant_sql_queries": 5
    },
    {
      "id": "dashboard_aggregate_read",
      "p95_ms": 800,
      "p99_ms": 1500,
      "max_response_kb": 250,
      "max_data_sources": 6
    },
    {
      "id": "simple_write",
      "p95_ms": 500,
      "p99_ms": 1200
    },
    {
      "id": "queued_write",
      "p95_ms": 900,
      "p99_ms": 2000
    },
    {
      "id": "session_auth_json",
      "p95_ms": 350,
      "p99_ms": 800
    },
    {
      "id": "webhook_ack",
      "p95_ms": 250,
      "p99_ms": 600
    }
  ],
  "ui_budgets": [
    {
      "id": "authenticated_initial_route",
      "p95_ms": 2500,
      "p99_ms": 4000
    },
    {
      "id": "heavy_initial_route",
      "p95_ms": 3500,
      "p99_ms": 5500
    },
    {
      "id": "same_shell_navigation",
      "p95_ms": 1200,
      "p99_ms": 2200
    },
    {
      "id": "site_or_filter_change",
      "p95_ms": 900,
      "p99_ms": 1600
    },
    {
      "id": "confirmed_action",
      "p95_ms": 1000,
      "p99_ms": 1800
    },
    {
      "id": "local_interaction",
      "p95_ms": 200,
      "p99_ms": 350
    }
  ],
  "journey_budgets": [
    {
      "id": "login_to_dashboard",
      "p95_ms": 4000,
      "p99_ms": 6500
    },
    {
      "id": "dashboard_site_change",
      "p95_ms": 1200,
      "p99_ms": 2200
    },
    {
      "id": "actions_page_open",
      "p95_ms": 2500,
      "p99_ms": 4500
    },
    {
      "id": "decision_resolution",
      "p95_ms": 1000,
      "p99_ms": 1800
    },
    {
      "id": "connector_test",
      "p95_ms": 6000,
      "p99_ms": 12000
    },
    {
      "id": "manual_sync_job_creation",
      "p95_ms": 1500,
      "p99_ms": 3000
    }
  ],
  "async_budgets": [
    {
      "id": "incremental_connector_sync",
      "p95_minutes": 10,
      "p99_minutes": 20
    },
    {
      "id": "forecast_and_scenarios",
      "p95_minutes": 15,
      "p99_minutes": 30
    },
    {
      "id": "proof_pack_generation",
      "p95_minutes": 5,
      "p99_minutes": 15
    },
    {
      "id": "standard_connector_backfill",
      "p95_minutes": 360,
      "p99_minutes": 720
    }
  ],
  "cache_policies": [
    {
      "id": "session_auth",
      "ttl_seconds_min": 0,
      "ttl_seconds_max": 0,
      "scope": ["user", "app_origin"],
      "requires_invalidation": [
        "login",
        "logout",
        "token_rotation",
        "401_or_403"
      ]
    },
    {
      "id": "dashboard_kpis",
      "ttl_seconds_min": 30,
      "ttl_seconds_max": 120,
      "scope": ["tenant", "site", "time_window", "config_version"],
      "requires_invalidation": [
        "site_change",
        "config_publish",
        "sync_complete",
        "impacting_mutation"
      ]
    },
    {
      "id": "alerts_and_actions_lists",
      "ttl_seconds_min": 15,
      "ttl_seconds_max": 60,
      "scope": ["tenant", "site", "filters", "pagination"],
      "requires_invalidation": [
        "resolve",
        "ack",
        "action_dispatch",
        "site_change"
      ]
    },
    {
      "id": "config_reference_data",
      "ttl_seconds_min": 60,
      "ttl_seconds_max": 300,
      "scope": ["tenant", "resource", "version"],
      "requires_invalidation": ["save", "publish", "rollback", "metadata_sync"]
    },
    {
      "id": "monitoring_cost_reads",
      "ttl_seconds_min": 60,
      "ttl_seconds_max": 300,
      "scope": ["tenant_or_global_scope", "time_window"],
      "requires_invalidation": [
        "period_change",
        "budget_recalc",
        "active_incident"
      ]
    }
  ],
  "full_refresh_protected_surfaces": [
    {
      "id": "login_and_shell_load",
      "allows_full_refresh": false,
      "proof_required": ["login_p95", "session_read_budget"]
    },
    {
      "id": "dashboard_and_site_change",
      "allows_full_refresh": false,
      "proof_required": ["read_trace", "dashboard_p95"]
    },
    {
      "id": "actions_and_scenarios",
      "allows_full_refresh": false,
      "proof_required": ["open_time_budget", "data_origin_trace"]
    },
    {
      "id": "save_or_publish_config",
      "allows_full_refresh": false,
      "proof_required": ["ack_time_budget", "targeted_invalidation_list"]
    },
    {
      "id": "connector_probe_and_sync_launch",
      "allows_full_refresh": false,
      "proof_required": ["ack_time_budget", "queue_name"]
    },
    {
      "id": "proof_pack_export_forecast_job_creation",
      "allows_full_refresh": false,
      "proof_required": ["job_creation_budget"]
    }
  ]
}
```

<!-- performance-budget-baseline:end -->

## Conditions de mesure

- Les percentiles sont calcules sur une fenetre glissante de 7 jours en prod, ou sur un test de charge stable de 30 minutes si la feature n'est pas encore en production.
- Les latences API sont mesurees du premier octet recu par le service au dernier octet ecrit en reponse, hors retries client.
- Les latences UI sont mesurees du debut de navigation ou du clic utilisateur jusqu'au rendu stable de la vue ou du feedback durable. Un simple spinner ou toast optimiste ne clot pas la mesure.
- Les cold starts de containers sont traces a part. Si plus de 5% du trafic reel subit un cold start, le budget est considere manque meme si le percentile reste "vert".

## Budgets API synchrones

| Type de route                          | Exemples Praedixa                                    | p95 max | p99 max | Notes                                 |
| -------------------------------------- | ---------------------------------------------------- | ------: | ------: | ------------------------------------- |
| Lecture indexee tenant/site            | listes d'alertes, details, config, proof list        |  300 ms |  700 ms | reponse JSON <= 250 KB                |
| Lecture agregat dashboard              | overview, monitoring, KPI multi-table                |  800 ms | 1500 ms | 4 a 6 sources max, pas de N+1         |
| Ecriture simple                        | resoudre une alerte, sauver un parametre, ack action |  500 ms | 1200 ms | transaction unique                    |
| Ecriture avec enqueue                  | lancer un sync, un export, un forecast, un backfill  |  900 ms | 2000 ms | le travail lourd doit partir en async |
| Session/auth JSON                      | refresh, proxy session, validation de cookie         |  350 ms |  800 ms | pas de requetes SQL non indexees      |
| Accuse de reception webhook/connecteur | webhook vendor, probe ack, callback interne          |  250 ms |  600 ms | valider puis bufferiser               |

Regles associees:

- Une reponse JSON synchrone ne doit pas depasser 1 MB. Au-dela, il faut paginer, compresser ou passer par export async.
- Une route API interactive ne doit pas faire plus de 5 requetes SQL dominantes sans justification.
- Si une route depasse `1 s` en `p95`, elle doit apparaitre dans le suivi des "routes sous surveillance".

## Budgets UI

| Interaction UI                      | Surface typique                              | p95 max | p99 max | Notes                                       |
| ----------------------------------- | -------------------------------------------- | ------: | ------: | ------------------------------------------- |
| Route initiale authentifiee         | dashboard simple, page liste/detail          | 2500 ms | 4000 ms | SSR + donnees critiques visibles            |
| Route initiale lourde               | dashboard admin, page actions multi-widgets  | 3500 ms | 5500 ms | au-dela, scinder ou charger progressivement |
| Transition client-side meme shell   | navigation interne entre pages proches       | 1200 ms | 2200 ms | pas de reset complet de shell               |
| Changement de filtre ou de site     | select site, plage de dates, polling refresh |  900 ms | 1600 ms | skeleton ou diff incrementale               |
| Action avec confirmation            | save, resolve, validate decision             | 1000 ms | 1800 ms | feedback durable + etat rafraichi           |
| Interaction locale apres chargement | tri, ouverture panneau, onglet local         |  200 ms |  350 ms | reference type INP                          |

## Latences de parcours produit

| Parcours ou action                           | Resultat attendu                         | p95 max |  p99 max |
| -------------------------------------------- | ---------------------------------------- | ------: | -------: |
| Login valide -> dashboard utilisable         | shell charge + carte principale visible  | 4000 ms |  6500 ms |
| Changement de site sur dashboard             | KPI, alertes et resume stabilises        | 1200 ms |  2200 ms |
| Ouverture page `actions`                     | file d'alertes et scenarios exploitables | 2500 ms |  4500 ms |
| Resolution d'alerte / validation de decision | confirmation durable + ligne mise a jour | 1000 ms |  1800 ms |
| Test d'un connecteur                         | resultat de probe visible en UI          | 6000 ms | 12000 ms |
| Lancement manuel d'un sync ou backfill       | job cree + statut `queued` visible       | 1500 ms |  3000 ms |

## Budgets async de service

| Traitement async                                  | Cadre de volume                    | p95 max | p99 max |
| ------------------------------------------------- | ---------------------------------- | ------: | ------: |
| Sync incremental d'un connecteur                  | <= 50k lignes brutes               |  10 min |  20 min |
| Forecast + materialisation scenarios pour une org | charge `T2`                        |  15 min |  30 min |
| Generation d'un proof pack org-mois               | 1 org, 1 mois                      |   5 min |  15 min |
| Backfill standard d'un connecteur                 | <= 30 jours ou <= 1M lignes brutes |     6 h |    12 h |

## Strategie de scalabilite horizontale

Le scale-out n'est acceptable que si la couche reste stateless ou si son etat est externalise de facon explicite.

| Surface               | Unite de scale principale            | Condition prealable                                  | Premier signal qui justifie le scale-out                    | Ce que le scale-out ne doit pas masquer                         |
| --------------------- | ------------------------------------ | ---------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------- |
| `app-landing`         | replicas frontend                    | assets et rendu deja stabilises                      | `p95` route initiale > budget avec CPU/memoire eleves       | LCP degrade par media, fonts ou bundle                          |
| `app-webapp`          | replicas frontend/BFF                | session, cache et proxy stateless                    | `p95` navigation > budget + CPU > 70%                       | pages qui refetchent trop ou payloads non pagines               |
| `app-admin`           | replicas frontend/BFF                | permissions, proxy et fetchs deja scopes             | `p95` pages lourdes > budget + event loop lag               | dashboards agreges non incrementalises                          |
| `app-api-ts`          | replicas API                         | routes indexees, payloads bornes, pool DB maitrise   | `p95` routes interactives > budget + saturation CPU         | scans SQL, N+1, lectures sans cache ou materialisation          |
| `app-connectors`      | workers/replicas d'ingestion         | ack rapide, queue, idempotence, quotas org/connexion | age du backlog > 2x cadence normale                         | full refresh implicite, retries non bornes, absence de chunking |
| `app-api` jobs Python | workers par classe de job            | files separees forecasts/backfills/proof packs       | attente file > budget async                                 | batch trop gros, manque de priorisation                         |
| `Postgres`            | vertical puis optimisation de schema | indexes, plans, retention et quotas en place         | connexions, temps SQL et stockage en zone jaune persistante | lecture globale non scopee, absence d'archive, hot table unique |

Regles associees:

- Aucune augmentation de replicas ne doit faire exploser le nombre maximal de connexions Postgres. Le budget DB doit etre recalcule avant scale-out `app-api-ts` ou workers Python.
- Une couche ne scale pas tant que son point d'entree fait encore du travail lourd synchrone qui devrait etre queue.
- Un scale-out d'urgence doit venir avec une date de sortie et une correction structurelle planifiee.

## Backpressure et queueing

| Type de flux                   | Accuse synchrone attendu            | Queue ou buffer attendu              | Guardrail de backpressure                         | Degradation acceptee                                 |
| ------------------------------ | ----------------------------------- | ------------------------------------ | ------------------------------------------------- | ---------------------------------------------------- |
| Mutation UI simple             | reponse finale <= budget ecriture   | aucune si transaction courte         | rate limit utilisateur/org                        | refuser les bursts, jamais bloquer toute l'app       |
| Lancement sync/export/backfill | job `queued` visible <= 1500 ms p95 | file dediee par type de job          | quota org + concurrence max par org               | retarder ou refuser un nouveau job                   |
| Webhook ou callback connecteur | ACK <= 250 ms p95                   | buffer/file avant traitement lourd   | limitation par IP/vendor/connexion + retry bornes | repondre 429/503 de facon explicite                  |
| Forecast, scenario, proof pack | ACK creation job <= 900 ms p95      | files separees des syncs connecteurs | priorite plus haute pour interactif que backfill  | reporter le recalcul lourd, pas le shell utilisateur |
| Polling UI                     | lecture indexee ou diff <= budget   | pas de refresh complet cote serveur  | cadence mini et pause sur onglet inactif          | allonger la cadence avant de saturer l'API           |

Regles associees:

- Les files doivent etre logiquement separees entre interactif, sync incremental, backfill/replay et jobs analytiques.
- Le trafic interactif doit toujours pouvoir couper la file lourde avant que `p95`/`p99` UI ou API ne basculent en zone rouge.
- Un retry ne doit jamais recreer un full refresh silencieux.

## Cache et invalidation

Le cache est autorise seulement si sa cle, son invalidation et sa tolerance au stale sont explicites.

| Surface                     | Cle minimale                                       | TTL max par defaut              | Invalidation obligatoire                                                | Staleness max tolerable    |
| --------------------------- | -------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------- | -------------------------- |
| Session/auth lecture        | `user` + origine app                               | pas de cache partage applicatif | login, logout, rotation, 401/403                                        | quasi nul                  |
| Dashboard et KPI org/site   | `tenant` + `site` + fenetre temps + version config | 30 s a 120 s                    | changement site, publication config, sync terminee, mutation impactante | courte                     |
| Listes d'alertes/actions    | `tenant` + `site` + filtres + pagination           | 15 s a 60 s                     | resolve/ack/action dispatch, changement filtre/site                     | courte                     |
| Config et reference data    | `tenant` + ressource + version                     | jusqu'a 5 min si versionnee     | save, publish, rollback, sync metadata                                  | moyenne si version visible |
| Requetes de monitoring/cout | `tenant` ou scope global + fenetre temps           | 60 s a 300 s                    | changement de periode, recalcul budget, incident actif                  | moyenne                    |

Regles associees:

- Pas de cache partage sans scoping tenant explicite.
- Pas de "clear all cache" comme mecanisme nominal d'invalidation.
- Une route qui depend d'un cache pour tenir son budget doit documenter ce qui se passe quand le cache est vide.
- Une invalidation qui se contente d'attendre le TTL n'est pas suffisante pour une mutation interactive.

## Surfaces critiques qui ne doivent pas dependre d'un full refresh

| Surface critique                                | Interdit                                               | Contrat build-ready attendu                                      | Preuve minimale demandee                |
| ----------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------- | --------------------------------------- |
| Login, refresh session, chargement shell        | full refresh de profil, org ou site                    | token/session suffisants pour ouvrir le shell                    | mesure `p95` login et lecture session   |
| Dashboard, changement de site, listes d'alertes | resync complet connecteur ou recalcul global bloqueant | lecture incrementalisee, cache scope, ou projection materialisee | trace de lecture + budget `p95`         |
| Page `actions` et scenarios                     | recalcul global de tous les signaux avant affichage    | dernier snapshot exploitable + recalcul async si besoin          | temps d'ouverture + origine des donnees |
| Save/publish config                             | regeneration globale avant confirmation                | ecriture transactionnelle puis invalidation ciblee               | temps d'ack + liste des vues invalidees |
| Probe connecteur et lancement sync              | full refresh comme mode nominal                        | probe et lancement se limitent a un ACK + queue                  | temps d'ACK + file cible                |
| Proof pack, export, forecast manuel             | execution complete dans la requete interactive         | creation job + statut observable                                 | temps de creation job                   |

Regles associees:

- Un full refresh n'est admis que comme operation explicite de reparation, migration ou bootstrap, jamais comme chemin nominal d'une surface critique.
- Toute exception doit definir son volume maximal, sa fenetre d'execution, sa file dediee, son kill switch et son cout cible.

## Checklist de verification avant merge

1. La surface touchee reference une ligne de budget existante ou ajoute une nouvelle ligne explicite.
2. Le chemin nominal precise s'il est synchrone, async ou mixte avec ACK rapide.
3. La PR ou le design indique l'unite de scale choisie et le signal qui declenche le throttling avant saturation.
4. Toute lecture cachee precise la cle, le TTL et l'invalidation.
5. La note de conception indique explicitement si un full refresh existe encore, et pourquoi il n'est pas sur une surface critique.

## Regles avant toute optimisation

1. Reproduire le probleme sur la meme classe de charge que la plainte utilisateur. Un gain `T1` ne valide pas un besoin `T2`.
2. Capturer avant/apres: `p50`, `p95`, `p99`, taux d'erreur, taille payload, nombre de requetes SQL, temps SQL total, CPU, memoire, age de file et cout mensuel equivalent.
3. Corriger d'abord le contrat: payload trop gros, page sans pagination, tri en memoire, N+1, index manquant, polling trop fin. On scale les containers en dernier.
4. Toute optimisation par cache doit definir la cle de scope (`tenant`, `site`, `user` si necessaire), le TTL, la strategie d'invalidation et le risque de staleness acceptable.
5. Si le budget ne peut pas etre tenu en synchrone, il faut couper le parcours: accusation rapide, job async, polling ou webhook de completion.
