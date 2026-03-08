# `scripts/` - Jobs executables Python

## Role

Ce dossier regroupe les points d'entree batch du moteur Python.

## Scripts principaux

- `medallion_pipeline.py`
  - run unique Bronze -> Silver -> Gold
  - watch local par polling
  - enrichissements calendrier, meteo, vacances, features temporelles

- `medallion_orchestrator.py`
  - boucle de prod
  - lock mono-instance
  - retries, heartbeat, alerting webhook

- `ingest_file.py`
  - ingestion unitaire/outil operateur

- `run_inference_job.py`
  - lancement ponctuel des jobs d'inference/model registry

- `seed_demo_data.py`
  - seed simple de donnees de demo/dev

- `seed_full_demo.py`
  - bootstrap complet d'un tenant avec jeux de donnees et structures necessaires
  - encore raccorde a `org_provisioning.py`

## Commandes typiques

```bash
cd app-api
uv run python -m scripts.medallion_pipeline --force-rebuild
uv run python -m scripts.medallion_pipeline --watch --poll-seconds 30
uv run python -m scripts.medallion_orchestrator --config config/medallion/orchestrator.json
uv run python -m scripts.seed_full_demo
```

## Entrees/sorties importantes

- entrees: `data/<client>/...`
- sorties: `data-ready/bronze`, `data-ready/silver`, `data-ready/gold`
- etat: `data-ready/.medallion_state.json`
- observabilite: `data-ready/reports/*`
