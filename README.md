# Praedixa

Landing page marketing pour Praedixa — **pilotage économique des absences pour PME/ETI**.

## Structure

```
praedixa/
├── apps/landing/          # Landing Next.js
├── packages/ui/           # UI partagé
└── packages/shared-types/ # Types partagés
```

## Prérequis

- Node.js 22+
- pnpm 9+
- pre-commit (recommandé)

## Installation locale

```bash
pnpm install
cp .env.example .env
pnpm dev
```

## Qualité & Sécurité (pré-commit)

```bash
pipx install pre-commit
pre-commit install --install-hooks
pnpm pre-commit
```

Les hooks couvrent : formatting, lint, typecheck, tests, build, actionlint, gitleaks.

## CI/CD (automatisé)

### Déclencheurs

- **PR vers main** → exécute les checks pre-commit
- **Push sur main** → checks + build + déploiement Cloudflare Workers

### Secrets GitHub requis

- `SCW_ACCESS_KEY`
- `SCW_SECRET_KEY`
- `SCW_PROJECT_ID`
- `SCW_ORGANIZATION_ID`

### Déploiement Cloudflare Workers

La pipeline utilise `wrangler` et le runtime Workers.
Configuration dans `apps/landing/wrangler.jsonc`.

Secrets GitHub requis :

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
