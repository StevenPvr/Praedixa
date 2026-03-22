# Scripts

Boite a outils operationnelle du repo.

## Regles generales

- Lancer les scripts depuis la racine du repo, sauf indication contraire.
- Lire rapidement le script avant usage sur prod ou staging: beaucoup sont des hard gates ou des actions de deploiement.
- Les scripts shell supposent souvent `bash`, `pnpm`, `uv` ou des CLIs securite/deploiement installes localement.

## Grandes familles

- Developpement local: `dev-*`, `e2e-free-ports.sh`, `check-playwright-chromium.sh`, `install-prek.sh`
- Gates et securite: `gate-*`, `verify-gate-report.sh`, `audit-ultra-strict-local.sh`, `run-*-audit.sh`, `check-*.py`, `check-*.mjs`, `gate.config.yaml`, `security-*.yaml`, `ci/install-authoritative-toolchain.sh`, `ci/run-authoritative-ci.sh`
- Garde-fous workspaces: `workspaces/*`, `check-workspace-scripts.mjs`
- Contrats runtime generes: `runtime-env-inventory.mjs`, `validate-runtime-env-inventory.mjs`, `runtime-env-contracts.mjs`, `generate-runtime-env-contracts.mjs`, `validate-runtime-env-contracts.mjs`
- Validation documentaire machine-readable: `validate-*.mjs`, `validate-*.py`
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
pnpm dev:auth
pnpm dev:api
pnpm dev:webapp
pnpm dev:admin
pnpm dev:landing
```

`pnpm dev:api` passe maintenant par `scripts/dev/dev-api-run.sh`, qui recharge automatiquement `DATABASE_URL` depuis `app-api-ts/.env.local`, `app-api/.env.local`, `app-api/.env`, puis `.env.local` a la racine quand la variable n'est pas deja exportee dans le shell. Le meme wrapper recharge aussi `KEYCLOAK_ADMIN_USERNAME` (ou le force a `kcadmin` par defaut), `KEYCLOAK_ADMIN_PASSWORD` / `KC_BOOTSTRAP_ADMIN_PASSWORD`, ainsi que `RESEND_WEBHOOK_SECRET` pour le chemin local de preuve de delivery provider-side, puis recale toujours `AUTH_ISSUER_URL` / `AUTH_JWKS_URL` / `AUTH_AUDIENCE` sur le contrat auth local actif du repo: `app-api-ts/.env.local` et `app-api/.env.local` restent prioritaires, puis `app-admin/.env.local` / `app-webapp/.env.local`, et l'ancien `app-api/.env` ne sert plus qu'en fallback de dernier rang pour qu'une config live stale ne fasse plus rejeter les JWT du Keycloak local.
Si aucun `RESEND_WEBHOOK_SECRET` n'est defini localement, `dev:api` force maintenant un secret de demo explicite au format `whsec_...` pour que le parcours de preuve de livraison reste montrable apres un restart.
`pnpm dev:api` recharge maintenant aussi un `CONNECTORS_RUNTIME_TOKEN` local stable et derive un `CONNECTORS_SERVICE_TOKENS` control-plane local si rien n'est fourni explicitement. Quand `CONNECTORS_RUNTIME_URL` ou `CAMUNDA_BASE_URL` restent loopback, le wrapper demarre aussi `pnpm dev:connectors:bg` et `pnpm camunda:up` avant de lancer l'API afin que le workspace onboarding ne tombe plus en `500` juste parce que ses dependances locales ne sont pas encore montées.
`pnpm dev:auth` passe maintenant par `scripts/dev/dev-auth-run.sh`, qui recharge `KEYCLOAK_ADMIN_USERNAME` / `KEYCLOAK_ADMIN_PASSWORD` depuis les `.env.local` standards, derive aussi le runtime SMTP local depuis `RESEND_*` quand ces variables existent, exporte `KC_BOOTSTRAP_ADMIN_*` pour le container local et provisionne par defaut `admin@praedixa.com` avec ce meme secret sur le realm local importe. Le service Docker `auth` force aussi `KC_CACHE=local` en dev pour demarrer en mono-noeud stable; sans cela, le Keycloak local peut perdre ~20 secondes a tenter de rejoindre un ancien noeud fantome avant de rendre la discovery OIDC, ce qui recree des `fetch failed` cote admin au premier reboot.
`pnpm dev:admin` passe maintenant par `scripts/dev/dev-admin-run.sh`, qui verifie `app-admin/.env.local` et, si `AUTH_OIDC_ISSUER_URL` ou `NEXT_PUBLIC_API_URL` pointent vers `localhost`, demarre automatiquement `dev:auth:bg` et `dev:api:bg` quand ces dependances ne repondent pas encore. L'admin local ne retombe donc plus sur `oidc_provider_untrusted` ou sur un dashboard en `502` juste parce qu'il a ete relance avant l'auth/API.
`pnpm dev:api`, `pnpm dev:auth` et `pnpm dev:admin` restent maintenant attaches au terminal local pour que les logs runtime soient visibles en direct pendant le debug. Les variantes explicites `pnpm dev:api:bg`, `pnpm dev:auth:bg` et `pnpm dev:admin:bg` conservent le comportement background. Pour l'API, `dev:api:bg` lance maintenant `tsx src/index.ts` sans watcher, car `tsx watch` sous `nohup` tombait silencieusement et donnait un faux "running"; le mode watch reste reserve a `pnpm dev:api` attache au terminal. Pour `auth`, les logs passent ensuite par `pnpm dev:auth:logs` (Docker compose) plutot que par un fichier PID local.
`pnpm dev:connectors` suit maintenant le meme modele: mode attache par defaut, avec `pnpm dev:connectors:bg`, `pnpm dev:connectors:status`, `pnpm dev:connectors:stop` et `pnpm dev:connectors:logs` pour les scenarios de bootstrap local automatises.
Les scripts `dev-*-start|stop|status` verifient maintenant aussi l'ecoute reelle du port cible et terminent l'arbre complet `pnpm -> tsx/next`, pour eviter les faux positifs "running" avec un watcher mort ou un upstream absent.
`pnpm dev:api:simulate-delivery -- --email <invitee@exemple.com> [--event email.delivered]` pousse un webhook Resend signe contre l'API locale afin de faire apparaitre une vraie preuve mail dans l'admin sans dependre d'un provider externe pendant une demo.
`pnpm dev:symphony` lance le runtime d'automation agentique interne `app-symphony`. Il lit `WORKFLOW.md`, poll Linear, cree un workspace isole par issue et pilote `codex app-server` dans ce workspace.
Le runtime Symphony recharge automatiquement `app-symphony/.env.local`, puis `app-symphony/.env`, puis `.env.local` a la racine. Preferer `app-symphony/.env.local` pour les secrets locaux; `app-symphony/.env` ne doit rester qu'un fallback local non versionne.

Auth / Keycloak:

```bash
pnpm auth:keycloak:ensure-api-contract

