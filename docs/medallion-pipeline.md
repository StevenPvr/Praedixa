# Medallion Pipeline (Bronze → Silver → Gold)

## Objectif

Industrialiser le pipeline Data Engineering pour clients B2B en limitant
l'intervention humaine aux metadonnees (noms de colonnes + metadata site).

## Emplacements

- Source datalake: `data/<client>/.../*.csv`
- Pipeline script: `app-api/scripts/medallion_pipeline.py`
- Metadata:
  - `app-api/config/medallion/column_aliases.json`
  - `app-api/config/medallion/site_locations.json`
- Sorties:
  - `data-ready/bronze/`
  - `data-ready/silver/silver_site_day.csv`
  - `data-ready/gold/gold_site_day.csv`
  - `data-ready/gold/client=<slug>/gold_site_day.csv`

## Contrats de couche

### Bronze

- Copie immuable de chaque fichier nouveau/modifie.
- Manifest avec hash SHA256, taille, date min/max detectee.
- Watermark par couple `(client_slug, dataset)`.
- Pas de reprocess historique par defaut:
  - si `min_date <= watermark`, fichier en quarantaine.

### Silver

- Normalisation schema vers un dataset unique grain `client_slug + site_code + date`.
- Merge des sources journalières + mensuelles.
- Garde anti-leakage:
  - les valeurs mensuelles sont projetees via **mois precedent** uniquement.
- Qualite:
  - classification missingness (`mcar` vs `mar` heuristique),
  - imputation causale (ridge point-in-time + medianes hierarchiques),
  - outliers robustes (MAD causal),
  - colonnes de tracking `__imputed`, `__imputation_method`,
    `__outlier_clamped`.

### Gold

- Ajout features calendrier (sin/cos temporels, weekend, quarter, etc.).
- Enrichissement meteo (Open-Meteo archive, cache local).
- Enrichissement vacances scolaires FR par zone (API Education, cache local).
- Feature engineering temporel:
  - lags: `1, 7, 14, 28`
  - rolling: mean/std sur `7, 14, 28`
- Export CSV global + par client.

## Exécution

Run unique:

```bash
uv run python -m scripts.medallion_pipeline --force-rebuild
```

Watch local event-driven:

```bash
uv run python -m scripts.medallion_pipeline --watch --poll-seconds 30
```

Orchestrateur production (scheduler + retries + alerting):

```bash
cd app-api
uv run python -m scripts.medallion_orchestrator --config config/medallion/orchestrator.json
```

Run unique orchestré (avec retry policy):

```bash
cd app-api
uv run python -m scripts.medallion_orchestrator --once --config config/medallion/orchestrator.json
```

Options:

- `--allow-reprocess`: autorise le retraitement retroactif (desactive par defaut).
- `--force-rebuild`: remet l'etat et reconstruit depuis toutes les sources.

## Observabilite

- `data-ready/reports/last_run_summary.json`
- `data-ready/reports/silver_quality_report.json`
- `data-ready/.medallion_state.json`
- `data-ready/reports/orchestrator_heartbeat.json`

## Validation actuelle

- Tests unitaires: `app-api/tests/unit/test_medallion_pipeline.py`
- Lint: Ruff sur script + tests.
- Run e2e valide avec generation Bronze/Silver/Gold.
