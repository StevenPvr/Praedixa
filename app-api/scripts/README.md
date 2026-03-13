# `scripts/` - Jobs executables Python

## Role

Ce dossier regroupe les points d'entree batch du moteur Python.

## Scripts principaux

- `medallion_pipeline.py`
  - run unique Bronze -> Silver -> Gold
  - watch local par polling
  - enrichissements calendrier, meteo, vacances, features temporelles
  - rejette desormais les datasets Bronze legacy `mock_*` et toute colonne runtime Gold `mock_*` au lieu de les remapper silencieusement

- `medallion_orchestrator.py`
  - boucle de prod
  - lock mono-instance
  - retries, heartbeat, alerting webhook

- `medallion_quarantine.py`
  - inventaire des payloads mis en quarantaine
  - lecture des manifests append-only `data-ready/quarantine/_manifests/*.json`

- `medallion_replay.py`
  - replay explicite des sources mises en quarantaine
  - reapplique le pipeline standard avec `allow_reprocess=True`

- `medallion_backfill.py`
  - backfill d'une fenetre temporelle explicite
  - selectionne les sources qui recouvrent la fenetre puis reapplique le pipeline standard

- `ingest_file.py`
  - ingestion unitaire/outil operateur

- `run_inference_job.py`
  - lancement ponctuel des jobs d'inference/model registry

- `seed_demo_data.py`
  - seed simple de donnees de demo/dev

- `seed_full_demo.py`
  - rebranche d'abord les etapes persistantes 1-4 via `app/services/organization_foundation.py`
  - ajoute ensuite uniquement les artefacts operationnels de demo (forecasts, alerts, scenarios, decisions, proof)

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
uv run python -m scripts.medallion_quarantine --json
uv run python -m scripts.medallion_replay --client-slug acme --dataset workforce_daily
uv run python -m scripts.medallion_backfill --client-slug acme --start-date 2026-03-01 --end-date 2026-03-31
uv run python -m scripts.seed_full_demo
```

## Entrees/sorties importantes

- entrees: `data/<client>/...`
- sorties: `data-ready/bronze`, `data-ready/silver`, `data-ready/gold`
- quarantaine: `data-ready/quarantine`, `data-ready/quarantine/_manifests/*.json`
- etat: `data-ready/.medallion_state.json`
- observabilite: `data-ready/reports/*`, `data-ready/reports/reprocessing/*.json`
