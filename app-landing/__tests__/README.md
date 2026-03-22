# Tests

## Rôle

Ce dossier regroupe les tests associés au dossier parent `app-landing`. Il documente et vérifie le comportement attendu de cette zone du code.

## Contenu immédiat

Sous-dossiers :

- Aucun élément versionné direct.

Fichiers :

- `proxy.test.ts`
- les regressions de redirects legacy avec query string doivent etre couvertes ici
- les redirects publics `http://www` doivent aussi prouver qu'aucun host runtime interne (`0.0.0.0`, `localhost`, port interne) ne fuit dans `Location`

## Intégration

Ce dossier est consommé par l'application `app-landing` et s'insère dans son flux runtime, build ou test.
