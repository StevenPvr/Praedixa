# Previsions

## Rôle

Ce dossier matérialise un segment de route Next.js. Les fichiers `page.tsx` définissent le rendu, le layout ou le handler HTTP de ce segment.

## Contenu immédiat

Sous-dossiers :

- `__tests__`

Fichiers :

- `page.tsx`

## Intégration

Ce dossier est consommé par l'application `app-admin` et s'insère dans son flux runtime, build ou test.

## Notes locales

- `page.tsx` garde maintenant `PrevisionsPage` sur un role d'orchestration leger; les branches de rendu `feature gate`, erreur globale, cartes resumees, derive recente et scenarios sont sorties dans des helpers dedies.
- les ternaires JSX sensibles du dossier sont maintenant remplaces par des statements explicites (`content`, helpers de rendu) pour reduire la complexite cognitive et stabiliser Sonar.
