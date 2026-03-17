# Tests

## Rôle

Ce dossier regroupe les tests associés au dossier parent `app-admin/app/(admin)/clients/[orgId]/equipe`. Il documente et vérifie le comportement attendu de cette zone du code.

## Contenu immédiat

Sous-dossiers :

- Aucun élément versionné direct.

Fichiers :

- `page.test.tsx`

## Intégration

Ce dossier est consommé par l'application `app-admin` et s'insère dans son flux runtime, build ou test.

## Notes locales

- Les tests couvrent maintenant le payload site-scope du formulaire (`site_id` obligatoire pour `manager` / `hr_manager`) afin d'eviter qu'un compte invalide soit cree depuis le backoffice.