KEYCLOAK_SMTP_FROM='hello@praedixa.com' \
KEYCLOAK_SMTP_FROM_DISPLAY_NAME='Praedixa' \
./scripts/keycloak/keycloak-ensure-email-config.sh

./scripts/keycloak/keycloak-ensure-email-theme.sh

SUPER_ADMIN_PASSWORD='<mot-de-passe-super-admin>' \
./scripts/keycloak/keycloak-ensure-super-admin.sh

./scripts/keycloak/keycloak-ensure-user-invite-required-actions.sh
```

`keycloak-ensure-api-access-contract.sh` recale maintenant les protocol mappers live sur le realm export versionne (`claim-role`, `claim-organization-id`, `claim-site-id`, `claim-permissions` admin, `claim-amr` admin) pour eviter les drifts entre Keycloak et les callbacks Next stricts.
`keycloak-ensure-email-config.sh` recale maintenant la configuration email du realm (`smtpServer.from`, `fromDisplayName`, plus le bloc SMTP complet, y compris le secret) via l'admin REST Keycloak pour que `execute-actions-email` ne tombe ni en `Invalid sender address 'null'` ni en sender SMTP incomplet. Il recharge aussi `RESEND_API_KEY` depuis les `.env.local` standards et pousse les defaults Resend (`smtp.resend.com:587`, `user=resend`, `starttls=true`, `ssl=false`) quand aucune surcharge explicite n'est fournie.
`keycloak-ensure-email-theme.sh` recale maintenant le `emailTheme` du realm sur le theme `praedixa`, qui rend l'email client `Update Password` plus clair que le wording Keycloak par defaut grace aux templates `html/` et `text/` versionnes sous `infra/auth/themes/praedixa/email/`.
`keycloak-ensure-user-invite-required-actions.sh` enregistre et active explicitement `UPDATE_PASSWORD` sur le realm si l'import Keycloak a oublie ce provider; sans cette required action, les invitations client peuvent afficher un faux succes `Account updated` au clic au lieu d'ouvrir la creation de mot de passe.
Si un utilisateur cible est fourni, le script synchronise aussi ses attributs canoniques `role`, `organization_id`, `site_id` et, si besoin, `permissions`.
`keycloak-ensure-super-admin.sh` provisionne aussi les attributs canoniques `role=super_admin` et, par defaut, toute la taxonomie `contracts/admin/permission-taxonomy.v1.json` resolue depuis la racine du repo, en plus du realm role et de `CONFIGURE_TOTP`.
Ces scripts relisent automatiquement `KEYCLOAK_ADMIN_PASSWORD` ou `KC_BOOTSTRAP_ADMIN_PASSWORD` depuis `app-api-ts/.env.local`, `app-api/.env.local`, `app-api/.env`, `app-landing/.env.local`, `app-webapp/.env.local`, `app-admin/.env.local`, puis `.env.local` a la racine si la variable n'est pas deja exportee dans le shell. Si `KEYCLOAK_ADMIN_USERNAME` n'est pas fourni par l'environnement local, le helper shell commun retombe explicitement sur `kcadmin`.
Les scripts de reconciliation email utilisent maintenant un fichier `kcadm --config` isole par execution pour eviter les locks et collisions de session sur `~/.keycloak/kcadm.config`.
Le wrapper `scripts/keycloak/kcadm` doit resoudre le binaire depuis la racine du repo (`.meta/.tools/...`) et non depuis `scripts/.meta/...`, sinon les operations IAM locales semblent cassees alors que l'outil est bien present.
`scw-configure-auth-env.sh` sait maintenant aussi cabler un realm SMTP Resend de facon concrete: par defaut `smtp.resend.com:587`, `user=resend`, `from=hello@praedixa.com`, `starttls=true`, `ssl=false`, avec fallback sur `RESEND_API_KEY`, `RESEND_FROM_EMAIL` et `RESEND_REPLY_TO_EMAIL` quand ces valeurs existent deja dans les `.env.local`. Le script pousse ces valeurs dans la config du container `auth-prod`, attache aussi explicitement le `PRIVATE_NETWORK_ID` requis pour la DB, puis reconcile le realm live via `keycloak-ensure-email-config.sh`, `keycloak-ensure-email-theme.sh` et `keycloak-ensure-user-invite-required-actions.sh`.
Si `SUPER_ADMIN_PASSWORD` est fourni explicitement au shell, `scw-configure-auth-env.sh` reapplique aussi `keycloak-ensure-super-admin.sh` dans le meme passage pour qu'un realm reimporte ne reste pas avec `0` utilisateur bootstrap admin.
`scw-configure-auth-env.sh` pousse maintenant aussi explicitement `command=/opt/keycloak/bin/kc.sh` et les args `start --optimized --import-realm --http-port=8080` via `scw-apply-container-config.sh`, et le preflight `auth-prod` les verifie pour eviter qu'un redeploy perde l'import durable du realm.
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

`camunda-dev.sh` telecharge l'artefact officiel `docker-compose-<version>.zip` depuis `camunda/camunda-distributions`, l'extrait dans `.meta/.tools/camunda/`, puis pilote le stack lightweight par defaut ou le stack full avec `--full`. Le lightweight expose `http://127.0.0.1:8088/v2` sans auth API par defaut; le full reste en OAuth via Keycloak local.
`pnpm test:camunda:onboarding` est la verification canonique de cette pile locale: il cree une organisation ephemere, demarre un `onboarding_case` via Camunda, synchronise la projection SQL et complete la premiere user task.

