# Contribuer à Praedixa

Merci de contribuer ! Ce repo contient uniquement la landing page.

## Pré-requis

- Node.js 22+
- pnpm 9+
- pre-commit (recommandé)

## Setup

```bash
pnpm install
cp .env.example .env
pre-commit install --install-hooks
```

## Commandes utiles

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm pre-commit
```

## Qualité (obligatoire)

Avant PR, assurez-vous que `pnpm pre-commit` passe.
La CI exécute exactement les mêmes hooks.
