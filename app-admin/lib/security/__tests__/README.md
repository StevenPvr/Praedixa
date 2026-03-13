# Tests

## Rôle

Ce dossier regroupe les tests associés au dossier parent `app-admin/lib/security`. Il documente et vérifie le comportement attendu de cette zone du code.

## Contenu immédiat

Sous-dossiers :

- Aucun élément versionné direct.

Fichiers :

- `browser-request.test.ts`
- `csp.test.ts`
- `navigation.test.ts`
- `rate-limit.test.ts`

## Intégration

Ce dossier est consommé par l'application `app-admin` et s'insère dans son flux runtime, build ou test.

`rate-limit.test.ts` verifie le contrat fail-close hors developpement et conserve un mode memoire reserve au developpement local.
