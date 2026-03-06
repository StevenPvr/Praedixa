# Centaurus - Deploiement protege sur Scaleway

Date de reference: 2026-03-06

## Objectif

Publier le one-page `centaurus` sur un sous-domaine dedie avec:

- hebergement Scaleway Serverless Containers (`fr-par`)
- protection HTTP Basic cote serveur
- URL partageable avec un prospect
- blocage indexation (`noindex, nofollow`)

## Cible

- Hostname par defaut: `centaurus.praedixa.com`
- Namespace: `centaurus-prod`
- Container: `centaurus-prospect`

## Architecture

- build statique Vite dans `centaurus/dist`
- image Nginx protegee par auth HTTP Basic
- secret runtime:
  - `BASIC_AUTH_USERNAME`
  - `BASIC_AUTH_PASSWORD`

## Commandes

### 1. Bootstrap infra

```bash
pnpm run scw:bootstrap:centaurus
```

### 2. Configurer les secrets d'acces

```bash
BASIC_AUTH_USERNAME='centaurus' \
BASIC_AUTH_PASSWORD='<mot-de-passe-fort>' \
pnpm run scw:configure:centaurus
```

### 3. Deployer l'image

```bash
SCW_DEPLOY_ALLOW_DIRTY=1 pnpm run scw:deploy:centaurus
```

## Rotation du mot de passe

Relancer simplement:

```bash
BASIC_AUTH_USERNAME='centaurus' \
BASIC_AUTH_PASSWORD='<nouveau-mot-de-passe>' \
pnpm run scw:configure:centaurus
```

Le container utilisera le nouveau mot de passe au prochain redeploiement ou redemarrage.

## Note DNS

Le script `scw:bootstrap:centaurus` met a jour la zone DNS Scaleway.
Si le DNS public de `praedixa.com` est encore pilote ailleurs, il faut aussi reproduire le CNAME cote fournisseur public actuel.

## Validation

- `npm run test -- --run` dans `centaurus`
- `npm run build` dans `centaurus`
- verification navigateur sur l'URL protegee
