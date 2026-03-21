# Scripts

Boite a outils operationnelle du repo.

## Regles generales

- Lancer les scripts depuis la racine du repo, sauf indication contraire.
- Lire rapidement le script avant usage sur prod ou staging: beaucoup sont des hard gates ou des actions de deploiement.
- Les scripts shell supposent souvent `bash`, `pnpm`, `uv` ou des CLIs securite/deploiement installes localement.

## Grandes familles

- Developpement local: `dev-*`, `e2e-free-ports.sh`, `check-playwright-chromium.sh`, `install-prek.sh`
- Gates et securite: `gate-*`, `verify-gate-report.sh`, `audit-ultra-strict-local.sh`, `run-*-audit.sh`, `check-*.py`, `gate.config.yaml`, `security-*.yaml`
- Release et deploiement Scaleway: `scw-*`, `release-manifest-*`, `scw-release-*`, `smoke-test-production.sh`, `scw-post-deploy-smoke.sh`
- Auth / Keycloak: `keycloak-*`
- Camunda local: `camunda-dev.sh`
- SQL utilitaire: `freeze_client_schema.sql`, `unfreeze_client_schema.sql`, `verify_*sql`
- Data / generation de donnees: `build_data_sante_simulation_dataset.py`, `fetch_data_sante_nhs_history.py`, `generate_fake_data_files.py`
- Documentation distribuee: `generate-directory-readmes.mjs`
- Bibliotheques locales: `lib/`
- Regles Semgrep maison: `semgrep/`

## Workflows frequents

Developpement local:

```bash
pnpm dev:symphony
pnpm dev:api
pnpm dev:webapp
pnpm dev:admin
pnpm dev:landing
```

`pnpm dev:api` passe maintenant par `scripts/dev-api-run.sh`, qui recharge automatiquement `DATABASE_URL` depuis `app-api-ts/.env.local`, `app-api/.env.local`, `app-api/.env`, puis `.env.local` a la racine quand la variable n'est pas deja exportee dans le shell. Le meme wrapper recharge aussi `KEYCLOAK_ADMIN_USERNAME` (ou le force a `kcadmin` par defaut) et `KEYCLOAK_ADMIN_PASSWORD` / `KC_BOOTSTRAP_ADMIN_PASSWORD` depuis les env locaux standards, afin que les flux admin de provisionnement identite ne tombent pas en fail-close des le demarrage local.
`pnpm dev:api` et `pnpm dev:admin` restent maintenant attaches au terminal local pour que les logs runtime soient visibles en direct pendant le debug. Les variantes explicites `pnpm dev:api:bg` et `pnpm dev:admin:bg` conservent le comportement background avec PID + fichiers `.tools/dev-logs/*.log`.
Les scripts `dev-*-start|stop|status` verifient maintenant aussi l'ecoute reelle du port cible et terminent l'arbre complet `pnpm -> tsx/next`, pour eviter les faux positifs "running" avec un watcher mort ou un upstream absent.
`pnpm dev:symphony` lance le runtime d'automation agentique interne `app-symphony`. Il lit `WORKFLOW.md`, poll Linear, cree un workspace isole par issue et pilote `codex app-server` dans ce workspace.
Le runtime Symphony recharge automatiquement `app-symphony/.env.local`, puis `app-symphony/.env`, puis `.env.local` a la racine. Preferer `app-symphony/.env.local` pour les secrets locaux; `app-symphony/.env` ne doit rester qu'un fallback local non versionne.

Auth / Keycloak:

```bash
pnpm auth:keycloak:ensure-api-contract

KEYCLOAK_SMTP_FROM='hello@praedixa.com' \
KEYCLOAK_SMTP_FROM_DISPLAY_NAME='Praedixa' \
./scripts/keycloak-ensure-email-config.sh

./scripts/keycloak-ensure-email-theme.sh

SUPER_ADMIN_PASSWORD='<mot-de-passe-super-admin>' \
./scripts/keycloak-ensure-super-admin.sh
```

