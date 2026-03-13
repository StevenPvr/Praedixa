# Tests

## Rôle

Ce dossier regroupe les tests associés au dossier parent `app-webapp/app/(app)`. Il documente et vérifie le comportement attendu de cette zone du code.

## Contenu immédiat

Sous-dossiers :

- Aucun élément versionné direct.

Fichiers :

- `layout.test.tsx`
- `not-found.test.tsx`

## Intégration

Ce dossier est consommé par l'application `app-webapp` et s'insère dans son flux runtime, build ou test.

## Regles

- `layout.test.tsx` isole `I18nProvider` avec un mock stable quand le comportement teste concerne le shell, pour eviter que la synchronisation des preferences utilisateur ne rende le test asynchrone ou bruyant sans apporter de signal supplementaire.
