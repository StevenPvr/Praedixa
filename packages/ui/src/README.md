# ui/src

Source du design system partage Praedixa.

## Structure

- `components/` contient les composants React exportes par le package.
- `components/data-table/` isole le tableau riche et ses sous-parties.
- `hooks/` contient les hooks UI partageables.
- `utils/` contient les utilitaires de presentation.
- `__tests__/` couvre les composants et utilitaires publics.
- `brand-tokens.css` expose les tokens CSS partages.
- `index.ts` definit l'API publique du package.

## Conventions

- Ajouter ici uniquement des composants ou helpers reutilisables par plusieurs apps.
- Garder le package agnostique du routing, de l'auth et des services metier.
- Exporter explicitement tout nouvel element depuis `index.ts`.
- Si un composant depend de types partages, les importer depuis `@praedixa/shared-types` plutot que de redefinir des shapes locales.

## Verification locale

```bash
pnpm --filter @praedixa/ui lint
pnpm --filter @praedixa/ui typecheck
pnpm --filter @praedixa/ui test
pnpm --filter @praedixa/ui build
```

## Impact repo

Tout changement ici peut casser:

- les builds des apps consommatrices;
- les tests Vitest qui montent les composants via `testing/utils/render.tsx`;
- les tests Playwright si un role, un libelle ou un flux UI visible change.
