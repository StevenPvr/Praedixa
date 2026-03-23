# Workflows CI

Ce dossier contient les pipelines GitHub Actions versionnés avec le monorepo.

## Fichiers présents

- `ci-authoritative.yml` : pipeline canonique et autoritaire qui rejoue le gate exhaustif signe, les contrats runtime/release, puis publie les preuves CI et le verdict `build-ready` par SHA.
- `ci-admin.yml` : pipeline centré sur `app-admin`.
- `ci-api.yml` : pipeline centré sur les couches API.
- `release-platform.yml` : pipeline de release/deploiement pilote par GitHub Actions, avec manifest signe, staging, smoke puis promotion prod, sans parametres `workflow_dispatch` capables de modifier le build.
- `resilience-evidence.yml` : collecte periodique des preuves backup/monitoring et publication des artefacts de resilience.

## Logique générale

- `CI - Autorite` est maintenant la source de verite finale pour le merge: il rejoue `gate-precommit-delta`, `gate-exhaustive-local --mode manual`, la verification du rapport signe, la validation des contrats runtime, du verdict `build-ready` et les tests de contrat release.
- Les workflows `CI - Admin` et `CI - API` restent des voies rapides par surface pour fournir un feedback scope-specific plus vite, mais ils ne sont plus la seule preuve de qualite.
- Les hooks locaux restent des accelerateurs developpeur; la decision finale doit venir de GitHub Actions et des artefacts publies par `CI - Autorite`.
- `CI - API` et `CI - Admin` rejouent toujours `pnpm performance:validate-budgets` pour que les baselines performance versionnees restent bloquees a distance.
- La governance cible est simple: `Autorite - Required` doit etre le check protege sur `main`, avec au moins une review obligatoire; les workflows surface (`Admin - Required`, `API - Required`) restent des signaux auxiliaires.
- `CI - Autorite` publie maintenant aussi un summary GitHub lisible du verdict `build-ready` et un artefact JSON par SHA dans `.git/gate-reports/build-ready-<sha>.json`.
- Les workflows GitHub qui utilisent `cache: pnpm` installent maintenant `pnpm/action-setup` avant `actions/setup-node`; le repo bloque tout retour au mauvais ordre via `scripts/validate-github-workflow-pnpm-order.mjs`.
- Le chemin nominal de prod passe par `Release - Platform`; une release ne doit plus dependre d'un laptop operateur ni de parametres libres saisis au declenchement.

## Références utiles

- Voir [scripts/README.md](../../scripts/README.md) pour la famille de scripts de gate.
- Voir [docs/runbooks/local-gate-exhaustive.md](../../docs/runbooks/local-gate-exhaustive.md) pour le mode opératoire complet.
