# Tests

## Rôle

Ce dossier regroupe les tests associés au dossier parent `app-webapp/app/(app)/actions`. Il documente et vérifie le comportement attendu de cette zone du code.

## Contenu immédiat

Sous-dossiers :

- Aucun élément versionné direct.

Fichiers :

- `page.test.tsx`

## Invariants surveilles

- la page soumet le contrat runtime partage `OperationalDecisionCreateRequest`
- un override ne peut pas etre envoye sans justification explicite

## Intégration

Ce dossier est consommé par l'application `app-webapp` et s'insère dans son flux runtime, build ou test.
