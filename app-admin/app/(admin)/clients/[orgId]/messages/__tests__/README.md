# Tests

## Rôle

Ce dossier regroupe les tests associés au dossier parent `app-admin/app/(admin)/clients/[orgId]/messages`. Il documente et vérifie le comportement attendu de cette zone du code.

## Contenu immédiat

Sous-dossiers :

- Aucun élément versionné direct.

Fichiers :

- `page.test.tsx`
  - verrouille le fail-close local de la page quand la surface conversations/messages n'est pas encore branchee sur une route persistante admin.

## Intégration

Ce dossier est consommé par l'application `app-admin` et s'insère dans son flux runtime, build ou test.
