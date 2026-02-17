# Runbook - MVP Go/No-Go Readiness

## Objectif

Ce runbook definit la procedure unique pour cloturer le MVP Praedixa et
statuer de facon binaire:

- `GO`: le MVP est livrable.
- `NO-GO`: la release est bloquee jusqu'a correction.

Le principe est simple: aucune interpretation. Toutes les verifications sont
commandees, observables et reproductibles.

## Perimetre MVP Bloquant

Le gate couvre obligatoirement:

- `app-landing`
- `app-webapp`
- `app-admin`
- `app-api`
- `packages/ui` et `packages/shared-types` (impacts transverses)

## Definition de Done (MVP)

Le MVP est considere pret uniquement si toutes les conditions suivantes sont
vraies:

1. Tous les checks qualite et securite passent sans exception.
2. Toutes les suites frontend et backend passent.
3. Tous les E2E `landing`, `webapp`, `admin` passent.
4. La couverture est a `100%` frontend et backend.
5. Aucune divergence entre documentation, scripts et configuration de gate.

## Politique Qualite et Securite

Regles bloquantes:

- Couverture frontend: `100%` (Vitest coverage gate).
- Couverture backend: `100%` (`app-api/pyproject.toml`).
- Secret scan: zero fuite (`gitleaks`).
- Vuln management:
  - `pip-audit`: aucune faille bloquante.
  - `pnpm audit --audit-level=high`: aucune faille high/critical non acceptee.
- E2E: zero test rouge sur les 3 surfaces.

## Pre-requis Operatoires

Executer depuis la racine du repo.

1. Installer les dependances:

```bash
pnpm install --frozen-lockfile
cd app-api && uv sync --extra dev && cd ..
```

2. Installer Chromium pour Playwright:

```bash
pnpm playwright install --with-deps chromium
```

3. (Recommande) Demarrer Postgres local:

```bash
docker compose -f infra/docker-compose.yml up -d postgres
```

## Procedure Gate Complete (a chaque PR)

Commande canonique:

```bash
pnpm mvp:gate
```

Cette commande execute:

1. `pnpm pre-commit` (lint, format check, typecheck, tests, audits, secret scan,
   build, checks e2e critiques).
2. `pnpm test:e2e:landing`
3. `pnpm test:e2e:webapp`
4. `pnpm test:e2e:admin`

## Matrice de Preuves Attendues

| Etape                      | Commande                | Resultat attendu | Preuve                        |
| -------------------------- | ----------------------- | ---------------- | ----------------------------- |
| Qualite + securite + build | `pnpm pre-commit`       | exit code `0`    | log terminal sans hook failed |
| E2E landing                | `pnpm test:e2e:landing` | exit code `0`    | rapport Playwright vert       |
| E2E webapp                 | `pnpm test:e2e:webapp`  | exit code `0`    | rapport Playwright vert       |
| E2E admin                  | `pnpm test:e2e:admin`   | exit code `0`    | rapport Playwright vert       |

Artefacts utiles:

- `playwright-report/`
- `test-results/`
- `coverage/` (frontend)
- sortie `pytest --cov` (backend)

## Regle de Decision Go/No-Go

- `GO`:
  - toutes les commandes obligatoires passent
  - aucun ecart de couverture (<100%) frontend/backend
  - aucune alerte securite bloquante
- `NO-GO`:
  - un seul check rouge suffit
  - la correction est obligatoire avant merge/release

## Procedure d'Echec et Rollback

En cas d'echec:

1. Stopper la release.
2. Identifier le premier check rouge (ne pas corriger au hasard).
3. Corriger avec test de non-regression associe.
4. Relancer `pnpm mvp:gate` en entier.
5. Si incident en production deja declenche, appliquer
   `docs/runbooks/incident-freeze-unfreeze.md`.

## Checklist Finale de Signature

Cocher chaque ligne avant declaration `GO`:

- [ ] `pnpm mvp:gate` vert
- [ ] Couverture frontend `100%`
- [ ] Couverture backend `100%`
- [ ] Aucun blocage securite (`gitleaks`, audits)
- [ ] Aucun test E2E rouge (`landing/webapp/admin`)
- [ ] Artefacts et logs de preuve disponibles

## Assumptions et Defaults

- Le standard de release est `suite complete a chaque PR`.
- Les checks de ce runbook sont les checks bloquants officiels du MVP.
- Toute divergence doc/config/script est traitee comme un defaut bloquant.
