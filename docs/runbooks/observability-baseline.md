# Runbook - Observability Baseline

## Objectif

Poser un socle minimal d'observabilite pour `staging` et `prod` sur les surfaces critiques Praedixa:

- `app-landing`
- `app-webapp`
- `app-admin`
- `app-api-ts`
- `app-api`
- `app-connectors`
- auth/OIDC

Regle simple: un incident doit etre traitable depuis 3 pivots coherents:

1. logs JSON
2. metriques
3. traces

Etat versionne actuel:

- `app-api-ts` et `app-connectors` portent deja le socle Node de logs structures, reemettent `X-Request-ID` / `traceparent` / `tracestate` dans leurs reponses et bindent le meme contexte dans leurs journaux runtime.
- Les BFF `app-webapp` et `app-admin` regenerent un contexte valide si l'entree est absente ou invalide, puis le repropage tel quel vers `app-api-ts`.
- `app-api/app/core/telemetry.py` fournit maintenant le socle Python `structlog` pour les jobs data/ML critiques; `integration_runtime_worker.py`, `transform_engine.py` et `scripts/run_inference_job.py` bindent deja `request_id`, `run_id`, `connector_run_id`, `organization_id` et `trace_id` quand ils sont connus.
- Le hop Python -> runtime connecteurs repropage aussi les IDs metier via les headers internes `X-Request-ID`, `X-Run-ID` et `X-Connector-Run-ID`; `app-connectors` les lit, les journalise et les reemet dans ses reponses quand ils sont disponibles.
- Les scripts shell critiques peuvent maintenant reutiliser `scripts/lib/json-log.sh` pour emettre des evenements JSON sur `stderr` sans casser les sorties `stdout` attendues par les pipelines de release.
- Les champs non applicables restent explicites a `null` dans la sortie JSON afin de garder des requetes et dashboards stables.
- Les BFF Next (`app-webapp`, `app-admin`) doivent maintenant conserver le meme `X-Request-ID` du navigateur a l'upstream et reemettre un `traceparent`/`tracestate` coherent dans la reponse, meme en cas de `401`, `403`, `413` ou `502`.

## Baseline non negociable

1. Chaque requete HTTP, job async, sync connecteur, run forecast/scenario et dispatch action emet:
   - un log JSON de debut
   - un log JSON de fin ou d'echec
   - un compteur
   - une latence
   - une trace avec span racine
2. Les identifiants de correlation sont propages de bout en bout. Ils ne sont pas regeneres a chaque hop.
3. Tous les logs sont en UTC, 1 evenement JSON par ligne, sans token, secret, cookie, mot de passe ni payload medical brut.
4. Les champs de correlation non applicables restent presents a `null` pour simplifier les requetes et dashboards.

## Champs de correlation obligatoires

| Champ              | Quand il doit etre present                                       | Regle                                            |
| ------------------ | ---------------------------------------------------------------- | ------------------------------------------------ |
| `request_id`       | toute entree HTTP et tout job derive d'une requete               | genere au edge si absent, puis propage           |
| `traceparent`      | tout hop HTTP entre BFF, API TS et runtime connecteurs           | propage tel quel s'il est valide, regenere sinon |
| `tracestate`       | tout hop HTTP quand il est present                               | conserve en l'etat s'il est mono-ligne et valide |
| `run_id`           | forecast, scenario, decision, pipeline medaillon, replay support | meme valeur du debut a la fin du run             |
| `connector_run_id` | sync connecteur, ingestion, import source                        | copie dans tous les logs/metriques/traces lies   |
| `action_id`        | dispatch, retry, ack, completed, failed                          | stable sur toute la vie de l'action              |
| `contract_version` | scenario, recommendation, action, rollback config                | jamais `null` sur les flux de decision           |
| `trace_id`         | tout flux trace                                                  | meme `trace_id` dans logs et backend de traces   |
| `organization_id`  | tout flux tenant-scoped                                          | obligatoire hors endpoints purement publics      |
| `site_id`          | lecture/ecriture scope site                                      | `null` si scope org uniquement                   |

Headers internes relies a ces champs:

