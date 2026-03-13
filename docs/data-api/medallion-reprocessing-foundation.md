# Fondation medallion replay / backfill / quarantine

## Objectif

Rendre le data-plane Python capable de:

- mettre en quarantaine de facon append-only les payloads invalides ou retroactifs
- lister ces incidents sans relire les payloads bruts a la main
- planifier un `replay` cible depuis la quarantaine
- planifier un `backfill` cible depuis une fenetre temporelle
- reappliquer le pipeline standard `raw -> harmonized -> features` sans write direct Gold

## Artefacts runtime

### Quarantaine

- payloads copies sous `data-ready/quarantine/client=<slug>/dataset=<dataset>/detected_at=<run_id>/`
- manifests append-only sous `data-ready/quarantine/_manifests/<run_id>.json`

Chaque enregistrement de quarantaine porte au minimum:

- `source_path`
- `quarantine_path`
- `client_slug`
- `domain`
- `dataset`
- `detected_at`
- `reason_code`
- `reason_detail`
- `min_date` / `max_date` / `watermark` quand disponibles
- `replayable`

Codes actuels:

- `invalid_payload`
- `retroactive_watermark`
- `legacy_quarantine` pour les anciennes quarantaines sans manifest

### Rapports de reprocessing

- `data-ready/reports/reprocessing/<plan_id>.json`

Chaque rapport versionne:

- le `plan` (`trigger_type`, fenetre demandee, sources retenues)
- le `status` (`planned`, `applied`, `empty`)
- `staged_files`
- `quarantined_files`
- `notes`

## Commandes

Depuis `app-api/`:

```bash
uv run python -m scripts.medallion_quarantine --json
uv run python -m scripts.medallion_replay --client-slug acme --dataset workforce_daily
uv run python -m scripts.medallion_replay --client-slug acme --dataset workforce_daily --apply
uv run python -m scripts.medallion_backfill --client-slug acme --start-date 2026-03-01 --end-date 2026-03-31
uv run python -m scripts.medallion_backfill --client-slug acme --start-date 2026-03-01 --end-date 2026-03-31 --apply
```

## Garanties

- aucun replay/backfill n'ecrit directement en Silver ou Gold sans repasser par le staging Bronze
- un payload invalide est isole en quarantaine au lieu de faire tomber tout le run
- un backfill explicite n'ouvre pas implicitement le mode reprocess global du pipeline
- les rapports de reprocessing sont append-only et peuvent etre consommes par un futur control plane sans redefinir le contrat

## Limites actuelles

- la quarantaine reste orientee fichier source; le quarantinage ligne-par-ligne n'est pas encore implemente
- `replay` depend d'un `source_path` encore present dans le datalake source
- le control plane TS n'est pas encore branche sur ces artefacts Python
