# testing/e2e/admin

Specs Playwright de l'application d'administration.

## Ce qui est teste ici

- login et controle d'acces;
- smoke minimal post-deploy sur le shell admin et la redirection vers `/login`;
- navigation et isolation de session entre apps;
- vues donnees, clients, equipe, journal et parametres;
- workspaces admin encore volontairement fail-close (`previsions`, `messages`) pour verifier que les specs restent alignees avec la verite runtime locale;
- workspace admin et ses regressions de layout ou messagerie;
- scenarios s'appuyant sur des fixtures admin dediees.

## Conventions

- Les tests d'autorisation doivent rester alignes avec les protections middleware et route-level cote app.
- Conserver dans `fixtures/` les mocks reutilises par plusieurs specs admin.
- Quand un tab, un lien ou une page admin change, verifier les specs de navigation et d'access control dans le meme lot.

## Commande ciblee

```bash
pnpm test:e2e:admin
pnpm test:e2e:admin:cross-app
pnpm test:e2e:smoke
```