- `X-Request-ID` : correlation primaire entre hops HTTP et jobs derives;
- `X-Run-ID` : run metier non connecteur quand un pipeline ou un orchestrateur en connait deja un;
- `X-Connector-Run-ID` : identifiant de sync / ingest connecteur, reemis par `app-connectors` des qu'une route ou un caller le connait.

## Log JSON minimal

Champs minimums par evenement:

- `timestamp`
- `level`
- `service`
- `env`
- `event`
- `message`
- `request_id`
- `run_id`
- `connector_run_id`
- `action_id`
- `contract_version`
- `organization_id`
- `site_id`
- `trace_id`
- `traceparent`
- `tracestate`
- `span_id`
- `status`
- `status_code`
- `duration_ms`
- `attempt`
- `error_code`

Exemple canonique:

```json
{
  "timestamp": "2026-03-12T09:14:22.184Z",
  "level": "info",
  "service": "api",
  "env": "prod",
  "event": "scenario.completed",
  "message": "Scenario run completed",
  "request_id": "req_01HPX8V4W4M9",
  "run_id": "run_8b5d9b7c",
  "connector_run_id": null,
  "action_id": null,
  "contract_version": "decision-config:v42",
  "organization_id": "org_123",
  "site_id": "site_456",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7",
  "status": "completed",
  "status_code": 200,
  "duration_ms": 842,
  "attempt": 1,
  "error_code": null
}
```

Evenements a garder stables dans le temps:

- `source.sync.completed`
- `dataset.freshness.breached`
- `scenario.requested`
- `scenario.completed`
- `action.dispatched`
- `action.completed`
- `action.failed`
- `ledger.closed`
- `decision_config_rollback`

## Metriques minimales

| Domaine           | Metriques minimales                                                                |
| ----------------- | ---------------------------------------------------------------------------------- |
| HTTP              | trafic, `p50/p95/p99`, taux `4xx`, taux `5xx`, timeout count                       |
| API/data          | `ingestion_success_rate`, `ingestion_error_count`, `dataset_freshness_lag_seconds` |
| Forecast/decision | runs completes/failed, latence scenario, `forecast_accuracy`, `active_alerts`      |
| Actions           | dispatch rate, failure rate, retry count, ack latency, duplication prevented       |
| Support/admin     | `api_error_rate`, `adoption_rate_pct`, volume de rollbacks                         |
| Synthetics        | disponibilite, latence, statut par check                                           |

Conventions:

- Toujours tagger `env`, `service`, `route`, `status`, `organization_id` si connu.
- Garder les percentiles et le volume brut ensemble. Un `p95` sans trafic est trompeur.
- Ajouter un marqueur de release (`release_id` ou `commit_sha`) sur les dashboards de prod.

## Traces

Chaque flux critique a un span racine:

- `http.request`
- `connector.sync`
- `forecast.run`
- `scenario.run`
- `action.dispatch`

Attributs minimums sur chaque span racine:

- `service.name`
- `deployment.environment`
- `request_id`
- `run_id`
- `connector_run_id`
- `action_id`
- `contract_version`
- `organization_id`
- `site_id`
- `http.route` ou nom de job
- `outcome`

Regles:

- Les appels DB et HTTP sortants doivent etre des child spans.
- En erreur, enregistrer `error_code`, type d'exception et destination externe.
- Le lien logs <-> traces doit se faire par `trace_id` sans parsing libre du message.
- Au niveau HTTP, `traceparent` et `tracestate` doivent rester coherents entre BFF -> API TS -> connecteurs; la reponse doit renvoyer les memes valeurs que celles finalement retenues par le hop courant.
- Quand un hop interne connait deja un `run_id` ou `connector_run_id`, il doit les forwarder explicitement sur le hop suivant plutot que d'attendre qu'un downstream les reinvente depuis le payload ou la route.

## Dashboards minimaux

1. Platform overview
   - trafic, `p95`, `5xx`, synthetics, release markers
2. Data and connectors
   - sync success rate, freshness lag, probe latency, echec ingestion
3. DecisionOps
   - forecast failures, scenario latency, `active_alerts`, `forecast_accuracy`, `adoption_rate_pct`
4. Actions and support
   - dispatch/ack/failure, retries, top erreurs par `request_id` ou `run_id`, rollbacks recents

Filtres obligatoires sur chaque dashboard:

