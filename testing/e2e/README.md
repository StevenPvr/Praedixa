# testing/e2e

Suites end-to-end Playwright du repo.

## Organisation

- `landing/` couvre la landing publique et les pages legales.
- `webapp/` couvre l'application client.
- `admin/` couvre l'application d'administration.
- `fixtures/` contient les helpers transverses de reseau, auth OIDC, couverture et reporter.

La config est definie dans `playwright.config.ts` a la racine. Par defaut, les trois apps demarrent sur `3000`, `3001` et `3002`, mais les scripts cibles utilisent maintenant `PW_SERVER_TARGETS` pour ne lancer que les serveurs necessaires au projet Playwright demande.
Les web servers Playwright doivent demarrer via les binaires app-locaux `./node_modules/.bin/next` avec `cwd` dedie, pas via des wrappers `pnpm`, pour que le teardown des hooks puisse tuer le vrai processus serveur sans rester suspendu.
En local, le repo force maintenant `1` worker Playwright par defaut; utilise `PW_WORKERS=<n>` seulement si tu veux volontairement remonter la parallelisation.
La suite `pnpm test:e2e:admin` demarre maintenant `admin` et `webapp`, parce qu'elle inclut la verification de session croisee `cross-app-session-isolation`.

## Lancer les suites

```bash
pnpm e2e:ports:free
pnpm test:e2e
pnpm test:e2e:landing
pnpm test:e2e:webapp
pnpm test:e2e:admin
pnpm test:e2e:admin:cross-app
pnpm test:e2e:smoke
```

Pour une spec ciblee:

```bash
pnpm e2e:ports:free
PW_SERVER_TARGETS=webapp playwright test testing/e2e/webapp/dashboard.spec.ts --project=webapp
```

## Conventions

- Utiliser les fixtures partagees avant d'introduire un nouveau bootstrap d'auth ou de reseau.
- Garder les specs centrees sur un parcours utilisateur ou une regression nommee.
- Si un test depend d'un contrat API mocke, aligner le mock avec `packages/shared-types` et `contracts/openapi/`.
- Les changements de copy ou d'ARIA visibles peuvent casser les assertions Playwright: ajuster la spec en meme temps que l'UI.
- `pnpm test:e2e:smoke` est la suite minimale cross-app pour `webapp` et `admin`; elle doit rester alignée avec le runbook de release.
- la spec `admin/cross-app-session-isolation.spec.ts` depend explicitement de `PW_SERVER_TARGETS=admin,webapp`; le script `pnpm test:e2e:admin` couvre deja ce cas, et `pnpm test:e2e:admin:cross-app` sert de rerun focalise.

## Sous-dossiers

- `landing/README.md`
- `webapp/README.md`
- `admin/README.md`
- `fixtures/README.md`
