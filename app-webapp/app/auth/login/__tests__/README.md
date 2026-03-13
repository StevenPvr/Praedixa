# Tests

## Rôle

Ce dossier regroupe les tests associés au dossier parent `app-webapp/app/auth/login`. Il documente et vérifie le comportement attendu de cette zone du code.

## Contenu immédiat

Sous-dossiers :

- Aucun élément versionné direct.

Fichiers :

- `route.test.ts`

## Intégration

Ce dossier est consommé par l'application `app-webapp` et s'insère dans son flux runtime, build ou test.

## Couverture critique

- generation du `redirect_uri` depuis l'origine publique explicite;
- erreurs `oidc_config_missing`, `oidc_config_insecure` et `oidc_provider_untrusted`;
- fail-close `500` quand l'origine publique n'est pas resolvable.
