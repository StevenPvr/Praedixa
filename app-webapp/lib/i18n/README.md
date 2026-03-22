# I18n

## Rôle

Ce dossier contient la logique d'internationalisation: configuration, providers, dictionnaires et tests associés.

## Contenu immédiat

Sous-dossiers :

- Aucun élément versionné direct.

Fichiers :

- `messages.ts`
- `provider.tsx`

## Intégration

Ce dossier est consommé par l'application `app-webapp` et s'insère dans son flux runtime, build ou test.

## Regles

- `provider.tsx` synchronise les preferences utilisateur via `/api/v1/users/me/preferences` sur le proxy same-origin.
- Un echec de lecture ou d'ecriture des preferences ne doit jamais etre silencieux: le provider expose un etat `preferencesSyncState` et un message `preferencesSyncError`.
- La locale de l'application vient de la preference serveur confirmee ou du `FALLBACK_LOCALE`, jamais d'un cache `localStorage` implicite.
- Si la persistance est indisponible, `preferencesSyncState` passe a `unavailable` et le changement de langue echoue cote client au lieu de simuler une preference enregistree localement.
- `WEBAPP_RUNTIME_FEATURES.userPreferencesPersistence` est maintenant active pour le runtime webapp principal; si cette persistance doit etre recoupee, il faut rerun les E2E `parametres` associes avant de pousser.
