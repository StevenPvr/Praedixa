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
  - `prettier --write` sur les fichiers stages compatibles
    - `./scripts/gate-precommit-delta.sh` (garde-fous securite)
    - `./scripts/gate-precommit-tests.sh` (pytest complet incluant unit + vitest Next.js + Playwright e2e)
- `commit-msg` execute:
  - `./scripts/check-commit-message.sh`
- `pre-push` execute:
  - `./scripts/gate-prepush-deep.sh`
  - puis `./scripts/verify-gate-report.sh --mode manual --run-if-missing --max-age-seconds 21600`

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
- provisionnement:
  - la cle doit exister avant signature; `gate-report-sign.sh` et `verify-gate-report.sh` refusent desormais de creer une racine HMAC implicite
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

Le `pre-push` profond execute aussi `./scripts/gate-quality-static.sh` avec lint ESLint sans warnings, resynchronise `app-api/.venv` depuis `app-api/uv.lock`, lance `pip-audit` via l'extra `dev` du sous-projet, puis verifie les invariants declares (`python3 scripts/check-security-invariants.py --mode full`) avant la verification du rapport signe.
Le `pre-push` et le gate exhaustif rejouent aussi `pnpm performance:validate-budgets`, pour que les baselines performance versionnees restent effectivement bloquantes au niveau local.
Le scan Trivy secrets du gate profond ignore uniquement les fichiers `.env`, `.env.local` et `.env.*.local` deja exclus par Git, afin de ne pas confondre secrets locaux non versionnes et fuite commitable.
Le gate exhaustif lance CodeQL `security-extended` sur un snapshot source epure des artefacts generes (`.next`, `.open-next`, `coverage`, `playwright-report`) et des depots imbriques hors scope. Les controles de qualite restent portes par ESLint, TypeScript, Ruff, MyPy, Knip, dependency-cruiser, deptry et les builds/tests.
Pour la dette Python historique, le gate exhaustif bloque toute nouvelle violation Xenon ou toute aggravation via `scripts/check-python-complexity-baseline.py`, avec baseline versionnee dans `scripts/python-complexity-baseline.json`. Toute remise a plat de cette baseline doit etre revue comme un reset de reference du socle et accompagnee d'une note de suivi.
Pour la dette TypeScript/Next/Node historique, le gate exhaustif bloque aussi toute nouvelle derive de taille/focalisation via `scripts/check-ts-guardrail-baseline.mjs`, avec baseline versionnee dans `scripts/ts-guardrail-baseline.json`. Meme regle: on ne regenere la baseline qu'apres revue explicite de l'etat structurel a accepter.

Si un outil requis manque, le gate echoue par defaut.

## Limite explicite

Les 0-day inconnues ne sont pas detectables automatiquement.

## Runbook associe

- Rotation secrets : `docs/runbooks/security-secret-rotation.md`