Gates:

```bash
pnpm pre-commit
pnpm gate:architecture
pnpm gate:architecture:frontend
pnpm gate:architecture:api
pnpm docs:validate:database
pnpm docs:validate:cto
pnpm docs:validate:schema-parity
pnpm docs:validate:contracts-parity
pnpm docs:generate:erd
pnpm architecture:ts-guardrails
pnpm gate:prepush
pnpm gate:exhaustive
pnpm gate:verify
pnpm performance:validate-budgets
./scripts/gates/gate-sensitive-security-tests.sh
./scripts/gates/gate-quality-static.sh
node ./scripts/check-workspace-scripts.mjs --task build --task lint --task typecheck
node ./scripts/check-workspace-scripts.mjs --task test --scope critical-test
```

`gate:architecture:frontend` rejoue `dependency-cruiser` sur `app-landing`, `app-webapp`, `app-admin` et `packages/`, puis `knip` et `architecture:ts-guardrails` pour rendre les dependances front/shared et la focalisation des fichiers auditables en local comme en CI.
`gate:architecture:api` applique un graphe de dependances dedie aux runtimes `app-api-ts` et `app-connectors`, puis le meme baseline guard `architecture:ts-guardrails`, afin d'interdire les imports directs vers les frontends, les couplages runtime <-> runtime non voulus et toute nouvelle derive de taille sur le socle TS.
`architecture:ts-guardrails` compare la taille des fichiers et fonctions TS/JS a une baseline versionnee dans `scripts/ts-guardrail-baseline.json`; il bloque uniquement les nouvelles violations ou les regressions, pas la dette historique deja capturee.
`docs:validate:database` joue le baseline machine-readable de la documentation base de donnees et bloque la disparition des tables/migrations critiques ou de la section integration dans `docs/DATABASE.md`.
`docs:validate:cto` verifie que les pages CTO critiques existent bien sous `docs/cto/` et que toutes les pages numerotees sont indexees depuis `docs/cto/README.md`, pour eviter les pages durables orphelines.
`docs:validate:schema-parity` echoue si des fichiers schema critiques (`app-api/app/models/*`, `app-api/alembic/versions/*`) changent sans mise a jour simultanee d'une doc durable schema/CTO (`docs/DATABASE.md`, `docs/cto/*`, `docs/architecture/adr/*`).
`docs:validate:contracts-parity` verifie les contrats critiques deja doubles en TypeScript: schemas DecisionOps JSON -> `packages/shared-types/src/domain/*`, taxonomie admin -> `admin-permissions.ts`, et contrat OpenAPI public -> couche `public-contract` TypeScript.
`docs:generate:erd` genere un ERD Mermaid semi-automatique depuis `app-api/app/models/*` vers `docs/cto/visuals/schema-public-auto-generated.mmd`.
`architecture:repo` agrège les deux graphes TypeScript versionnes, `knip`, le baseline guard de taille, le baseline DB, le baseline CTO, la parite schema/doc et la parite contrats/TypeScript; les configs `dependency-cruiser` et `knip` excluent aussi les depots imbriques comme `marketing/presentations-clients/centaurus/` et les artefacts `.open-next/` pour garder un perimetre de scan stable.
`check-workspace-scripts.mjs` derive le catalogue des workspaces depuis `app-*` et `packages/*`, puis bloque toute absence de script `build` / `lint` / `typecheck` sur le monorepo et toute absence de `test` sur les surfaces critiques. Les scripts racine `pnpm build`, `pnpm lint`, `pnpm typecheck` et `pnpm test` passent donc par un contrat de workspace explicite avant de deleguer a `turbo run ...`.
`runtime-env-inventory.mjs` et `validate-runtime-env-inventory.mjs` versionnent et verifient les variables runtime non secretes obligatoires par surface (`NEXT_PUBLIC_API_URL`, bootstrap OIDC, reglages auth front, etc.) sans les melanger aux secrets.
`runtime-env-contracts.mjs` derive un contrat runtime machine-readable versionne depuis `docs/deployment/runtime-secrets-inventory.json`, `docs/deployment/runtime-env-inventory.json` et `infra/opentofu/platform-topology.json`. `generate-runtime-env-contracts.mjs` regenere `docs/deployment/runtime-env-contracts.generated.json`, tandis que `validate-runtime-env-contracts.mjs` echoue si ce contrat derive n'est plus aligne avec les trois sources de verite.
`gate-exhaustive-local.sh` produit un rapport signe pour tous les checks du socle. En mode `manual`, les checks qui peuvent declarer une release "verte" alors que la prod ne build plus ou que les tests/E2E critiques cassent (`gate-quality-static`, `pnpm build`, `pnpm test:coverage`, `@praedixa/api-ts test`, `pytest`, les E2E Playwright critiques) sont maintenant classes `medium`/`high` et bloquants; seuls les controles vraiment consultatifs restent en `low` et peuvent encore sortir en `PASS with warnings`.
`gate-sensitive-security-tests.sh` rejoue les regressions critiques sur l'isolation `site_id`, le durcissement `CONNECTORS_RUNTIME_URL`, les capabilities des service tokens connecteurs et les validations SSRF/OAuth sortantes. Il est execute par `pre-commit` et `pre-push`.
`ci/run-authoritative-ci.sh` est le point d'entree CI canonique: il enchaine delta securite, gate exhaustif signe, reverification du rapport, contrat runtime secrets + contrat runtime env genere, puis tests de contrat release pour que GitHub Actions puisse devenir l'arbitre final sans dupliquer la logique de fond dans chaque workflow.
`gate-typecheck-all.sh` agrege les typechecks TypeScript projet par projet (`workspace references`, `app-landing`, `app-webapp`, `app-admin`, `app-api-ts`, `app-connectors`) pour remonter en une passe toutes les erreurs de type au lieu d'echouer sur le premier sous-projet.
Le hook `pre-push` appelle maintenant explicitement ce script avant le gate profond, afin de rendre les erreurs TypeScript visibles meme quand un autre controle profond echouerait ensuite.
`gate-quality-static.sh` centralise les verifications statiques monorepo: lint ESLint sans warnings (`--max-warnings=0`), typecheck TypeScript exhaustif via `gate-typecheck-all.sh`, Ruff et MyPy. Le formatage Prettier est enforce en `pre-commit` sur les fichiers stages.
`gate-quality-static.sh` restaure aussi les `next-env.d.ts` generes par `next typecheck` / `next build` (`app-landing`, `app-webapp`, `app-admin`) avant de rendre la main au hook, pour qu'un `pre-push` vert ne laisse jamais le worktree sale sur un fichier purement derive.
`check-alembic-heads.sh` bloque les branches Python qui introduisent plusieurs heads Alembic; il est execute par le gate local exhaustif et par la CI API.
`check-commit-message.sh` bloque les messages de commit hors Conventional Commits et le hook `commit-msg` fait maintenant partie de l'installation standard `prek`.
`check-python-complexity-baseline.py` compare les violations Xenon actuelles a une baseline versionnee pour bloquer toute nouvelle derive de complexite sans rendre le gate inutilisable a cause de la dette legacy deja connue. Utiliser `--write-current-baseline` uniquement lors d'une remise a plat volontaire, revue et accompagnee d'une mise a jour de la doc/runbook pour garder la dette structurelle tracee.
`check-ts-guardrail-baseline.mjs` joue le meme role cote TypeScript/Next/Node pour les fichiers source du socle: limite cible `500` lignes par fichier et `50` lignes par fonction, baseline versionnee, echec uniquement sur nouvelle dette ou aggravation. Le premier `--include-root <path>` remplace la liste racine par defaut, les suivants l'etendent explicitement, et `--root` / `--baseline` restent independants de l'ordre des flags. Toute regeneration de baseline doit etre traitee comme une decision d'architecture explicite, pas comme un contournement opportuniste.
`run-api-dynamic-audits.sh` demarre l'API TS sur un port libre dedie et en mode `tsx` simple, sans `watch`, pour eviter les collisions avec une API locale deja ouverte pendant les gates. Le script vide explicitement `DATABASE_URL` pour auditer le profil stateless/fail-close de l'API publique au lieu d'heriter d'une base locale partiellement configuree.
Le scan Schemathesis du gate passe par `scripts/gates/ci-python-tool.sh schemathesis` pour pinner la version de l'outil, tourne en mode positif et deterministe sur le profil public stateless, active `--continue-on-failure` pour separer les warnings schema/auth attendus des vraies regressions bloquantes, et ecrit un rapport NDJSON dans `.git/gate-reports/artifacts/schemathesis/` afin de rendre chaque echec ou warning reproductible apres coup.
`gate-prepush-deep.sh` resynchronise d'abord `app-api/.venv` avec `uv sync --all-groups --locked`, puis lance `pip-audit` via `uv run --extra dev`, pour auditer le graphe verrouille du sous-projet sans dependre d'un environnement local stale ni perdre l'outil declare dans l'extra `dev`.
Les gates `gate:prepush` et `gate:exhaustive` rejouent aussi `pnpm performance:validate-budgets`, afin de bloquer tout drift entre les budgets performance documentes et leurs baselines JSON versionnees.
Les fuzzings negatifs complets sur endpoints authentifies ne doivent pas etre greffes dans ce hook sans harness d'auth et de persistance dedie; sinon on bloque le push sur des requetes volontairement invalides qui n'exercent pas le contrat applicatif cible.
Le script impose aussi des timeouts explicites sur l'attente de sante, le scan Schemathesis et le smoke `k6`, pour qu'un service degrade ou un client bloque ne puisse pas figer indefiniment les hooks Git.
Le `cleanup` termine maintenant aussi l'arbre de process complet du serveur API de fond apres un court delai si `pnpm exec tsx src/index.ts` ne descend pas tout seul, afin d'eviter les `pre-push` pendus sur un `wait` laisse par des enfants `pnpm` ou `tsx`.
`run-frontend-audits.sh` reutilise explicitement le Chromium Playwright deja valide par les hooks pour `pa11y-ci`, et demarre les frontends via `scripts/dev/run-next-standalone.sh` plutot que `pnpm ... next start`, avec logs absolus, `exec` direct, capture de PID dans le shell courant, cleanup non reentrant, et rehydratation locale de `.next/static` / `public` dans le runtime standalone pour que les audits tournent sur un serveur complet au lieu d'un bootstrap orphelin.
`audit-ultra-strict-local.sh` ignore maintenant uniquement les fichiers `.env`, `.env.local` et `.env.*.local` deja exclus par Git, afin de continuer a bloquer les secrets commitables tout en laissant vivre les secrets locaux non versionnes necessaires aux runtimes de dev.
`scw-release-deploy.sh` doit traiter aussi le dernier service quand `--services` contient un seul item sans retour ligne final, sinon un `--services landing` peut etre ignore silencieusement.
`scw-release-manifest-create.sh` exige maintenant un `--gate-report` reel et versionne son `path + sha256` dans le manifest signe; une release sans preuve de gate signee et reverifiable ne doit plus etre materialisee.
`gate-report-sign.sh`, `verify-gate-report.sh`, `release-manifest-sign.sh` et `release-manifest-verify.sh` exigent une cle HMAC deja provisionnee sur disque; ils ne doivent jamais generer une nouvelle racine de confiance a chaud, ni passer la cle ou la signature calculee en argument CLI (`argv`).
`scw-release-deploy.sh` doit utiliser la reference signee `registry-image@sha256:...` du manifest comme source de verite; si l'API Scaleway Container refuse encore cette syntaxe, le script peut seulement retomber sur le tag deja signe derive de cette meme reference et doit journaliser explicitement ce fallback fournisseur.
Les scripts `scw-configure-*.sh` doivent passer les variables d'environnement et secrets via des fichiers JSON temporaires et `scw-apply-container-config.sh`, pas via des arguments CLI contenant les secrets en clair.
Les scripts `scw-configure-landing-env.sh`, `scw-configure-frontend-env.sh`, `scw-configure-api-env.sh` et `scw-configure-auth-env.sh` doivent aussi synchroniser leurs secrets vers Scaleway Secret Manager sous `/praedixa/<env>/<container>/runtime` avant application au container. Pour l'API, cela inclut aussi `RESEND_WEBHOOK_SECRET` afin que `POST /api/v1/webhooks/resend/email-delivery` ne parte jamais avec un secret repo/code absent du runtime.
Le profil landing inclut maintenant aussi `LANDING_ASSET_SIGNING_SECRET`; un deploy landing sans ce secret reouvre immediatement un chemin de telechargement a URL stable et doit rester bloque au preflight.
`validate-runtime-secret-inventory.mjs` verifie que `docs/deployment/runtime-secrets-inventory.json` reste aligne avec `docs/deployment/environment-secrets-owners-matrix.md`; `scw-preflight-deploy.sh` execute ce validateur avant tout controle cloud et lit ensuite depuis cet inventaire les secrets runtime `preflight_required` a imposer sur chaque container.
`validate-database-doc-baseline.mjs` compare un inventaire machine-readable leger des modeles SQLAlchemy (`app-api/app/models/*`) et des migrations Alembic (`app-api/alembic/versions/*`) avec `docs/DATABASE.md`; il bloque au minimum la disparition documentaire des tables critiques, des migrations structurantes et de la section `Plateforme d'integration`.
`check-cto-doc-guardrails.mjs` compare les pages numerotees presentes sous `docs/cto/` avec l'index `docs/cto/README.md`; il bloque les pages critiques manquantes et toute page durable non referencee dans le parcours d'onboarding CTO.
`check-schema-doc-change-parity.mjs` sert de garde-fou CI leger: si le diff courant touche le schema SQLAlchemy ou les migrations Alembic, il exige aussi une mise a jour de la doc durable schema/CTO dans le meme changement.
`check-contract-ts-parity.mjs` sert de garde-fou de parite pour les contrats critiques qui ont deja un miroir TypeScript versionne dans `packages/shared-types/`.
`generate-cto-erd.mjs` produit un ERD Mermaid semi-automatique depuis les `__tablename__` et `ForeignKey(...)` des modeles SQLAlchemy; il donne une vue brute du schema courant a cote des diagrammes editoriaux plus travailles.
Les preflights `scw-preflight-staging.sh` et `scw-preflight-deploy.sh` sont maintenant alimentes par l'inventaire versionne des secrets runtime; pour les frontends, cela impose `AUTH_SESSION_SECRET`, `AUTH_RATE_LIMIT_KEY_SALT` et au moins une cle de store distribue (`AUTH_RATE_LIMIT_REDIS_URL` ou `RATE_LIMIT_STORAGE_URI`) sans warning de degradation locale. Le wrapper `pnpm run scw:preflight:staging` delegue maintenant au chemin strict `./scripts/scw/scw-preflight-deploy.sh staging`.
`scw-configure-frontend-env.sh` exige maintenant une origine publique explicite pour `webapp` et `admin`: `AUTH_APP_ORIGIN` doit correspondre exactement au host canonique versionne pour la surface cible, et `NEXT_PUBLIC_APP_ORIGIN` reste un miroir strict de cette meme origin quand il est expose.
`scw-preflight-deploy.sh` reverifie cette parite frontend a partir de `docs/deployment/runtime-secrets-inventory.json`; tout changement de host public frontend doit donc mettre a jour le script de config, l'inventaire machine-readable et la matrice humaine dans le meme diff. En production, les bindings container et la resolution DNS publique de `app/admin/api/praedixa.com/www` sont maintenant `strict`: un preflight ne doit plus rester vert si les hosts publics ne sont pas effectivement exposes.
Le chemin normal de release build-ready passe par `release:build`, `release:manifest:create`, `release:deploy` et `release:promote`; les wrappers `scw:deploy:*` directs ne sont pas la reference pour une release evidencable.
`scw-release-manifest-create.sh` sait maintenant embarquer une preuve machine-readable de backup/restore via `--database-impact`, `--backup-evidence <summary.json>` et `--restore-evidence <summary.json>`; `release-manifest-verify.sh` reverifie ensuite la presence, le digest et le schema type de ces summaries avant promotion.
`run-supply-chain-audit.sh` ecrit aussi `supply-chain-evidence.json` a cote du SBOM et du scan `grype`; ce summary machine-readable versionne les digests des artefacts produits, mais ne constitue pas a lui seul une attestation de provenance signee.
`scw-release-manifest-create.sh --supply-chain-evidence <summary.json>` peut rattacher cette preuve au manifest signe.
`release-manifest-verify.sh` reverifie alors le digest du gate report reference, puis celui du summary supply-chain et enfin celui des artefacts imbriques (`sbom.cdx.json`, `grype-findings.json`) avant promotion.
`scw-post-deploy-smoke.sh` est le smoke CLI canonique apres deploy ou rollback pour `api`, `webapp`, `admin`, `auth`, `connectors` et, si l'URL est explicite, `landing`. Pour `webapp` et `admin`, il faut maintenant fournir `--webapp-session-cookie-file` / `--admin-session-cookie-file` (ou les variables d'environnement homonymes) avec une valeur `Cookie:` ou `prx_*_sess=...` chargee depuis un fichier securise; sans cette preuve, le smoke echoue au lieu de declarer vert un frontend jamais verifie en session authentifiee.
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
./scripts/scw/scw-post-deploy-smoke.sh --env staging --services api,webapp,admin,auth --webapp-session-cookie-file <secure-path> --admin-session-cookie-file <secure-path>
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

Les sources de ces mini-sites vivent maintenant sous `marketing/presentations-clients/<nom>/`; les scripts `scw:deploy:*` pointent deja vers ce parent commun.

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
- `run-codeql-local.sh` doit scanner une copie source epuree des artefacts generes (`.next`, `.open-next`, `coverage`, `playwright-report`) et des depots imbriques comme `marketing/presentations-clients/centaurus/`. Il execute la suite CodeQL `security-extended`; la qualite et l'architecture restent couvertes par les autres gates locaux.
- Les budgets Lighthouse versionnes dans `.lighthouserc.json` doivent rester ambitieux mais mesurables sur un build frais; ne les rebaser qu'apres avoir corrige les goulots evitables et constate la nouvelle baseline optimisee.
- Un bootstrap Scaleway qui depend d'un DNS externe doit declarer explicitement son mode de verification et echouer tant que le record public attendu n'est pas observable; aucun warning de completion manuelle differee n'est acceptable.

## Lire ensuite

- `scripts/lib/README.md`
- `scripts/semgrep/README.md`
