# testing/e2e/webapp

Specs Playwright de l'application client.

## Ce qui est teste ici

- authentification et erreurs de login;
- navigation authentifiee;
- dashboards, donnees, decisions, previsions, rapports et messages;
- regressions responsives, visuelles et edge cases API;
- scenarios couverts par des fixtures webapp dediees.

## Conventions

- Garder les fixtures specifiques dans `testing/e2e/webapp/fixtures/`.
- Quand un parcours depend d'un etat OIDC ou d'une session, reutiliser les helpers partages au lieu de forger les cookies dans chaque spec.
- Si un changement modifie le comportement de proxy `/api/v1/*` ou les headers d'auth, verifier aussi les tests de route cote app.

## Commandes utiles

```bash
pnpm test:e2e:webapp
pnpm test:e2e:webapp:timeline
pnpm test:e2e:webapp:visual
```
