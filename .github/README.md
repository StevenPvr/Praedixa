# GitHub Automation

Ce dossier contient l'automatisation GitHub du monorepo Praedixa.

## Rôle

- Définir les workflows CI exécutés sur GitHub Actions.
- Déclarer les propriétaires de code et les templates collaboratifs.
- Héberger les actions GitHub locales réutilisables par plusieurs workflows.

## Contenu

- `CODEOWNERS` : propriétaires de révision par zone du repo.
- `dependabot.yml` : stratégie de mise à jour automatique des dépendances.
- `pull_request_template.md` : structure attendue pour les PR.
- `workflows/` : pipelines CI.
- `actions/` : actions composites locales.

## À savoir

- Les gates locales restent la référence stricte avant push. Les workflows GitHub rejouent une partie de ces contrôles en CI.
- Toute modification ici doit rester alignée avec les scripts de `scripts/` et les runbooks de `docs/runbooks/`.
