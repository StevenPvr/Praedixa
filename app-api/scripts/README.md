# `scripts/` - Jobs executables Python

## Role

Ce dossier regroupe les points d'entree batch du moteur Python.

## Scripts principaux

- `medallion_pipeline.py`
  - run unique Bronze -> Silver -> Gold
  - watch local par polling
  - enrichissements calendrier, meteo, vacances, features temporelles
  - la detection Bronze couvre maintenant les sources `csv`, `tsv` et `xlsx` a partir de `data/<client>/<domain>/`
  - rejette desormais les datasets Bronze legacy `mock_*` et toute colonne runtime Gold `mock_*` au lieu de les remapper silencieusement
  - facade CLI qui re-exporte la logique repartie dans `medallion_pipeline_base.py`, `medallion_pipeline_bronze.py`, `medallion_pipeline_quality.py` et `medallion_pipeline_features.py`
  - les donnees externes (meteo, vacances scolaires, calendrier) sont maintenant chargees via des helpers dedies pour garder le coeur du pipeline lisible.
  - les helpers scalaires partages (`to_float`, `coerce_scalar`) restent dans `medallion_pipeline_base.py`, tandis que la construction Silver, la classification des valeurs manquantes et le ridge causal sont decoupes dans `medallion_pipeline_quality.py`.

- `medallion_pipeline_quality.py`
  - regroupe les helpers Silver/quality pour lissage, imputation et features selectives
  - les boucles de construction Silver, de ridge causal et de clamp outlier sont scindees en petits helpers pour rester lisibles et garder les attrapeurs Sonar sous la limite
  - s'appuie sur `numpy_helpers.py` pour exposer des symboles locaux plus lisibles par Pylance

- `medallion_pipeline_features.py`
  - regroupe les features externes, les helpers de calendrier et l'export Gold
  - les features externes, les intervalles de vacances scolaires et les stats glissantes sont maintenant decoupes en petits helpers
  - les stats glissantes s'appuient sur `numpy_helpers.py` pour garder des symboles locaux compatibles avec Pylance

- `medallion_orchestrator.py`
  - boucle de prod
  - lock mono-instance
  - retries, heartbeat, alerting webhook
  - le chargement de config isole maintenant la normalisation des chemins, nombres et alertes dans des helpers plus petits pour rester lisible.

- `integration_sync_worker.py`
  - claim des `sync runs` queues depuis `app-connectors`
  - ouvre une session DB isolee par tenant, choisit le chemin `provider/raw events` ou `sftpPull`, puis marque le run `completed` / `failed` / `retry_scheduled`
  - les chemins `provider/raw events` reellement cables sont maintenant `Salesforce`, `UKG`, `Toast`, `Geotab`, `Olo`, `Fourth`, `Oracle TM`, `SAP TM`, `Manhattan`, `Blue Yonder`, `NCR Aloha`, `CDK` et `Reynolds`, via `app/integrations/connectors/<vendor>/`
  - supporte `--once` et `--watch`

- `medallion_quarantine.py`
  - inventaire des payloads mis en quarantaine
  - lecture des manifests append-only `data-ready/quarantine/_manifests/*.json`

- `medallion_replay.py`
  - replay explicite des sources mises en quarantaine
  - reapplique le pipeline standard avec `allow_reprocess=True`
  - s'appuie sur un helper de recouvrement de fenetre partage pour garder les bornes temporelles explicites

- `medallion_backfill.py`
  - backfill d'une fenetre temporelle explicite
  - selectionne les sources qui recouvrent la fenetre puis reapplique le pipeline standard

- `ingest_file.py`
  - ingestion unitaire/outil operateur
  - les warnings de parsing et de mapping sont volontairement ignores ici: le script echoue sur les erreurs bloqueantes et ne conserve pas de branches no-op.

- `run_inference_job.py`
  - lancement ponctuel des jobs d'inference/model registry

- `seed_full_demo.py`
  - rebranche d'abord les etapes persistantes 1-4 via `app/services/organization_foundation.py`
  - ajoute ensuite uniquement les artefacts operationnels de demo (forecasts, alerts, scenarios, decisions, proof)
  - demande un `--org-id` explicite pour cibler le tenant a rebrancher

## Invariants de securite/data contract

- Le pipeline medaillon n'accepte plus les datasets runtime legacy `mock_*`; les sources doivent deja etre renommees vers le contrat canonique avant Bronze -> Silver.
- Le split Gold echoue explicitement si une colonne runtime legacy `mock_*` atteint encore les features exposees.
- Les scripts de demo restent confines au seed; ils ne doivent pas servir de compatibilite runtime pour les lectures Gold ou les features live.

## Commandes typiques

```bash
cd app-api
uv run python -m scripts.medallion_pipeline --force-rebuild
uv run python -m scripts.medallion_pipeline --watch --poll-seconds 30
uv run python -m scripts.medallion_orchestrator --config config/medallion/orchestrator.json
uv run python -m scripts.integration_sync_worker --once
uv run python -m scripts.integration_sync_worker --watch --poll-seconds 30
uv run python -m scripts.medallion_quarantine --json
uv run python -m scripts.medallion_replay --client-slug acme --dataset workforce_daily
uv run python -m scripts.medallion_backfill --client-slug acme --start-date 2026-03-01 --end-date 2026-03-31
uv run python -m scripts.seed_full_demo --org-id <uuid>
```

## Entrees/sorties importantes

- entrees: `data/<client>/...`
- sorties: `data-ready/bronze`, `data-ready/silver`, `data-ready/gold`
- quarantaine: `data-ready/quarantine`, `data-ready/quarantine/_manifests/*.json`
- etat: `data-ready/.medallion_state.json`
- observabilite: `data-ready/reports/*`, `data-ready/reports/reprocessing/*.json`
- connectors runtime: `CONNECTORS_RUNTIME_URL`, `CONNECTORS_RUNTIME_TOKEN`, `CONNECTORS_RUNTIME_ALLOWED_HOSTS`
