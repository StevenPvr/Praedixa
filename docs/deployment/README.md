# Documentation Déploiement

Ce dossier documente l'installation et les déploiements d'infrastructure applicative.

## Documents présents

- `runtime-secrets-inventory.json` : inventaire machine-readable des secrets runtime attendus par surface, utilise par le preflight.
- `rollback-targets.json` : inventaire machine-readable des targets rollback connues par environnement, plus les surfaces qui exigent encore un override explicite.
- `scaleway-container.md` : modèle de déploiement serverless container sur Scaleway.
- `scaleway-setup.md` : préparation initiale de l'environnement Scaleway.
- `environment-secrets-owners-matrix.md` : résumé humain des surfaces, paths secrets et owners à garder aligné avec l'inventaire versionné.

## Quand lire ce dossier

- avant de préparer un nouvel environnement ;
- avant un déploiement prod/staging ;
- quand on modifie les scripts `scw-*` dans `scripts/`.

## Règle de sécurité

- Les exemples de credentials dans ce dossier doivent rester des placeholders non réutilisables et pointer vers le secret manager comme source de vérité.
- Les scripts `scw-configure-*` doivent écrire les JSON runtime depuis l'environnement ou `stdin`, jamais via des flags CLI contenant les valeurs secrètes.
- Les runbooks de release doivent considérer le preflight DNS strict et le smoke fail-close comme comportement nominal.
- Avant un preflight ou une revue de déploiement, vérifier `node ./scripts/validate-runtime-secret-inventory.mjs` pour s'assurer que la matrice Markdown et le gate runtime décrivent bien les mêmes secrets.
- Avant de considérer un rollback comme reproductible, vérifier aussi `docs/deployment/rollback-targets.json` et utiliser `./scripts/scw/scw-rollback-plan.sh` au lieu d'assembler une commande `scw container update` à la main.