`keycloak-ensure-api-access-contract.sh` recale maintenant les protocol mappers live sur le realm export versionne (`claim-role`, `claim-organization-id`, `claim-site-id`, `claim-permissions` admin, `claim-amr` admin) pour eviter les drifts entre Keycloak et les callbacks Next stricts.
`keycloak-ensure-email-config.sh` recale maintenant la configuration email du realm (`smtpServer.from`, `fromDisplayName`, plus le bloc SMTP complet, y compris le secret) via l'admin REST Keycloak pour que `execute-actions-email` ne tombe ni en `Invalid sender address 'null'` ni en sender SMTP incomplet.
`keycloak-ensure-email-theme.sh` recale maintenant le `emailTheme` du realm sur le theme `praedixa`, qui rend l'email client `Update Password` plus clair que le wording Keycloak par defaut grace aux templates `html/` et `text/` versionnes sous `infra/auth/themes/praedixa/email/`.
Si un utilisateur cible est fourni, le script synchronise aussi ses attributs canoniques `role`, `organization_id`, `site_id` et, si besoin, `permissions`.
`keycloak-ensure-super-admin.sh` provisionne aussi les attributs canoniques `role=super_admin` et, par defaut, toute la taxonomie `contracts/admin/permission-taxonomy.v1.json`, en plus du realm role et de `CONFIGURE_TOTP`.
Ces scripts relisent automatiquement `KEYCLOAK_ADMIN_PASSWORD` ou `KC_BOOTSTRAP_ADMIN_PASSWORD` depuis `app-api-ts/.env.local`, `app-api/.env.local`, `app-api/.env`, `app-landing/.env.local`, `app-webapp/.env.local`, `app-admin/.env.local`, puis `.env.local` a la racine si la variable n'est pas deja exportee dans le shell. Si `KEYCLOAK_ADMIN_USERNAME` n'est pas fourni par l'environnement local, le helper shell commun retombe explicitement sur `kcadmin`.
Les scripts de reconciliation email utilisent maintenant un fichier `kcadm --config` isole par execution pour eviter les locks et collisions de session sur `~/.keycloak/kcadm.config`.
`scw-configure-auth-env.sh` sait maintenant aussi cabler un realm SMTP Resend de facon concrete: par defaut `smtp.resend.com:587`, `user=resend`, `from=hello@praedixa.com`, `starttls=true`, `ssl=false`, avec fallback sur `RESEND_API_KEY`, `RESEND_FROM_EMAIL` et `RESEND_REPLY_TO_EMAIL` quand ces valeurs existent deja dans les `.env.local`. Le script pousse ces valeurs dans la config du container `auth-prod`, puis reconcile le realm live via `keycloak-ensure-email-config.sh` et `keycloak-ensure-email-theme.sh`.
Le runtime `app-api-ts` utilise maintenant `KEYCLOAK_ADMIN_USERNAME` + `KEYCLOAK_ADMIN_PASSWORD` pour provisionner depuis le backoffice les comptes client dans Keycloak avant d'ecrire `users.auth_user_id`; `scw-configure-api-env.sh` doit donc aussi synchroniser cette creden­tial runtime.

Camunda local:

```bash
pnpm camunda:download
pnpm camunda:up
pnpm camunda:status
pnpm test:camunda:onboarding
pnpm camunda:logs
pnpm camunda:down
```

`camunda-dev.sh` telecharge l'artefact officiel `docker-compose-<version>.zip` depuis `camunda/camunda-distributions`, l'extrait dans `.tools/camunda/`, puis pilote le stack lightweight par defaut ou le stack full avec `--full`. Le lightweight expose `http://127.0.0.1:8088/v2` sans auth API par defaut; le full reste en OAuth via Keycloak local.
`pnpm test:camunda:onboarding` est la verification canonique de cette pile locale: il cree une organisation ephemere, demarre un `onboarding_case` via Camunda, synchronise la projection SQL et complete la premiere user task.

Gates:

