# Testing

Ce dossier regroupe les briques de test partagees du monorepo: setup Vitest, helpers React Testing Library, suites Playwright et un smoke test performance.

## Sous-arbres

- `e2e/` contient les specs Playwright par produit (`landing`, `webapp`, `admin`) et les fixtures partagees.
- `utils/` contient les helpers et mocks reutilises par les tests unitaires/integration frontend.
- `performance/` contient les checks k6 versionnes.
- `vitest.setup.ts` est charge par les suites Vitest du repo.
- `global-mocks.d.ts` declare les types globaux utilises par les mocks.

## Commandes utiles

Depuis la racine:

```bash
pnpm test
pnpm test:coverage
pnpm test:e2e
pnpm test:e2e:landing
pnpm test:e2e:webapp
pnpm test:e2e:admin
```

## Conventions

- Reutiliser les helpers de `testing/utils` avant de creer un mock local ad hoc.
- Quand un comportement UI change, mettre a jour les specs E2E touchees dans le meme commit.
- Les tests E2E sont organises par produit, pas par couche technique.
- Les fixtures partagees vivent dans `testing/e2e/fixtures`; les fixtures specifiques a une app restent dans son sous-dossier.

## Lire ensuite

- `testing/e2e/README.md`
- `testing/utils/README.md`
- `testing/performance/README.md`
