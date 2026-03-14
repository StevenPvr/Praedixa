# Tests

## Rôle

Ce dossier regroupe les tests associés au dossier parent `app-landing/app/api/contact`. Il documente et vérifie le comportement attendu de cette zone du code.

## Contenu immédiat

Sous-dossiers :

- Aucun élément versionné direct.

Fichiers :

- `route.test.ts`

## Intégration

Ce dossier est consommé par l'application `app-landing` et s'insère dans son flux runtime, build ou test.
Conserver au moins un test d'abus qui prouve qu'un `Origin` de prod apparemment valide reste rejete quand `Sec-Fetch-Site` indique une requete cross-site.
