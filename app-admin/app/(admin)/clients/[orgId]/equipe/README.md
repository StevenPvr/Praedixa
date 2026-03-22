# Equipe

## Rôle

Ce dossier matérialise un segment de route Next.js. Les fichiers `page.tsx` définissent le rendu, le layout ou le handler HTTP de ce segment.

## Contenu immédiat

Sous-dossiers :

- `__tests__`

Fichiers :

- `equipe-page-model.tsx`
- `equipe-sections.tsx`
- `page.tsx`

## Intégration

Ce dossier est consommé par l'application `app-admin` et s'insère dans son flux runtime, build ou test.

## Notes locales

- Le formulaire `Creer un compte` provisionne maintenant la vraie identite Keycloak via l'API admin, puis persiste le compte lie par `auth_user_id`.
- La table equipe expose maintenant aussi une colonne `Preuve mail`, derivee de la derniere preuve provider-side persistee pour l'invitation du compte (`pending`, `delivered`, `bounced`, `failed`, etc.).
- `page.tsx` compose maintenant la page depuis `equipe-page-model.tsx` et `equipe-sections.tsx`.
- Les roles `manager` et `hr_manager` exigent un `site_id` explicite dans le formulaire; le bouton reste bloque tant qu'aucun site n'est choisi.
- `equipe-sections.tsx` suit maintenant les memes conventions Sonar que les autres dossiers admin: props de composants explicites en `Readonly<...>`, classes et etats `disabled` derives dans des variables nommees, rendu JSX plus explicite pour les badges et messages de permission, et handlers async relies sans wrapper `void`.
