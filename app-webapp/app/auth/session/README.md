# Session

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

- Le handler est strictement same-origin pour les requetes browser JSON.
- Une requete sans `Origin` ne passe pas par defaut; `Sec-Fetch-Site:none` n'est pas accepte sur cette surface.
- La session est resolue seulement apres validation de l'origine et ne doit jamais exposer le bearer token.
