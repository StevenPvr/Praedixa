# Rapports

## Rôle

Ce dossier matérialise un segment de route Next.js. Les fichiers `page.tsx` définissent le rendu, le layout ou le handler HTTP de ce segment.

## Contenu immédiat

Sous-dossiers :

- Aucun élément versionné direct.

Fichiers :

- `page.tsx`
- `rapports-page-model.tsx`
- `rapports-sections.tsx`
- `rapports-proof-pack-panel.tsx`

## Intégration

Ce dossier est consommé par l'application `app-admin` et s'insère dans son flux runtime, build ou test.

## Notes runtime

- `page.tsx` ne garde plus que le fail-close global quand toutes les surfaces remontent en erreur.
- `rapports-page-model.tsx` concentre les queries proof packs / quality / alerts, les derives de synthese et la mutation de partage.
- `rapports-sections.tsx` porte le rendu des cartes et delegue maintenant le tableau proof packs + partage a `rapports-proof-pack-panel.tsx`.
- Le dossier suit maintenant les memes conventions Sonar que les autres surfaces admin: props explicites en `Readonly<...>`, labels relies a leurs controles, ternaires JSX sensibles sortis en variables de rendu, et mutation de partage branchee sans wrapper `void` dans `page.tsx`.
