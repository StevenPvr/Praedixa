# V1

## Rôle

Ce dossier porte des routes serveur ou des handlers BFF utilisés par une app Next.js. On y trouve la frontière HTTP côté application.

## Contenu immédiat

Sous-dossiers :

- `[...path]`

Fichiers :

- Aucun élément versionné direct.

## Intégration

Ce dossier est consommé par l'application `app-admin` et s'insère dans son flux runtime, build ou test.

## Conventions locales

- `[...path]/route.ts` garde maintenant la logique du proxy BFF decoupee en helpers (`serializeUnknownError`, `validateContentLength`, `readFallbackBody`, `readStreamBody`, `resolveProxyAccessContext`, `buildUpstreamInit`, `buildProxyResponse`) pour limiter la complexite Sonar sans changer le contrat HTTP.
