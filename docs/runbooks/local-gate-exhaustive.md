# Gate Local Exhaustif

## Objectif

Garantir qu'un commit/push passe un gate unique, exhaustif et bloquant couvrant:

- securite
- architecture
- qualite et complexite
- tests et e2e critiques
- audits dynamiques API
- performance, accessibilite, schema markup

## Commandes

- lancer le gate complet:
  - `pnpm gate:exhaustive`
- verifier le rapport signe du `HEAD`:
  - `pnpm gate:verify`
- verification pre-push (avec regeneration si necessaire):
  - `pnpm gate:prepush`

## Hooks

- `pre-commit` execute:
  - `./scripts/gate-exhaustive-local.sh --mode pre-commit`
- `pre-push` execute:
  - `./scripts/verify-gate-report.sh --mode pre-push --run-if-missing --max-age-seconds 21600`
  - si rapport absent/stale/dry-run: regeneration automatique via gate complet

Installation hooks:

```bash
./scripts/install-prek.sh
```

## Contrat de rapport signe

- chemin:
  - `.git/gate-reports/<commit_sha>.json`
- cle locale:
  - `.git/gate-signing.key`
- signature:
  - `HMAC-SHA256` sur le JSON non signe
- garde-fou:
  - un rapport `dry_run=true` est rejete par `pre-push`

## Outils requis

Socle:

- `pnpm`, `uv`, `git`, `jq`, `openssl`, `curl`

Securite/qualite/perf:

- `semgrep`
- `checkov`
- `trivy`
- `codeql`
- `osv-scanner`
- `k6`
- `terraform` + `tflint` (si fichiers `.tf`)

Si un outil requis manque, le gate echoue par defaut.

## Configuration

Politique et seuils versionnes dans:

- `scripts/gate.config.yaml`

## Notes

- gate full-monorepo
- zero exception durable
- source d'autorite = scripts + configuration du repo
