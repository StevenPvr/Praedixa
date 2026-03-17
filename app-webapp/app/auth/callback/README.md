# Callback

## Rôle

Ce dossier matérialise un segment de route Next.js. Les fichiers `route.ts` définissent le rendu, le layout ou le handler HTTP de ce segment.

## Contenu immédiat

Sous-dossiers :

- `__tests__`

Fichiers :

- `route.ts`

## Intégration

Ce dossier est consommé par l'application `app-webapp` et s'insère dans son flux runtime, build ou test.

## Regles de production

- Le callback reutilise la meme origine publique explicite que `/auth/login`.
- En production, aucun fallback vers `request.nextUrl.origin` n'est autorise pour l'echange de tokens ou les redirects.
- Si l'origine publique n'est pas resolvable, la route echoue ferme en `500` `oidc_config_missing`.
- Quand le token echange ne porte pas le contrat canonique attendu, le callback renvoie `auth_claims_invalid` avec un `token_reason` minimal (`missing_role`, `missing_email`, etc.) pour accelerer le diagnostic sans exposer le token brut.
