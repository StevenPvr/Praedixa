# Endpoints

## Rôle

Ce dossier fait partie du périmètre `app-webapp` et regroupe des fichiers liés à endpoints.

## Contenu immédiat

Sous-dossiers :

- Aucun élément versionné direct.

Fichiers :

- `core.ts`
- `data.ts`
- `shared.ts`
- `support.ts`

## Intégration

Ce dossier est consommé par l'application `app-webapp` et s'insère dans son flux runtime, build ou test.

- `data.ts` et `support.ts` restent des surfaces d'API pures: on y factorise seulement des helpers de chemins/lecture-ecriture, sans y mettre de logique UI ou d'auth metier.
