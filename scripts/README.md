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
./scripts/gate-sensitive-security-tests.sh
./scripts/gate-quality-static.sh
```

`gate-sensitive-security-tests.sh` rejoue les regressions critiques sur l'isolation `site_id`, le durcissement `CONNECTORS_RUNTIME_URL`, les capabilities des service tokens connecteurs et les validations SSRF/OAuth sortantes. Il est execute par `pre-commit` et `pre-push`.
`gate-quality-static.sh` centralise les verifications statiques monorepo: lint ESLint sans warnings (`--max-warnings=0`), typecheck, Ruff et MyPy. Le formatage Prettier est enforce en `pre-commit` sur les fichiers stages.
`check-commit-message.sh` bloque les messages de commit hors Conventional Commits et le hook `commit-msg` fait maintenant partie de l'installation standard `prek`.
`check-python-complexity-baseline.py` compare les violations Xenon actuelles a une baseline versionnee pour bloquer toute nouvelle derive de complexite sans rendre le gate inutilisable a cause de la dette legacy deja connue. Utiliser `--write-current-baseline` uniquement lors d'une remise a plat volontaire et revue.
`run-api-dynamic-audits.sh` demarre l'API TS sur un port libre dedie et en mode `tsx` simple, sans `watch`, pour eviter les collisions avec une API locale deja ouverte pendant les gates.
Le script impose aussi des timeouts explicites sur l'attente de sante, le scan Schemathesis et le smoke `k6`, pour qu'un service degrade ou un client bloque ne puisse pas figer indefiniment les hooks Git.
Le `cleanup` termine maintenant aussi l'arbre de process complet du serveur API de fond apres un court delai si `pnpm exec tsx src/index.ts` ne descend pas tout seul, afin d'eviter les `pre-push` pendus sur un `wait` laisse par des enfants `pnpm` ou `tsx`.
`run-frontend-audits.sh` reutilise explicitement le Chromium Playwright deja valide par les hooks pour `pa11y-ci`, afin d'eviter les echecs implicites de `puppeteer` via `pnpm dlx`.
`scw-release-deploy.sh` doit traiter aussi le dernier service quand `--services` contient un seul item sans retour ligne final, sinon un `--services landing` peut etre ignore silencieusement.

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
- Le `pre-push` doit valider un rapport signe genere en mode `manual`, pas seulement un rapport de la couche profonde intermediaire.
- `verify-gate-report.sh --run-if-missing` doit aussi regenerer un rapport `manual` present mais en echec pour le SHA courant; sinon un ancien rouge reste colle au hook apres correction.
- Le `commit-msg` doit etre installe et versionne dans `prek`; ne pas supposer qu'un ancien hook local suffit encore sur une machine fraiche.
- `run-codeql-local.sh` doit scanner une copie source epuree des artefacts generes (`.next`, `.open-next`, `coverage`, `playwright-report`) et des depots imbriques comme `centaurus/`. Il execute la suite CodeQL `security-extended`; la qualite et l'architecture restent couvertes par les autres gates locaux.
- Les budgets Lighthouse versionnes dans `.lighthouserc.json` doivent rester ambitieux mais mesurables sur un build frais; ne les rebaser qu'apres avoir corrige les goulots evitables et constate la nouvelle baseline optimisee.

## Lire ensuite

- `scripts/lib/README.md`
- `scripts/semgrep/README.md`
