# Login

## Rôle

Ce dossier matérialise un segment de route Next.js. Les fichiers `route.ts` définissent le rendu, le layout ou le handler HTTP de ce segment.

## Contenu immédiat

Sous-dossiers :

- `__tests__`

Fichiers :

- `route.ts`

## Intégration

Ce dossier est consommé par l'application `app-admin` et s'insère dans son flux runtime, build ou test.
La page `/login` cote UI peut maintenant relancer automatiquement une tentative de connexion si un ancien `error=oidc_provider_untrusted` est stale, en s'appuyant sur le health-check `/auth/provider-status`.
