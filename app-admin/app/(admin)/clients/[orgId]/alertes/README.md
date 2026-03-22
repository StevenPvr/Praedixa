# Alertes

## Rôle

Ce dossier matérialise un segment de route Next.js. Les fichiers `page.tsx` définissent le rendu, le layout ou le handler HTTP de ce segment.

## Contenu immédiat

Sous-dossiers :

- `__tests__`

Fichiers :

- `page.tsx`

## Intégration

Ce dossier est consommé par l'application `app-admin` et s'insère dans son flux runtime, build ou test.

## Notes runtime

- `page.tsx` calcule maintenant la classe de statut via un helper dedie et isole le rendu `loading/error/content` de la table dans un statement distinct pour eviter les ternaires imbriques.