```bash
pnpm pre-commit
pnpm gate:architecture
pnpm gate:architecture:frontend
pnpm gate:architecture:api
pnpm architecture:ts-guardrails
pnpm gate:prepush
pnpm gate:exhaustive
pnpm gate:verify
pnpm performance:validate-budgets
./scripts/gate-sensitive-security-tests.sh
./scripts/gate-quality-static.sh
```

`gate:architecture:frontend` rejoue `dependency-cruiser` sur `app-landing`, `app-webapp`, `app-admin` et `packages/`, puis `knip` et `architecture:ts-guardrails` pour rendre les dependances front/shared et la focalisation des fichiers auditables en local comme en CI.
`gate:architecture:api` applique un graphe de dependances dedie aux runtimes `app-api-ts` et `app-connectors`, puis le meme baseline guard `architecture:ts-guardrails`, afin d'interdire les imports directs vers les frontends, les couplages runtime <-> runtime non voulus et toute nouvelle derive de taille sur le socle TS.
`architecture:ts-guardrails` compare la taille des fichiers et fonctions TS/JS a une baseline versionnee dans `scripts/ts-guardrail-baseline.json`; il bloque uniquement les nouvelles violations ou les regressions, pas la dette historique deja capturee.
`architecture:repo` agrège les deux graphes TypeScript versionnes, `knip` et le baseline guard de taille; les configs `dependency-cruiser` et `knip` excluent aussi les depots imbriques comme `skolae/` et les artefacts `.open-next/` pour garder un perimetre de scan stable.
`gate-exhaustive-local.sh` produit un rapport signe pour tous les checks du socle, mais ne bloque le `pre-push` que sur les eches `critical` / `high` / `medium`; les eches `low` restent visibles dans le rapport (`low_failed_checks`) et sortent en `PASS with warnings` pour eviter qu'un warning local non bloquant ne casse la chaine de livraison.
`gate-sensitive-security-tests.sh` rejoue les regressions critiques sur l'isolation `site_id`, le durcissement `CONNECTORS_RUNTIME_URL`, les capabilities des service tokens connecteurs et les validations SSRF/OAuth sortantes. Il est execute par `pre-commit` et `pre-push`.
`gate-quality-static.sh` centralise les verifications statiques monorepo: lint ESLint sans warnings (`--max-warnings=0`), typecheck, Ruff et MyPy. Le formatage Prettier est enforce en `pre-commit` sur les fichiers stages.
`check-alembic-heads.sh` bloque les branches Python qui introduisent plusieurs heads Alembic; il est execute par le gate local exhaustif et par la CI API.
`check-commit-message.sh` bloque les messages de commit hors Conventional Commits et le hook `commit-msg` fait maintenant partie de l'installation standard `prek`.
`check-python-complexity-baseline.py` compare les violations Xenon actuelles a une baseline versionnee pour bloquer toute nouvelle derive de complexite sans rendre le gate inutilisable a cause de la dette legacy deja connue. Utiliser `--write-current-baseline` uniquement lors d'une remise a plat volontaire, revue et accompagnee d'une mise a jour de la doc/runbook pour garder la dette structurelle tracee.
`check-ts-guardrail-baseline.mjs` joue le meme role cote TypeScript/Next/Node pour les fichiers source du socle: limite cible `500` lignes par fichier et `50` lignes par fonction, baseline versionnee, echec uniquement sur nouvelle dette ou aggravation. Le premier `--include-root <path>` remplace la liste racine par defaut, les suivants l'etendent explicitement, et `--root` / `--baseline` restent independants de l'ordre des flags. Toute regeneration de baseline doit etre traitee comme une decision d'architecture explicite, pas comme un contournement opportuniste.
`run-api-dynamic-audits.sh` demarre l'API TS sur un port libre dedie et en mode `tsx` simple, sans `watch`, pour eviter les collisions avec une API locale deja ouverte pendant les gates. Le script vide explicitement `DATABASE_URL` pour auditer le profil stateless/fail-close de l'API publique au lieu d'heriter d'une base locale partiellement configuree.
Le scan Schemathesis du gate passe par `scripts/ci-python-tool.sh schemathesis` pour pinner la version de l'outil, tourne en mode positif et deterministe sur le profil public stateless, active `--continue-on-failure` pour separer les warnings schema/auth attendus des vraies regressions bloquantes, et ecrit un rapport NDJSON dans `.git/gate-reports/artifacts/schemathesis/` afin de rendre chaque echec ou warning reproductible apres coup.
`gate-prepush-deep.sh` resynchronise d'abord `app-api/.venv` avec `uv sync --all-groups --locked`, puis lance `pip-audit` via `uv run --extra dev`, pour auditer le graphe verrouille du sous-projet sans dependre d'un environnement local stale ni perdre l'outil declare dans l'extra `dev`.
Les gates `gate:prepush` et `gate:exhaustive` rejouent aussi `pnpm performance:validate-budgets`, afin de bloquer tout drift entre les budgets performance documentes et leurs baselines JSON versionnees.
Les fuzzings negatifs complets sur endpoints authentifies ne doivent pas etre greffes dans ce hook sans harness d'auth et de persistance dedie; sinon on bloque le push sur des requetes volontairement invalides qui n'exercent pas le contrat applicatif cible.
Le script impose aussi des timeouts explicites sur l'attente de sante, le scan Schemathesis et le smoke `k6`, pour qu'un service degrade ou un client bloque ne puisse pas figer indefiniment les hooks Git.
Le `cleanup` termine maintenant aussi l'arbre de process complet du serveur API de fond apres un court delai si `pnpm exec tsx src/index.ts` ne descend pas tout seul, afin d'eviter les `pre-push` pendus sur un `wait` laisse par des enfants `pnpm` ou `tsx`.
`run-frontend-audits.sh` reutilise explicitement le Chromium Playwright deja valide par les hooks pour `pa11y-ci`, et demarre les frontends via leurs serveurs standalone `node .next/standalone/<app>/server.js` plutot que `pnpm ... next start`, avec logs absolus, `exec` direct, capture de PID dans le shell courant, et cleanup non reentrant pour que le gate n'attende pas indefiniment des shells zombies ou des wrappers.
`audit-ultra-strict-local.sh` ignore maintenant uniquement les fichiers `.env`, `.env.local` et `.env.*.local` deja exclus par Git, afin de continuer a bloquer les secrets commitables tout en laissant vivre les secrets locaux non versionnes necessaires aux runtimes de dev.
`scw-release-deploy.sh` doit traiter aussi le dernier service quand `--services` contient un seul item sans retour ligne final, sinon un `--services landing` peut etre ignore silencieusement.
`scw-release-manifest-create.sh` exige maintenant un `--gate-report` reel et versionne son `path + sha256` dans le manifest signe; une release sans preuve de gate signee et reverifiable ne doit plus etre materialisee.
`gate-report-sign.sh`, `verify-gate-report.sh`, `release-manifest-sign.sh` et `release-manifest-verify.sh` exigent une cle HMAC deja provisionnee sur disque; ils ne doivent jamais generer une nouvelle racine de confiance a chaud ni passer la cle en argument CLI.
`scw-release-deploy.sh` doit utiliser la reference signee `registry-image@sha256:...` du manifest comme source de verite; si l'API Scaleway Container refuse encore cette syntaxe, le script peut seulement retomber sur le tag deja signe derive de cette meme reference et doit journaliser explicitement ce fallback fournisseur.
Les scripts `scw-configure-*.sh` doivent passer les variables d'environnement et secrets via des fichiers JSON temporaires et `scw-apply-container-config.sh`, pas via des arguments CLI contenant les secrets en clair.
Les scripts `scw-configure-landing-env.sh`, `scw-configure-frontend-env.sh`, `scw-configure-api-env.sh` et `scw-configure-auth-env.sh` doivent aussi synchroniser leurs secrets vers Scaleway Secret Manager sous `/praedixa/<env>/<container>/runtime` avant application au container.
Le profil landing inclut maintenant aussi `LANDING_ASSET_SIGNING_SECRET`; un deploy landing sans ce secret reouvre immediatement un chemin de telechargement a URL stable et doit rester bloque au preflight.
`validate-runtime-secret-inventory.mjs` verifie que `docs/deployment/runtime-secrets-inventory.json` reste aligne avec `docs/deployment/environment-secrets-owners-matrix.md`; `scw-preflight-deploy.sh` execute ce validateur avant tout controle cloud et lit ensuite depuis cet inventaire les secrets runtime `preflight_required` a imposer sur chaque container.
Les preflights `scw-preflight-staging.sh` et `scw-preflight-deploy.sh` sont maintenant alimentes par l'inventaire versionne des secrets runtime; pour les frontends, cela impose `AUTH_SESSION_SECRET`, `AUTH_RATE_LIMIT_KEY_SALT` et au moins une cle de store distribue (`AUTH_RATE_LIMIT_REDIS_URL` ou `RATE_LIMIT_STORAGE_URI`) sans warning de degradation locale. Le wrapper `pnpm run scw:preflight:staging` delegue maintenant au chemin strict `./scripts/scw-preflight-deploy.sh staging`.
`scw-configure-frontend-env.sh` exige maintenant une origine publique explicite pour `webapp` et `admin`: `AUTH_APP_ORIGIN` doit correspondre exactement au host canonique versionne pour la surface cible, et `NEXT_PUBLIC_APP_ORIGIN` reste un miroir strict de cette meme origin quand il est expose.
`scw-preflight-deploy.sh` reverifie cette parite frontend a partir de `docs/deployment/runtime-secrets-inventory.json`; tout changement de host public frontend doit donc mettre a jour le script de config, l'inventaire machine-readable et la matrice humaine dans le meme diff.
Le chemin normal de release build-ready passe par `release:build`, `release:manifest:create`, `release:deploy` et `release:promote`; les wrappers `scw:deploy:*` directs ne sont pas la reference pour une release evidencable.
`scw-release-manifest-create.sh` sait maintenant embarquer une preuve machine-readable de backup/restore via `--database-impact`, `--backup-evidence <summary.json>` et `--restore-evidence <summary.json>`; `release-manifest-verify.sh` reverifie ensuite la presence, le digest et le schema type de ces summaries avant promotion.
`run-supply-chain-audit.sh` ecrit aussi `supply-chain-evidence.json` a cote du SBOM et du scan `grype`; ce summary machine-readable versionne les digests des artefacts produits, mais ne constitue pas a lui seul une attestation de provenance signee.
`scw-release-manifest-create.sh --supply-chain-evidence <summary.json>` peut rattacher cette preuve au manifest signe.
`release-manifest-verify.sh` reverifie alors le digest du gate report reference, puis celui du summary supply-chain et enfin celui des artefacts imbriques (`sbom.cdx.json`, `grype-findings.json`) avant promotion.
`scw-post-deploy-smoke.sh` est le smoke CLI canonique apres deploy ou rollback pour `api`, `webapp`, `admin`, `auth`, `connectors` et, si l'URL est explicite, `landing`.
`scw-rollback-plan.sh` calcule un rollback reproductible a partir d'un manifest courant et d'un manifest precedent signe, ou en selectionnant automatiquement le dernier manifest sain dans un repertoire versionne.
`scw-rollback-execute.sh` rejoue ensuite ce plan via `scw-release-deploy.sh`, avec `--dry-run` pour produire la commande exacte sans toucher a Scaleway et `--run-smoke` pour enchainer sur le smoke canonique.
`scw-rollback-selftest.sh` construit des manifests signes ephemeres et verifie localement le chemin `plan -> execute --dry-run`, y compris le cas `connectors` avec override de target.
`validate-synthetic-monitoring-baseline.mjs` verifie la source machine-readable `docs/runbooks/synthetic-monitoring-baseline.json`; elle doit rester alignee avec les runbooks d'observabilite, de smoke et de release.
`validate-control-plane-restore-evidence.mjs` valide `docs/security/control-plane-metadata-inventory.json` et les summaries backup/restore attendus par les manifests signes.
`scw-rdb-backup-evidence.sh` standardise la collecte JSON de preuve backup pour une instance RDB, avec `summary_type`, `schema_version`, `inventory_version` et checks machine-readables.
`scw-rdb-restore-drill.sh` standardise un restore drill RDB borne, mesure le `RTO`, exige les checks semantiques de control plane versionnes et echoue si la base restauree n'apparait pas ou si un check requis reste non valide.
`smoke-test-production.sh` doit rester aligne sur les routes runtime versionnees (`/api/v1/live/*`), pas sur d'anciens aliases de dashboard.

