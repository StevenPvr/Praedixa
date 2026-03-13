# Connector Layer Separation Policy

Source de verite runtime: `app-connectors/src/certification.ts`

## Objectif

Interdire les glissements implicites entre payload source, canonique harmonise, features Gold, audit et configuration de connecteur.

## Couches

### `raw`

- Contenu: payloads Bronze, watermarks, identifiants source, previews techniques strictement bornees.
- Ecrit par: endpoints d'ingestion connecteurs, workers de sync, replay/backfill approuves.
- Interdit a: feature engineering, edition manuelle metier, publication KPI.

### `harmonized`

- Contenu: Silver canonique, mappings valides, timezone normalisee, quality gates.
- Ecrit par: pipeline medaillon et jobs de reprocessing valides.
- Interdit a: handlers HTTP connecteurs, surfaces admin, jobs Gold directs.

### `features`

- Contenu: Gold, KPI, datasets pour forecasts/scenarios/decisioning.
- Ecrit par: jobs Gold et feature engineering uniquement.
- Interdit a: ingestion source, admin config, audit trail.

### `audit`

- Contenu: audit events, sync runs, preuves de support/securite, journaux append-only.
- Ecrit par: mutations control plane, hooks de sync, evidence jobs.
- Interdit a: mapping Silver, features Gold, edition metier.

### `config`

- Contenu: connexions, field mappings, references de secrets, policies de sync, metadata de certification.
- Ecrit par: flux admin approuves, rotation de secrets, changements de mapping versionnes.
- Interdit a: payload source, jobs Gold, transformations Silver.

## Regles operatoires

- Aucun endpoint connecteur ne doit ecrire directement dans `harmonized` ou `features`.
- Aucun job Gold ne doit relire ou ecrire la couche `config`.
- Toute fonction de replay/backfill repasse par `raw -> harmonized -> features`, jamais par un write direct Gold.
- Toute surface support ou admin lit `audit` et `config`, jamais les payloads bruts complets par defaut.
- Toute retention Raw est geree comme une politique d'infrastructure et d'audit, pas comme une optimisation de feature.

## Verification

- `pnpm --dir app-connectors test -- src/__tests__/certification.test.ts`
- `uv run --project app-api pytest app-api/tests/test_integration_runtime_worker.py -q`
- `uv run --project app-api pytest app-api/tests/test_medallion_reprocessing.py -q`

## Foundation runtime actuelle

- la quarantaine medaillon est versionnee en append-only sous `data-ready/quarantine/_manifests/*.json`
- les commandes Python `medallion_quarantine`, `medallion_replay` et `medallion_backfill` reappliquent toujours le pipeline standard au lieu d'ecrire directement en Silver/Gold
- les rapports d'execution lives sous `data-ready/reports/reprocessing/*.json`
