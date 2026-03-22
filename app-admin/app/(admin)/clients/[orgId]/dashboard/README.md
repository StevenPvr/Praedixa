# Dashboard

## Rôle

Ce dossier matérialise un segment de route Next.js. Les fichiers `page.tsx` définissent le rendu, le layout ou le handler HTTP de ce segment.

## Contenu immédiat

Sous-dossiers :

- Aucun élément versionné direct.

Fichiers :

- `page.tsx`
- `dashboard-sections.tsx`
- `test-client-deletion-card.tsx`

## Intégration

Ce dossier est consommé par l'application `app-admin` et s'insère dans son flux runtime, build ou test.

## Contrat runtime

- Le dashboard consomme `GET /api/v1/admin/organizations/:orgId/overview` et remonte maintenant le flag `organization.isTest`.
- `page.tsx` ne garde plus que les branches `loading/error` et la composition generale; les sections du rendu vivent maintenant dans `dashboard-sections.tsx`.
- Quand `isTest=true`, le dashboard affiche une carte de suppression definitive avec confirmations multiples (checkbox irreversible + slug exact + `SUPPRIMER`).
- La mutation destructive passe par `POST /api/v1/admin/organizations/:orgId/delete`; le backend refuse toute suppression si l'organisation n'est pas marquee `isTest` et purge aussi les identites `auth_user_id` encore provisionnees pour ce tenant avant d'effacer l'organisation.
- `dashboard-sections.tsx` et `test-client-deletion-card.tsx` suivent maintenant les memes conventions Sonar que `config/` et `contrats/`: props de composants explicites en `Readonly<...>`, boolens intermediaires positifs a la place de conditions negatives longues, fragments courts remplaces par des conteneurs explicites quand ils n'apportent rien, et JSX texte/tag rendu plus explicite pour eviter les faux positifs de parsing.
