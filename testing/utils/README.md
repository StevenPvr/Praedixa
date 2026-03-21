# testing/utils

Outils partages pour les tests Vitest et React Testing Library.

## Contenu

- `render.tsx` expose un `render` partage et re-exporte les helpers RTL.
- `mocks/` centralise les mocks Next.js, UI, icones, observateurs navigateur et services externes.

`testing/vitest.setup.ts` consomme ces helpers pour preparer un environnement JSDOM stable dans l'ensemble du repo, y compris le polyfill `canvas` partage.

## Usage typique

```ts
import { render, screen, userEvent } from "../../testing/utils/render";
```

## Conventions

- Ajouter un mock ici seulement s'il sert a plusieurs suites.
- Pour `next/image`, conserver le pattern de mock existant qui filtre les props specifiques a Next.
- Si un helper de rendu doit injecter de nouveaux providers globaux, les ajouter ici plutot que de dupliquer le wrapper dans chaque test.
