# Gate Local Exhaustif

## Objectif

Appliquer un gate sécurité/qualité bloquant avec preuve locale signée.

## Architecture actuelle (3 couches)

- Couche A (pre-commit, bloquante): `./scripts/gate-precommit-blocking.sh`
- Couche B (pre-push, deep): `./scripts/gate-prepush-deep.sh`
- Couche C (exhaustive): `pnpm gate:exhaustive`

## Commandes canoniques

- lancer le gate complet:
  - `pnpm gate:exhaustive`
- verifier le rapport signe du `HEAD`:
  - `pnpm gate:verify`
- verification pre-push (avec regeneration si necessaire):
  - `pnpm gate:prepush`

## Hooks

- `pre-commit` execute:
  - `./scripts/gate-precommit-blocking.sh`
    - `./scripts/gate-precommit-delta.sh` (garde-fous securite)
    - `./scripts/gate-precommit-tests.sh` (pytest complet incluant unit + vitest Next.js + Playwright e2e)
- `pre-push` execute:
  - `./scripts/gate-prepush-deep.sh`
  - puis `./scripts/verify-gate-report.sh --mode pre-push --run-if-missing --max-age-seconds 21600`

Installation hooks:

```bash
./scripts/install-prek.sh
```

## Contrat de rapport signe

- chemin:
  - `.git/gate-reports/<commit_sha>.json`
- schema:
  - `schema_version: "2"`
- cle locale:
  - `.git/gate-signing.key`
- signature:
  - `HMAC-SHA256` sur le JSON non signe
- garde-fou:
  - `dry_run=true` rejete en verification

## Politique de severite

Source:

- `scripts/security-policy.yaml`

Regles:

- `Critical`: blocage immediat
- `High`: blocage immediat
- `Medium`: blocage immediat
- `Low`: non bloquant, tracabilite obligatoire

## Exceptions

Source:

- `scripts/security-exceptions.yaml`

Validation stricte:

```bash
python3 scripts/validate-security-exceptions.py
```

Regles:

- aucune exception silencieuse
- expiration obligatoire et courte
- owner nominatif obligatoire
- reviewer nominatif obligatoire et distinct de l'owner
- evidence obligatoire pour chaque exception active
- exceptions `critical/high/medium` refusees

## Outils requis

Socle:

- `pnpm`, `uv`, `git`, `jq`, `openssl`, `curl`

Securite/qualite/perf:

- `gitleaks`
- `semgrep`
- `checkov`
- `trivy`
- `codeql`
- `osv-scanner`
- `k6`
- `syft`
- `grype`
- `terraform` + `tflint` (si fichiers `.tf`)

Si un outil requis manque, le gate echoue par defaut.

## Limite explicite

Les 0-day inconnues ne sont pas detectables automatiquement.