Release:

```bash
pnpm release:build
./scripts/run-supply-chain-audit.sh
pnpm release:manifest:create
pnpm release:deploy
pnpm release:promote
./scripts/scw-post-deploy-smoke.sh --env staging --services api,webapp,admin,auth
./scripts/validate-synthetic-monitoring-baseline.mjs
```

Pour une release candidate evidencable, ajouter `--supply-chain-evidence .git/gate-reports/artifacts/supply-chain-evidence.json` au manifest signe.

Prospects one-pagers proteges:

```bash
pnpm run scw:bootstrap:centaurus
pnpm run scw:configure:centaurus
pnpm run scw:deploy:centaurus

pnpm run scw:bootstrap:greekia
pnpm run scw:configure:greekia
pnpm run scw:deploy:greekia

pnpm run scw:bootstrap:skolae
pnpm run scw:configure:skolae
pnpm run scw:deploy:skolae
```

Les bootstraps `scw-bootstrap-centaurus.sh`, `scw-bootstrap-greekia.sh` et `scw-bootstrap-skolae.sh` pilotent le bind domaine + DNS de facon explicite:

- mode `SCW_BOOTSTRAP_DNS_MODE=scaleway-managed`: le script cree/met a jour le CNAME dans la zone Scaleway, puis verifie le binding container, le record Scaleway et la resolution publique effective
- mode `SCW_BOOTSTRAP_DNS_MODE=external-verified`: le script n'ecrit pas le DNS, mais exige que le CNAME public existe deja et pointe vers la cible attendue avant de reussir
- mode `SCW_BOOTSTRAP_DNS_MODE=external-pending`: le script cree le binding container, affiche la cible CNAME attendue et laisse explicitement la pose du record au provider DNS externe
- les fenetres d'attente sont pilotables par `SCW_BOOTSTRAP_VERIFY_ATTEMPTS` et `SCW_BOOTSTRAP_VERIFY_SLEEP_SECONDS`

