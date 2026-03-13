# Logout

## Rôle

Ce dossier matérialise un segment de route Next.js. Les fichiers `route.ts` définissent le rendu, le layout ou le handler HTTP de ce segment.

## Contenu immédiat

Sous-dossiers :

- `__tests__`

Fichiers :

- `route.ts`

## Intégration

Ce dossier est consommé par l'application `app-webapp` et s'insère dans son flux runtime, build ou test.

## Garde-fous

- Le handler reste une route JSON cookie-authentifiee: toute origine browser non same-origin est rejetee.
- `Sec-Fetch-Site:none` n'est accepte ici que parce que le logout peut provenir d'une navigation browser explicite de confiance.
- Le handler ne doit pas servir de precedent pour ouvrir `Sec-Fetch-Site:none` sur d'autres routes JSON.
