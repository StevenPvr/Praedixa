# Journal

## Rôle

Ce dossier matérialise un segment de route Next.js. Les fichiers `page.tsx` définissent le rendu, le layout ou le handler HTTP de ce segment.

## Contenu immédiat

Sous-dossiers :

- Aucun élément versionné direct.

Fichiers :

- `page.tsx`

## Intégration

Ce dossier est consommé par l'application `app-admin` et s'insère dans son flux runtime, build ou test.

- `page.tsx` consomme `GET /api/v1/admin/audit-log` avec pagination et filtre `action`.
- le journal est une surface read-only, mais il doit quand meme echouer explicitement si la persistance admin manque; aucun payload demo/stub n'est accepte sur cette page.
