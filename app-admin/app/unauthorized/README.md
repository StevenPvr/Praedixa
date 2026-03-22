# Unauthorized

## Rôle

Ce dossier matérialise un segment de route Next.js. Les fichiers `page.tsx` définissent le rendu, le layout ou le handler HTTP de ce segment.

## Contenu immédiat

Sous-dossiers :

- `__tests__`

Fichiers :

- `page.tsx`

## Intégration

Ce dossier est consommé par l'application `app-admin` et s'insère dans son flux runtime, build ou test.

## Contrat runtime

- `page.tsx` reste volontairement statique et minimal; il n'embarque pas d'etat client ni de logique conditionnelle.
- le lien de reconnexion pointe directement vers `/login?reauth=1` pour reprendre le flux OIDC standard sans redirection intermediaire.
