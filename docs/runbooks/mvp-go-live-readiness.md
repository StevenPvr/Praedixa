# Runbook - MVP Go/No-Go Readiness

## Objectif

Ce runbook definit la procedure unique pour statuer:

- `GO`: release autorisee
- `NO-GO`: release bloquee jusqu'a correction

Regle: aucun contournement, aucune exception durable.

## Perimetre Bloquant

Le gate couvre obligatoirement:

- `app-landing`
- `app-webapp`
- `app-admin`
- `app-api`
- `packages/ui`
- `packages/shared-types`

## Definition de Done (MVP)

Le MVP est valide uniquement si:

1. Le gate local exhaustif est vert sur le commit cible.
2. Le rapport signe de gate est valide et lie au `HEAD`.
3. Aucun finding securite bloquant (LOW+ selon policy) n'est ouvert.
4. Aucune divergence entre docs, scripts, configuration et hooks.

## Politique Qualite et Securite

Regles bloquantes:

- gate local exhaustif: `pnpm gate:exhaustive`
- verification pre-push: `pnpm gate:prepush`
- scans securite: secrets, SAST, SCA, IaC, scans dynamiques API
- qualite: lint, typecheck, tests, build, complexite/architecture
- frontend: e2e critiques + budgets perf + a11y + schema markup

## Pre-requis Operatoires

Executer depuis la racine:

```bash
pnpm install --frozen-lockfile
cd app-api && uv sync --extra dev && cd ..
./scripts/dev/install-prek.sh
```

Installer les dependances outillage gate:

- `semgrep`
- `checkov`
- `trivy`
- `codeql`
- `osv-scanner`
- `k6`

## Procedure Gate Complete

Commande canonique:

```bash
pnpm gate:exhaustive
```

Verification du rapport:

```bash
pnpm gate:verify
```

Verification pre-push (auto-regeneration si necessaire):

```bash
pnpm gate:prepush
```

## Matrice de Preuves Attendues

| Etape                 | Commande               | Resultat attendu | Preuve                          |
| --------------------- | ---------------------- | ---------------- | ------------------------------- |
| Gate exhaustif        | `pnpm gate:exhaustive` | exit code `0`    | log complet + rapport signe     |
| Verification rapport  | `pnpm gate:verify`     | exit code `0`    | signature valide + commit match |
| Verification pre-push | `pnpm gate:prepush`    | exit code `0`    | push non bloque                 |

Artefacts:

- `.git/gate-reports/<commit_sha>.json`
- `.git/gate-signing.key` (local)
- `playwright-report/`
- `test-results/`
- `coverage/`

## Regle de Decision Go/No-Go

- `GO`:
  - gate complet vert
  - rapport signe valide
  - zero blocage securite/qualite/perf
- `NO-GO`:
  - un seul check rouge suffit
  - correction obligatoire avant merge/release

## Procedure d'Echec

En cas d'echec:

1. Stopper la release.
2. Identifier le premier check rouge.
3. Corriger avec test de non-regression associe.
4. Relancer `pnpm gate:exhaustive`.
5. Revalider `pnpm gate:verify`.

## Checklist Finale

- [ ] `pnpm gate:exhaustive` vert
- [ ] `pnpm gate:verify` vert
- [ ] `pnpm gate:prepush` vert
- [ ] Aucune divergence docs/scripts/config
- [ ] Artefacts de preuve disponibles

## Assumptions et Defaults

- Standard: gate complet a chaque commit critique.
- Les checks de ce runbook sont les checks bloquants officiels.
- Toute divergence doc/config/script est bloquante.
