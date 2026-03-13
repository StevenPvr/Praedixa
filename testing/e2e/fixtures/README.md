# testing/e2e/fixtures

Fixtures Playwright partagees entre plusieurs projets E2E.

## Fichiers cles

- `oidc-auth.ts` applique des cookies de session OIDC de test.
- `oidc-config.ts` centralise les constantes d'auth E2E.
- `network.ts` aide au controle des appels reseau.
- `coverage.ts` active la collecte de couverture navigateur quand demandee.
- `monocart-reporter-safe.cjs` branche le reporter HTML de couverture E2E.

## Quand ajouter ici

- Ajouter un helper ici s'il est consomme par au moins deux sous-projets E2E.
- Garder dans les sous-dossiers `admin/` ou `webapp/` les mocks propres a une seule app.

## Attention

- Les fixtures d'auth doivent rester coherentes avec les cookies et sessions gerees dans `app-webapp` et `app-admin`.
- Quand `app-admin` exige des permissions explicites dans la session, `oidc-auth.ts` doit injecter les memes permissions a la fois dans le JWT E2E et dans la session signee; un role seul ne suffit pas.
- Une fixture partagee trop specifique cree du couplage: preferer des primitives simples et composees par les specs.
