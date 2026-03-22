# Workflows CI

Ce dossier contient les pipelines GitHub Actions versionnés avec le monorepo.

## Fichiers présents

- `ci-authoritative.yml` : pipeline canonique et autoritaire qui rejoue le gate exhaustif signé, les contrats runtime/release et publie les preuves CI.
- `ci-admin.yml` : pipeline centré sur `app-admin`.
- `ci-api.yml` : pipeline centré sur les couches API.

## Logique générale

- `CI - Autorite` est maintenant la source de verite finale pour le merge: il rejoue `gate-precommit-delta`, `gate-exhaustive-local --mode manual`, la verification du rapport signe, la validation de l'inventaire runtime secrets et les tests de contrat release.
- Les workflows `CI - Admin` et `CI - API` restent des voies rapides par surface pour fournir un feedback scope-specific plus vite, mais ils ne sont plus la seule preuve de qualite.
- Les hooks locaux restent des accelerateurs developpeur; la decision finale doit venir de GitHub Actions et des artefacts publies par `CI - Autorite`.
- `CI - API` et `CI - Admin` rejouent toujours `pnpm performance:validate-budgets` pour que les baselines performance versionnees restent bloquees a distance.

## Références utiles

- Voir [scripts/README.md](/Users/steven/Programmation/praedixa/scripts/README.md) pour la famille de scripts de gate.
- Voir [docs/runbooks/local-gate-exhaustive.md](/Users/steven/Programmation/praedixa/docs/runbooks/local-gate-exhaustive.md) pour le mode opératoire complet.
