# Tests

## Rôle

Ce dossier regroupe les tests associés au dossier parent `app-admin/app/(admin)`. Il documente et vérifie le comportement attendu de cette zone du code.

## Contenu immédiat

Sous-dossiers :

- Aucun élément versionné direct.

Fichiers :

- `page.test.tsx`
- `uncovered-pages.test.tsx`

## Convention de mock

- `uncovered-pages.test.tsx` doit representer un profil admin large et coherent avec le smoke du back-office; quand une nouvelle section admin repose sur une permission read standard, ajouter cette permission au mock de base au lieu de laisser la suite render des etats `forbidden` trompeurs.

## Intégration

Ce dossier est consommé par l'application `app-admin` et s'insère dans son flux runtime, build ou test.
