# Donnees

## Rôle

Ce dossier matérialise un segment de route Next.js. Les fichiers `page.tsx` définissent le rendu, le layout ou le handler HTTP de ce segment.

## Contenu immédiat

Sous-dossiers :

- `__tests__`

Fichiers :

- `donnees-gold-explorer-card.tsx`
- `donnees-page-model.tsx`
- `donnees-sections.tsx`
- `page.tsx`

## Intégration

Ce dossier est consommé par l'application `app-admin` et s'insère dans son flux runtime, build ou test.

## Contrat runtime

- `page.tsx` est maintenant principalement presentational; les fetchs et derivees runtime vivent dans `donnees-page-model.tsx`.
- les surfaces `medallion`, `qualite`, `explorateur Gold`, `donnees consolidees` et `journal d'ingestion` sont decoupees dans `donnees-sections.tsx`.
- le detail du bloc `explorateur Gold` vit maintenant dans `donnees-gold-explorer-card.tsx` pour garder `donnees-sections.tsx` plus proche d'un fichier de composition.
- `donnees-sections.tsx` et `donnees-gold-explorer-card.tsx` suivent maintenant les memes conventions Sonar que les autres dossiers admin: props explicites en `Readonly<...>`, ternaires JSX sensibles extraits en variables ou contenus dedies, et conteneurs explicites a la place des fragments purement structurels.
- `donnees-page-model.tsx` garde les classes conditionnelles et les gardes runtime sous forme de variables nommees pour stabiliser l'analyse statique sur les colonnes de table et les fetchs conditionnels.
