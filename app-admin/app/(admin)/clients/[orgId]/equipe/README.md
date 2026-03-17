# Equipe

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

- Le formulaire `Creer un compte` provisionne maintenant la vraie identite Keycloak via l'API admin, puis persiste le compte lie par `auth_user_id`.
- Les roles `manager` et `hr_manager` exigent un `site_id` explicite dans le formulaire; le bouton reste bloque tant qu'aucun site n'est choisi.
