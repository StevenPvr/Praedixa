# Tests

## Rôle

Ce dossier regroupe les tests associés au dossier parent `app-webapp/app/auth/callback`. Il documente et vérifie le comportement attendu de cette zone du code.

## Contenu immédiat

Sous-dossiers :

- Aucun élément versionné direct.

Fichiers :

- `route.test.ts`

## Intégration

Ce dossier est consommé par l'application `app-webapp` et s'insère dans son flux runtime, build ou test.

## Couverture critique

- echange de tokens et `redirectUri` bases sur l'origine publique explicite;
- nettoyage des cookies sur les echecs de callback;
- fail-close `500` quand l'origine publique n'est pas resolvable.
