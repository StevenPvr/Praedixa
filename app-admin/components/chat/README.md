# Chat

## Rôle

Ce sous-dossier contient une famille spécialisée de composants rattachée à `app-admin`.

## Contenu immédiat

Sous-dossiers :

- `__tests__`

Fichiers :

- `conversation-list.tsx`
- `message-input.tsx`
- `message-thread.tsx`

## Intégration

Ce dossier est consommé par l'application `app-admin` et s'insère dans son flux runtime, build ou test.

## Conventions locales

- `conversation-list.tsx` utilise maintenant `VALID_FILTERS` comme `Set` et passe par `VALID_FILTERS.has(...)` pour valider les filtres d'URL.
- `message-thread.tsx` derive maintenant `previousCreatedAt` avant la comparaison de jour pour garder le separateur de date type-safe sans dereferencer un message precedent absent.
