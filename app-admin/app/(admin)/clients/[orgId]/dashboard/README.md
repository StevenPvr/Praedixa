# Dashboard

## Rôle

Ce dossier matérialise un segment de route Next.js. Les fichiers `page.tsx` définissent le rendu, le layout ou le handler HTTP de ce segment.

## Contenu immédiat

Sous-dossiers :

- Aucun élément versionné direct.

Fichiers :

- `page.tsx`
- `test-client-deletion-card.tsx`

## Intégration

Ce dossier est consommé par l'application `app-admin` et s'insère dans son flux runtime, build ou test.

## Contrat runtime

- Le dashboard consomme `GET /api/v1/admin/organizations/:orgId/overview` et remonte maintenant le flag `organization.isTest`.
- Quand `isTest=true`, le dashboard affiche une carte de suppression definitive avec confirmations multiples (checkbox irreversible + slug exact + `SUPPRIMER`).
- La mutation destructive passe par `POST /api/v1/admin/organizations/:orgId/delete`; le backend refuse toute suppression si l'organisation n'est pas marquee `isTest` et purge aussi les identites `auth_user_id` encore provisionnees pour ce tenant avant d'effacer l'organisation.
