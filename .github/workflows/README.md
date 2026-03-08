# Workflows CI

Ce dossier contient les pipelines GitHub Actions versionnés avec le monorepo.

## Fichiers présents

- `ci-admin.yml` : pipeline centré sur `app-admin`.
- `ci-api.yml` : pipeline centré sur les couches API.

## Logique générale

- Les workflows sélectionnent un périmètre précis plutôt qu'un pipeline unique géant.
- Les contrôles profonds de sécurité et de qualité existent aussi en local via `scripts/gate-*`.

## Références utiles

- Voir [scripts/README.md](/Users/steven/Programmation/praedixa/scripts/README.md) pour la famille de scripts de gate.
- Voir [docs/runbooks/local-gate-exhaustive.md](/Users/steven/Programmation/praedixa/docs/runbooks/local-gate-exhaustive.md) pour le mode opératoire complet.