## Conventions

- Si un script encode une politique de securite ou de release, garder la doc et les validations associees a jour dans le meme changement.
- Les helpers reutilisables vont dans `scripts/lib/`, pas dans des copies collees.
- Les regles Semgrep maison et les exceptions securite sont versionnees ici pour rendre les gates auditables.
- Le `pre-push` doit valider un rapport signe genere en mode `manual`, pas seulement un rapport de la couche profonde intermediaire.
- `verify-gate-report.sh --run-if-missing` doit aussi regenerer un rapport `manual` present mais en echec pour le SHA courant; sinon un ancien rouge reste colle au hook apres correction.
- Le `commit-msg` doit etre installe et versionne dans `prek`; ne pas supposer qu'un ancien hook local suffit encore sur une machine fraiche.
- `run-codeql-local.sh` doit scanner une copie source epuree des artefacts generes (`.next`, `.open-next`, `coverage`, `playwright-report`) et des depots imbriques comme `centaurus/`. Il execute la suite CodeQL `security-extended`; la qualite et l'architecture restent couvertes par les autres gates locaux.
- Les budgets Lighthouse versionnes dans `.lighthouserc.json` doivent rester ambitieux mais mesurables sur un build frais; ne les rebaser qu'apres avoir corrige les goulots evitables et constate la nouvelle baseline optimisee.
- Un bootstrap Scaleway qui depend d'un DNS externe doit declarer explicitement son mode de verification et echouer tant que le record public attendu n'est pas observable; aucun warning de completion manuelle differee n'est acceptable.

## Lire ensuite

- `scripts/lib/README.md`
- `scripts/semgrep/README.md`
