# Tests

## Rôle

Ce dossier regroupe les tests associés au dossier parent `app-landing/components/shared`. Il documente et vérifie le comportement attendu de cette zone du code.

## Contenu immédiat

Sous-dossiers :

- Aucun élément versionné direct.

Fichiers :

- `BreadcrumbTrail.test.tsx`
- `HeaderScrollState.test.ts`
- `NavigationMenus.test.tsx`

## Intégration

Ce dossier est consommé par l'application `app-landing` et s'insère dans son flux runtime, build ou test.
Quand un comportement de scroll du shell global change, preferer un test unitaire sur le calcul d'etat (`visible` / `hidden` / `elevated`) avant de dupliquer une simulation DOM fragile du scroll dans chaque suite.
