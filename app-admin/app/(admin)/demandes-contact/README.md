# Demandes Contact

## Rôle

Ce dossier matérialise un segment de route Next.js. Les fichiers `page.tsx` définissent le rendu, le layout ou le handler HTTP de ce segment.

## Contenu immédiat

Sous-dossiers :

- Aucun élément versionné direct.

Fichiers :

- `page.tsx`

## Intégration

Ce dossier est consommé par l'application `app-admin` et s'insère dans son flux runtime, build ou test.

- `page.tsx` consomme `GET /api/v1/admin/contact-requests` avec pagination, filtres `search/status/request_type` et export CSV de la selection courante.
- l'export CSV de la selection passe par `lib/security/csv.ts` pour neutraliser les cellules interpretees comme formules ou controles par les tableurs.
- le changement de statut passe par `PATCH /api/v1/admin/contact-requests/:requestId/status`; sans persistance admin disponible, la page doit echouer explicitement plutot que retomber sur un stub.
