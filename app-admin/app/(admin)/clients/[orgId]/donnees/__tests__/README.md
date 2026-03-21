# Tests

## Rôle

Ce dossier regroupe les tests associés au dossier parent `app-admin/app/(admin)/clients/[orgId]/donnees`. Il documente et vérifie le comportement attendu de cette zone du code.

## Contenu immédiat

Sous-dossiers :

- Aucun élément versionné direct.

Fichiers :

- `page.test.tsx`
  - couvre maintenant l'ouverture persistante du `journal d'ingestion` admin tout en gardant `medallion-quality-report` et `datasets` en fail-close local.

## Intégration

Ce dossier est consommé par l'application `app-admin` et s'insère dans son flux runtime, build ou test.