- `env`
- `service`
- `organization_id`
- `site_id`
- `request_id`
- `run_id`
- `contract_version`

## Alerting baseline

| Signal                     | Seuil initial                                      | Severite |
| -------------------------- | -------------------------------------------------- | -------- |
| `5xx` API                  | `> 2%` sur 5 min                                   | critique |
| `p95` API                  | `> 1000 ms` sur 15 min                             | warning  |
| Synthetic `/api/v1/health` | 2 echecs consecutifs                               | critique |
| Freshness dataset          | retard > SLA + 60 min                              | critique |
| Sync connecteur            | 3 echecs consecutifs                               | critique |
| Scenario/forecast failed   | `> 5%` sur 15 min                                  | warning  |
| Action failed              | `> 2%` sur 15 min                                  | critique |
| Silence telemetrie         | aucun log ni trace sur 10 min pour un service prod | critique |

Regles d'alerte:

- Une alerte doit contenir le runbook cible, le dashboard, la requete logs, et si possible le `trace_id`.
- Dedup par `env + service + symptome`.
- Pager uniquement le critique. Le warning va dans le canal ops.

## Synthetic checks minimaux

La source machine-readable associee a cette section est:

```bash
./scripts/validate-synthetic-monitoring-baseline.mjs
```

Elle valide `docs/runbooks/synthetic-monitoring-baseline.json`, qui est maintenant le contrat versionne des synthetics critiques. Ce contrat impose:

- une couverture minimale explicite pour `landing`, `webapp`, `admin`, `api`, `auth` et `connectors`;
- un `probe.intent` explicite par verification critique, pas seulement une URL;
- une cadence et une severite bornees par check;
- une metadata obligatoire par check: `runbook`, `dashboard`, `responseOwner`, `smokeService`, `symptom`;
- une politique de forme d'host stricte: `landing`, `auth` et `connectors` restent `explicit` en staging et `canonical` en prod; `api`, `webapp` et `admin` restent `canonical` partout. Pour les cibles `explicit`, la selection concrete de l'hote reste un contrat externe au JSON versionne et n'est pas encore prouvee par ce validateur seul.

| Service      | Probe intent          | Methode + cible minimale                     | Cadence | Severite | Metadata minimale                                                |
| ------------ | --------------------- | -------------------------------------------- | ------- | -------- | ---------------------------------------------------------------- |
| `api`        | `health`              | `GET /api/v1/health`                         | 60 s    | critical | runbook observabilite, dashboard, owner, smoke service, symptome |
| `api`        | `anonymous_rejection` | `GET /api/v1/dashboard/summary` sans session | 5 min   | warning  | runbook observabilite, dashboard, owner, smoke service, symptome |
| `landing`    | `public_homepage`     | `GET /fr`                                    | 5 min   | critical | runbook smoke, dashboard, owner, smoke service, symptome         |
| `webapp`     | `login_page`          | `GET /login`                                 | 5 min   | critical | runbook smoke, dashboard, owner, smoke service, symptome         |
| `admin`      | `login_page`          | `GET /login`                                 | 5 min   | critical | runbook smoke, dashboard, owner, smoke service, symptome         |
| `auth`       | `oidc_discovery`      | `GET /.well-known/openid-configuration`      | 5 min   | critical | runbook observabilite, dashboard, owner, smoke service, symptome |
| `connectors` | `health`              | `GET /health` si runtime public expose       | 60 s    | critical | runbook observabilite, dashboard, owner, smoke service, symptome |

Verification manuelle minimale:

- `API_URL=https://api.praedixa.com ./scripts/smoke-test-production.sh`
- relancer la meme commande sur staging avant promotion prod
- apres changement auth/webapp/admin, rejouer au minimum le smoke E2E cible
- verifier que tout nouveau check synthetic ajoute porte aussi sa metadata d'escalade et reste rattache a un `smokeService` explicite

## Reflexe incident

1. Partir de l'alerte ou du synthetic rouge.
2. Filtrer les logs par `request_id`, `run_id`, `connector_run_id` ou `action_id`.
3. Ouvrir la trace correspondante via `trace_id`.
4. Verifier les metriques de volume, latence et taux d'erreur sur la meme fenetre.
5. Annoter le dashboard avec le `release_id` ou `commit_sha` si l'incident coincide avec une release.
