# Release Runner Scaffold

Ce repo contient maintenant un chemin de release immuable pilote par GitHub Actions, avec les scripts `scw-release-*` comme primitives versionnees reutilisables.

## Objectif

- builder des images par digest
- signer un manifest de release
- déployer staging/prod uniquement depuis ce manifest
- éviter tout déploiement prod basé sur un workspace local sale
- garder un workflow GitHub deterministe: le commit du run est la seule source de build, sans inputs manuels capables de changer `ref`, `tag`, `services` ou la promotion

## Scripts

- `scripts/scw/scw-release-build.sh`
  - build/push une image pour un service donné
  - sort un JSON avec `service`, `digest`, `registry_image`, `commit_sha`
- `scripts/scw/scw-release-manifest-create.sh`
  - agrège une ou plusieurs images `service=registry@sha256:...`
  - produit un manifest signé
- `scripts/release-manifest-sign.sh`
  - signe un manifest avec une clé HMAC runner déjà provisionnée
- `scripts/release-manifest-verify.sh`
  - vérifie la signature d’un manifest ainsi que le digest du gate report et des evidences référencées
- `scripts/scw/scw-release-deploy.sh`
  - lit le manifest et met à jour les containers Scaleway par `registry-image`
- `scripts/scw/scw-release-promote.sh`
  - wrapper de promotion vers `staging` ou `prod`

## Flow minimal

1. Sur le runner, builder les images voulues:

```bash
./scripts/scw/scw-release-build.sh \
  --service api \
  --ref main \
  --tag rel-20260307-1 \
  --registry-prefix rg.fr-par.scw.cloud/<namespace> \
  --output /tmp/api-image.json
```

2. Créer le manifest signé:

```bash
./scripts/scw/scw-release-manifest-create.sh \
  --ref main \
  --gate-report .git/gate-reports/$(git rev-parse HEAD).json \
  --output /tmp/release-manifest.json \
  --image "api=$(jq -r '.registry_image' /tmp/api-image.json)"
```

3. Vérifier puis déployer staging:

```bash
./scripts/release-manifest-verify.sh --manifest /tmp/release-manifest.json
./scripts/scw/scw-release-deploy.sh --manifest /tmp/release-manifest.json --env staging
```

4. Promouvoir prod depuis le même manifest:

```bash
./scripts/scw/scw-release-promote.sh --manifest /tmp/release-manifest.json --to prod
```

### Exemple landing uniquement

```bash
./scripts/scw/scw-release-build.sh \
  --service landing \
  --ref main \
  --tag rel-landing-20260308-1 \
  --registry-prefix rg.fr-par.scw.cloud/<namespace> \
  --output /tmp/landing-image.json

./scripts/scw/scw-release-manifest-create.sh \
  --ref main \
  --gate-report .git/gate-reports/$(git rev-parse HEAD).json \
  --output /tmp/landing-manifest.json \
  --image "landing=$(jq -r '.registry_image' /tmp/landing-image.json)"

./scripts/release-manifest-verify.sh --manifest /tmp/landing-manifest.json
./scripts/scw/scw-release-deploy.sh --manifest /tmp/landing-manifest.json --env staging
./scripts/scw/scw-release-deploy.sh --manifest /tmp/landing-manifest.json --env prod
```

## Notes

- Le manifest contient les digests; staging et prod doivent consommer exactement les mêmes images.
- Le manifest reste la source de verite via `registry_image@sha256:...`; si l'API Scaleway Container refuse cette reference signee, le deploy doit echouer explicitement.
- La clé HMAC par défaut vit hors repo: `${HOME}/.praedixa/release-manifest.key`.
- Cette clé doit être préprovisionnée hors repo avant signature ou vérification; aucun script ne doit créer une nouvelle racine de confiance à la volée.
- Pour `landing`, ce flow remplace définitivement le legacy `scw-deploy-landing.sh`.
- Le mapping `service -> container_name` doit maintenant converger vers les outputs state-backed d'`infra/opentofu/environments/*`, pas rester dupliqué dans des scripts ou des runners.
- `auth` n’est ciblé que pour `prod` dans ce squelette, ce qui reflète l’état courant du repo.
