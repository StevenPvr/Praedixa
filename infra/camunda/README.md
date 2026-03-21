# Camunda 8

Infrastructure et procedure locale pour le runtime Camunda 8 Self-Managed utilise par l'onboarding admin.

## Choix d'integration

- source officielle: artefact `docker-compose-8.8.zip` publie par `camunda/camunda-distributions`
- mode local par defaut: stack **lightweight** (`docker-compose.yaml`)
- endpoint runtime cible: `http://127.0.0.1:8088/v2`
- auth locale par defaut: `none` sur les APIs du lightweight quickstart

Le repo ne versionne pas en dur le gros compose officiel. A la place, `scripts/camunda-dev.sh` telecharge l'artefact officiel epingle et l'extrait dans `.tools/camunda/`.

## Commandes utiles

Depuis la racine du repo:

```bash
pnpm camunda:download
pnpm camunda:up
pnpm camunda:status
pnpm test:camunda:onboarding
pnpm camunda:logs
pnpm camunda:down
```

Pour la stack complete officielle:

```bash
pnpm camunda:up:full
```

## Variables runtime `app-api-ts`

Mode local lightweight:

```bash
CAMUNDA_ENABLED=true
CAMUNDA_BASE_URL=http://127.0.0.1:8088/v2
CAMUNDA_AUTH_MODE=none
CAMUNDA_DEPLOY_ON_STARTUP=true
```

Mode local full / OAuth:

```bash
CAMUNDA_ENABLED=true
CAMUNDA_BASE_URL=http://127.0.0.1:8088/v2
CAMUNDA_AUTH_MODE=oidc
CAMUNDA_OAUTH_TOKEN_URL=http://127.0.0.1:18080/auth/realms/camunda-platform/protocol/openid-connect/token
CAMUNDA_OAUTH_CLIENT_ID=orchestration
CAMUNDA_OAUTH_CLIENT_SECRET=secret
CAMUNDA_OAUTH_AUDIENCE=orchestration-api
CAMUNDA_DEPLOY_ON_STARTUP=true
```

## Notes d'usage

- `app-api-ts` deploie automatiquement `client-onboarding-v1` au demarrage si aucune definition n'existe encore.
- Le workspace admin ne parle jamais directement a Tasklist: `app-admin` consomme une projection SQL Praedixa synchronisee depuis Camunda.
- `pnpm test:camunda:onboarding` execute le smoke cible `create case -> projection SQL -> complete first user task` contre le stack local et la base Postgres locale.
- Ne jamais utiliser `CAMUNDA_AUTH_MODE=none` hors developpement.

## Lire ensuite

- `docs/plans/2026-03-18-admin-onboarding-bpm-blueprint.md`
- `app-api-ts/src/services/README.md`
