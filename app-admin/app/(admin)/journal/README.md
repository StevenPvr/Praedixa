# Journal

## Rôle

Ce dossier matérialise un segment de route Next.js. Les fichiers `page.tsx` définissent le rendu, le layout ou le handler HTTP de ce segment.

## Contenu immédiat

Sous-dossiers :

- Aucun élément versionné direct.

Fichiers :

- `journal-page-model.tsx`
- `journal-sections.tsx`
- `page.tsx`

## Intégration

Ce dossier est consommé par l'application `app-admin` et s'insère dans son flux runtime, build ou test.

- `page.tsx` consomme `GET /api/v1/admin/audit-log` avec pagination et filtre `action`.
- `page.tsx` est maintenant surtout presentational; les permissions, l'etat, les colonnes audit et les derivees de selection vivent dans `journal-page-model.tsx`.
- les tabs, la table audit et les cartes RGPD sont maintenant decoupees dans `journal-sections.tsx`.
- le journal est une surface read-only, mais il doit quand meme echouer explicitement si la persistance admin manque; aucun payload demo/stub n'est accepte sur cette page.
