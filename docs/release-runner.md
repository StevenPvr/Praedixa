# Release Runner Scaffold

Ce repo contient maintenant un squelette de release immuable orienté runner Scaleway, sans GitHub-hosted CI.

## Objectif

- builder des images par digest
- signer un manifest de release
- déployer staging/prod uniquement depuis ce manifest
- éviter tout déploiement prod basé sur un workspace local sale

## Scripts

- `scripts/scw-release-build.sh`
  - build/push une image pour un service donné
  - sort un JSON avec `service`, `digest`, `registry_image`, `commit_sha`
- `scripts/scw-release-manifest-create.sh`
  - agrège une ou plusieurs images `service=registry@sha256:...`
  - produit un manifest signé
- `scripts/release-manifest-sign.sh`
  - signe un manifest avec une clé HMAC runner
- `scripts/release-manifest-verify.sh`
  - vérifie la signature d’un manifest
- `scripts/scw-release-deploy.sh`
  - lit le manifest et met à jour les containers Scaleway par `registry-image`
- `scripts/scw-release-promote.sh`
  - wrapper de promotion vers `staging` ou `prod`

## Flow minimal

1. Sur le runner, builder les images voulues:

```bash
./scripts/scw-release-build.sh \
  --service api \
  --ref main \
  --tag rel-20260307-1 \
  --registry-prefix rg.fr-par.scw.cloud/<namespace> \
  --output /tmp/api-image.json
```

2. Créer le manifest signé:

```bash
./scripts/scw-release-manifest-create.sh \
  --ref main \
  --gate-report .git/gate-reports/$(git rev-parse HEAD).json \
  --output /tmp/release-manifest.json \
  --image "api=$(jq -r '.registry_image' /tmp/api-image.json)"
```

3. Vérifier puis déployer staging:

```bash
./scripts/release-manifest-verify.sh --manifest /tmp/release-manifest.json
./scripts/scw-release-deploy.sh --manifest /tmp/release-manifest.json --env staging
```

4. Promouvoir prod depuis le même manifest:

```bash
./scripts/scw-release-promote.sh --manifest /tmp/release-manifest.json --to prod
```

### Exemple landing uniquement

```bash
./scripts/scw-release-build.sh \
  --service landing \
  --ref main \
  --tag rel-landing-20260308-1 \
  --registry-prefix rg.fr-par.scw.cloud/<namespace> \
  --output /tmp/landing-image.json

./scripts/scw-release-manifest-create.sh \
  --ref main \
  --gate-report .git/gate-reports/$(git rev-parse HEAD).json \
  --output /tmp/landing-manifest.json \
  --image "landing=$(jq -r '.registry_image' /tmp/landing-image.json)"

./scripts/release-manifest-verify.sh --manifest /tmp/landing-manifest.json
./scripts/scw-release-deploy.sh --manifest /tmp/landing-manifest.json --env staging
./scripts/scw-release-deploy.sh --manifest /tmp/landing-manifest.json --env prod
```

## Notes

- Le manifest contient les digests; staging et prod doivent consommer exactement les mêmes images.
- Le deploy Scaleway Container utilise directement la reference `registry_image` signee du manifest, digest `@sha256` inclus, afin de conserver le pinning immuable.
- La clé HMAC par défaut vit hors repo: `${HOME}/.praedixa/release-manifest.key`.
- Pour `landing`, ce flow remplace définitivement le legacy `scw-deploy-landing.sh`.
- Le mapping `service -> container_name` est actuellement embarqué dans le manifest create/deploy. Si vous industrialisez le runner, déplacez ce mapping dans un inventaire d’environnement versionné.
- `auth` n’est ciblé que pour `prod` dans ce squelette, ce qui reflète l’état courant du repo.
