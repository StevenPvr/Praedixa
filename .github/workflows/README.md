# Workflows CI

Ce dossier contient les definitions GitHub Actions du monorepo.

Etat actuel: tous les workflows sont volontairement desactives depuis le 2026-03-23 a la demande explicite de l'utilisateur.

## Fichiers présents

- `ci-authoritative.yml.disabled` : ancienne CI canonique et autoritaire.
- `ci-admin.yml.disabled` : ancien pipeline centré sur `app-admin`.
- `ci-api.yml.disabled` : ancien pipeline centré sur les couches API.
- `release-platform.yml.disabled` : ancien pipeline de release/deploiement.
- `resilience-evidence.yml.disabled` : ancienne collecte periodique des preuves backup/monitoring.

## Logique générale

- Aucune GitHub Action ne doit partir automatiquement tant que ces fichiers gardent le suffixe `.disabled`.
- Les mises a jour Dependabot sont egalement coupees via `.github/dependabot.yml.disabled`, car le workflow systeme `Dependabot Updates` ne se desactive pas comme un workflow classique via l'API GitHub.
- Pour reactiver un workflow, renommer explicitement le fichier concerne de `*.yml.disabled` vers `*.yml`, puis reevaluer la gouvernance distante avant de pousser.
- Tant que les workflows restent desactives, les hooks locaux et les executions manuelles hors GitHub restent les seuls controles disponibles dans ce repo.

## Références utiles

- Voir [scripts/README.md](../../scripts/README.md) pour la famille de scripts de gate.
- Voir [docs/runbooks/local-gate-exhaustive.md](../../docs/runbooks/local-gate-exhaustive.md) pour le mode opératoire complet.
