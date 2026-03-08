# Scripts

Boite a outils operationnelle du repo.

## Regles generales

- Lancer les scripts depuis la racine du repo, sauf indication contraire.
- Lire rapidement le script avant usage sur prod ou staging: beaucoup sont des hard gates ou des actions de deploiement.
- Les scripts shell supposent souvent `bash`, `pnpm`, `uv` ou des CLIs securite/deploiement installes localement.

## Grandes familles

- Developpement local: `dev-*`, `e2e-free-ports.sh`, `check-playwright-chromium.sh`, `install-prek.sh`
- Gates et securite: `gate-*`, `verify-gate-report.sh`, `audit-ultra-strict-local.sh`, `run-*-audit.sh`, `check-*.py`, `gate.config.yaml`, `security-*.yaml`
- Release et deploiement Scaleway: `scw-*`, `release-manifest-*`, `scw-release-*`, `smoke-test-production.sh`
- Auth / Keycloak: `keycloak-*`
- SQL utilitaire: `freeze_client_schema.sql`, `unfreeze_client_schema.sql`, `verify_*sql`
- Data / generation de donnees: `build_data_sante_simulation_dataset.py`, `fetch_data_sante_nhs_history.py`, `generate_fake_data_files.py`
- Documentation distribuee: `generate-directory-readmes.mjs`
- Bibliotheques locales: `lib/`
- Regles Semgrep maison: `semgrep/`

## Workflows frequents

Developpement local:

```bash
pnpm dev:api
pnpm dev:webapp
pnpm dev:admin
pnpm dev:landing
```

Gates:

```bash
pnpm pre-commit
pnpm gate:prepush
pnpm gate:exhaustive
pnpm gate:verify
```

Release:

```bash
pnpm release:build
pnpm release:manifest:create
pnpm release:deploy
pnpm release:promote
```

## Conventions

- Si un script encode une politique de securite ou de release, garder la doc et les validations associees a jour dans le meme changement.
- Les helpers reutilisables vont dans `scripts/lib/`, pas dans des copies collees.
- Les regles Semgrep maison et les exceptions securite sont versionnees ici pour rendre les gates auditables.

## Lire ensuite

- `scripts/lib/README.md`
- `scripts/semgrep/README.md`
