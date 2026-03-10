# Documentation Déploiement

Ce dossier documente l'installation et les déploiements d'infrastructure applicative.

## Documents présents

- `scaleway-container.md` : modèle de déploiement serverless container sur Scaleway.
- `scaleway-setup.md` : préparation initiale de l'environnement Scaleway.

## Quand lire ce dossier

- avant de préparer un nouvel environnement ;
- avant un déploiement prod/staging ;
- quand on modifie les scripts `scw-*` dans `scripts/`.

## Règle de sécurité

- Les exemples de credentials dans ce dossier doivent rester des placeholders non réutilisables et pointer vers le secret manager comme source de vérité.
