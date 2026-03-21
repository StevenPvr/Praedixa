# Tests

## Rôle

Ce dossier regroupe les tests associés au dossier parent `app-admin/app/(admin)/clients/[orgId]/previsions`. Il documente et vérifie le comportement attendu de cette zone du code.

## Contenu immédiat

Sous-dossiers :

- Aucun élément versionné direct.

Fichiers :

- `page.test.tsx`
  - verrouille le fail-close local des surfaces `scenarios`, `ml-monitoring/summary` et `ml-monitoring/drift` tant qu'elles restent non industrialisees.

## Intégration

Ce dossier est consommé par l'application `app-admin` et s'insère dans son flux runtime, build ou test.
