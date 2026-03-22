# Actions

## Rôle

Ce dossier matérialise un segment de route Next.js. Les fichiers `page.tsx` définissent le rendu, le layout ou le handler HTTP de ce segment.

## Contenu immédiat

Sous-dossiers :

- Aucun élément versionné direct.

Fichiers :

- `page.tsx`

## Intégration

Ce dossier est consommé par l'application `app-admin` et s'insère dans son flux runtime, build ou test.

## Notes runtime

- `page.tsx` isole maintenant les blocs de rendu `alerts` et `scenarios` dans des statements dedies pour eviter les ternaires imbriques et garder les surfaces admin plus lisibles pour les analyseurs statiques.
