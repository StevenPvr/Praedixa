# Rate Limit

## Rôle

Ce dossier fait partie du périmètre `app-webapp` et regroupe des fichiers liés à rate limit.

## Contenu immédiat

Sous-dossiers :

- Aucun élément versionné direct.

Fichiers :

- `fingerprint.ts`
- `memory.ts`
- `policy.ts`
- `redis.ts`
- `resp.ts`
- `types.ts`

## Intégration

Ce dossier est consommé par l'application `app-webapp` et s'insère dans son flux runtime, build ou test.

## Contrat runtime

- hors `NODE_ENV=development`, le rate limit auth doit rester distribue: `AUTH_RATE_LIMIT_REDIS_URL` (ou `RATE_LIMIT_STORAGE_URI`) et `AUTH_RATE_LIMIT_KEY_SALT` sont obligatoires ;
- une misconfiguration ou un outage Redis ne doit plus degrader silencieusement vers la memoire locale ;
- le mode memoire reste reserve au developpement local explicite.
