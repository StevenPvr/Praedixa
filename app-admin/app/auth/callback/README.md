# Callback

## Rôle

Ce dossier matérialise un segment de route Next.js. Les fichiers `route.ts` définissent le rendu, le layout ou le handler HTTP de ce segment.

## Contenu immédiat

Sous-dossiers :

- `__tests__`

Fichiers :

- `route.ts`

## Intégration

Ce dossier est consommé par l'application `app-admin` et s'insère dans son flux runtime, build ou test.

## Garde-fous

- Le callback OIDC échoue fermé si l'origine publique admin n'est pas résoluble; il ne reconstruit jamais un redirect depuis `request.nextUrl.origin`.
- Le handler applique un rate limiting explicite avant l'échange du code et renvoie les headers `X-RateLimit-*` sur chaque issue.
- Les cookies temporaires du login flow sont toujours nettoyés sur les sorties d'erreur.
