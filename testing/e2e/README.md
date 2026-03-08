# testing/e2e

Suites end-to-end Playwright du repo.

## Organisation

- `landing/` couvre la landing publique et les pages legales.
- `webapp/` couvre l'application client.
- `admin/` couvre l'application d'administration.
- `fixtures/` contient les helpers transverses de reseau, auth OIDC, couverture et reporter.

La config est definie dans `playwright.config.ts` a la racine. Les trois apps sont demarrees automatiquement sur `3000`, `3001` et `3002` pendant les runs E2E.

## Lancer les suites

```bash
pnpm e2e:ports:free
pnpm test:e2e
pnpm test:e2e:landing
pnpm test:e2e:webapp
pnpm test:e2e:admin
```

Pour une spec ciblee:

```bash
pnpm e2e:ports:free
playwright test testing/e2e/webapp/dashboard.spec.ts --project=webapp
```

## Conventions

- Utiliser les fixtures partagees avant d'introduire un nouveau bootstrap d'auth ou de reseau.
- Garder les specs centrees sur un parcours utilisateur ou une regression nommee.
- Si un test depend d'un contrat API mocke, aligner le mock avec `packages/shared-types` et `contracts/openapi/`.
- Les changements de copy ou d'ARIA visibles peuvent casser les assertions Playwright: ajuster la spec en meme temps que l'UI.

## Sous-dossiers

- `landing/README.md`
- `webapp/README.md`
- `admin/README.md`
- `fixtures/README.md`
