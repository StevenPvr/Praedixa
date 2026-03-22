# Demandes Contact

## Rôle

Ce dossier matérialise un segment de route Next.js. Les fichiers `page.tsx` définissent le rendu, le layout ou le handler HTTP de ce segment.

## Contenu immédiat

Sous-dossiers :

- Aucun élément versionné direct.

Fichiers :

- `demandes-contact-page-model.tsx`
- `page.tsx`

## Intégration

Ce dossier est consommé par l'application `app-admin` et s'insère dans son flux runtime, build ou test.

- `page.tsx` consomme `GET /api/v1/admin/contact-requests` avec pagination, filtres `search/status/request_type` et export CSV de la selection courante.
- `page.tsx` est maintenant surtout presentational; l'etat, les mutations de statut, l'export CSV et les colonnes vivent dans `demandes-contact-page-model.tsx`.
- l'export CSV de la selection passe par `lib/security/csv.ts` pour neutraliser les cellules interpretees comme formules ou controles par les tableurs.
- le changement de statut passe par `PATCH /api/v1/admin/contact-requests/:requestId/status`; sans persistance admin disponible, la page doit echouer explicitement plutot que retomber sur un stub.
- `demandes-contact-page-model.tsx` construit maintenant son URL via `querySuffix` et concatenation simple, sans template imbrique autour de `queryString`.
- `page.tsx` derive maintenant `isSupportReadOnly`, `hasMultipleRequests`, `hasInitialLoadingState`, `selectionToolbar` et `content` avant le `return` pour eviter les negations inline et les ternaires JSX imbriques autour du `DataTable`.
