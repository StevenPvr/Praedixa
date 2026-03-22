# Infra Readiness TODO

## Executive Summary

Le monorepo n'est pas pret pour un cycle de developpement feature serieux. Les preuves collectees montrent un socle contradictoire: installation et build global passent, mais les garde-fous canoniques ne sont ni verts ni credibles, l'API TS n'est pas deployable via son Dockerfile versionne, l'orchestration Camunda n'est pas operationnelle, plusieurs surfaces admin critiques cassent en E2E, et le preflight cloud staging est massivement rouge. Cette TODO liste le plus petit plan de stabilisation pour arriver a un niveau `GO`.

## P0 Blockers

- [ ] Rendre les quality gates racine veridiques et toutes vertes
      Problem: `pnpm lint` est rouge, `pnpm test` est rouge, et `pnpm test` racine n'inclut pas `app-api-ts` ni `app-connectors`, ce qui produit un faux signal de qualite sur les runtimes backend.
      Preuve: `pnpm lint` echoue sur `app-api-ts/src/index.ts`, `app-api-ts/src/__tests__/admin-onboarding.camunda.integration.test.ts` et `app-api-ts/src/services/admin-onboarding-support.ts`; `pnpm test` echoue sur `app-landing/app/rss.xml/__tests__/route.test.ts`; `vitest.config.ts` n'inclut que `packages/**`, `app-webapp/**`, `app-landing/**` et `app-admin/**`; `pnpm --dir app-api-ts test` echoue avec 11 tests rouges alors que `pnpm test` ne les voit pas.
      Correctif exact: corriger les erreurs ESLint du scope `app-api-ts`; remettre a jour les tests `app-api-ts` casses par les changements Camunda et audit-log; et modifier la commande racine `test` pour qu'elle execute aussi les suites backend, soit via un composeur de scripts workspace, soit via une aggregation Vitest explicitement isolee par projet.
      Fichiers/scripts concernes: `package.json`, `vitest.config.ts`, `app-api-ts/src/index.ts`, `app-api-ts/src/__tests__/admin-onboarding.camunda.integration.test.ts`, `app-api-ts/src/services/admin-onboarding-support.ts`, `app-api-ts/src/__tests__/config.test.ts`, `app-api-ts/src/__tests__/admin-backoffice-users.test.ts`.
      Commande de validation: `pnpm lint && pnpm test && pnpm --dir app-api-ts test && pnpm --dir app-connectors test`
      Resultat attendu: toutes les commandes sortent en code `0`, les suites backend ne sont plus hors radar du gate racine, et aucun faux vert n'est possible depuis `pnpm test`.
      Dependance eventuelle a un autre item: aucune.

- [ ] Rendre l'image Docker `app-api-ts` buildable depuis le Dockerfile versionne
      Problem: le service API online n'est pas deployable de facon reproductible avec `app-api-ts/Dockerfile`, ce qui casse la chaine release pour un service critique.
      Preuve: `docker build -f app-api-ts/Dockerfile .` echoue avec des modules workspace introuvables (`@praedixa/shared-types`, `@praedixa/telemetry`) et des dependances runtime manquantes (`pg`, `zod`), apres un contexte Docker de plus de `1.25GB`.
      Correctif exact: revoir le Dockerfile pour installer le vrai sous-ensemble workspace necessaire au build API TS, copier les manifests des packages internes requis avant `pnpm install`, puis copier ou reconstruire les artefacts workspace utilises au runtime; verifier aussi que la build ne depend pas implicitement des tests TypeScript si ce n'est pas voulu pour l'image prod.
      Fichiers/scripts concernes: `app-api-ts/Dockerfile`, `package.json`, `pnpm-workspace.yaml`, `packages/shared-types/package.json`, `packages/telemetry/package.json`, `.dockerignore`.
      Commande de validation: `docker build -f app-api-ts/Dockerfile .`
      Resultat attendu: la build Docker termine en succes sur un contexte propre, sans resolution manquante des packages workspace ni dependances runtime absentes.
      Dependance eventuelle a un autre item: `Rendre les quality gates racine veridiques et toutes vertes`.

- [ ] Stabiliser `pnpm test:e2e:admin` pour qu'il reflete l'etat reel du back-office
      Problem: la suite E2E admin casse a la fois sur un vrai bug runtime et sur des specs qui ne correspondent plus aux surfaces activement exposees, ce qui empeche toute verification fiable du back-office.
      Preuve: `pnpm test:e2e:admin` echoue avec 14 tests rouges; `testing/e2e/admin/cross-app-session-isolation.spec.ts` appelle `http://localhost:3001/login` alors que `package.json` demarre seulement `PW_SERVER_TARGETS=admin`; `test-results/parametres-.../error-context.md` montre un `Runtime TypeError` sur `app/(admin)/parametres/page.tsx:199` (`row.phase.replaceAll`); `test-results/previsions-.../error-context.md` et `test-results/workspace-messages-.../error-context.md` montrent des pages fail-close; `app-admin/lib/runtime/admin-workspace-feature-gates.ts` force `forecastingWorkspace=false` et `messagesWorkspace=false`.
      Correctif exact: corriger le crash `row.phase` dans `/parametres`; decider explicitement si `Previsions` et `Messages` doivent etre industrialises maintenant ou rester fermes, puis aligner les specs E2E sur cette verite; et deplacer le test cross-app dans une commande qui demarre aussi la webapp ou lui faire demarrer ses dependances.
      Fichiers/scripts concernes: `app-admin/app/(admin)/parametres/page.tsx`, `app-admin/lib/runtime/admin-workspace-feature-gates.ts`, `testing/e2e/admin/cross-app-session-isolation.spec.ts`, `testing/e2e/admin/parametres.spec.ts`, `testing/e2e/admin/previsions.spec.ts`, `testing/e2e/admin/workspace-messages.spec.ts`, `package.json`.
      Commande de validation: `pnpm test:e2e:admin`
      Resultat attendu: `0` test rouge, aucune overlay Next.js en E2E, et aucune spec n'attend une surface desactivee ou un serveur non demarre.
      Dependance eventuelle a un autre item: si les surfaces `Previsions` ou `Messages` sont reouvertes, depend de la reindustrialisation backend correspondante; sinon aucune.

- [ ] Remettre Camunda onboarding dans un etat vraiment operationnel
      Problem: la brique d'orchestration critique pour l'onboarding n'est pas exploitable localement, donc le workflow admin associe n'est pas verifiable.
      Preuve: `pnpm camunda:status` retourne `orchestration ... Up ... (unhealthy)`; `pnpm test:camunda:onboarding` echoue avec `PersistenceError: Camunda onboarding runtime failed.`; `pnpm dev:api` ne fait que monter le HTTP avec un warning fail-close sur Camunda indisponible.
      Correctif exact: reparer le stack lightweight Camunda epingle par `scripts/dev/camunda-dev.sh`, verifier les dependances necessaires au service `orchestration`, et remettre `app-api-ts` dans une situation ou `initializeOnboardingCamundaRuntime` et `ensureProcessDeployed` passent reellement contre le stack versionne.
      Fichiers/scripts concernes: `scripts/dev/camunda-dev.sh`, `infra/camunda/README.md`, `app-api-ts/src/services/admin-onboarding-camunda.ts`, `app-api-ts/src/__tests__/admin-onboarding.camunda.integration.test.ts`.
      Commande de validation: `pnpm camunda:up && pnpm camunda:status && pnpm test:camunda:onboarding`
      Resultat attendu: le runtime Camunda passe en `healthy` et le smoke onboarding reussit sans skip ni `503`.
      Dependance eventuelle a un autre item: la base locale doit etre disponible et migree.

- [ ] Ramener le preflight Scaleway staging a un etat deployable
      Problem: le socle cloud versionne n'est pas coherent avec le runtime observe; staging est incomplet et `auth-prod` lui-meme manque encore des prerequis critiques.
      Preuve: `pnpm scw:preflight:staging` echoue avec `38` erreurs et `3` warnings; namespaces `landing-staging`, `webapp-staging`, `admin-staging`, `api-staging` absents; `auth-prod` manque `KC_DB`, `KC_DB_URL_HOST`, `KC_DB_URL_PORT`, `KC_DB_URL_DATABASE`, `KC_DB_USERNAME`, `KC_DB_PASSWORD`, `KEYCLOAK_SMTP_PASSWORD` et le private network; plusieurs RDB, Redis, buckets et DNS attendus sont manquants.
      Correctif exact: soit creer les assets cloud attendus par le preflight versionne, soit nettoyer `docs/deployment/runtime-secrets-inventory.json` et les scripts `scw-*` pour qu'ils n'affirment plus un etat non provisionne; en parallele, reappliquer la configuration `auth-prod` via les scripts `scw-configure-auth-env.sh` et la synchro Secret Manager avec l'inventaire exact.
      Fichiers/scripts concernes: `scripts/scw/scw-preflight-deploy.sh`, `scripts/scw/scw-bootstrap-frontends.sh`, `scripts/scw/scw-bootstrap-api.sh`, `scripts/scw/scw-bootstrap-auth.sh`, `scripts/scw/scw-configure-auth-env.sh`, `scripts/scw/scw-configure-api-env.sh`, `scripts/scw/scw-configure-frontend-env.sh`, `docs/deployment/runtime-secrets-inventory.json`, `docs/deployment/environment-secrets-owners-matrix.md`.
      Commande de validation: `pnpm scw:preflight:staging`
      Resultat attendu: `0` erreur bloquante; les namespaces, containers, secrets, reseaux et services manques sont soit provisionnes, soit retires proprement du contrat versionne.
      Dependance eventuelle a un autre item: `Rendre l'image Docker app-api-ts buildable depuis le Dockerfile versionne`.

## P1 Important Gaps

- [ ] Realigner les checks landing sur le contrat public effectivement shippe
      Problem: la landing a des checks rouges dus a un drift entre les tests et les routes publiques reelles, ce qui pollue la lecture des regressions.
      Preuve: `pnpm test` echoue sur `app-landing/app/rss.xml/__tests__/route.test.ts` qui attend encore `body` sans `<item>` alors qu'un article publie existe; `pnpm test:e2e:landing` echoue sur `testing/e2e/landing/seo.spec.ts` qui attend `/fr/ressources/cout-sous-couverture/asset`; `app-landing/components/pages/SerpResourcePage.tsx` sert maintenant l'asset via `/api/resource-asset?locale=...&slug=...`.
      Correctif exact: remettre les tests landing sur le contrat public reel, ou restaurer l'ancien contrat de download si c'est lui qui doit faire foi; une seule URL de telechargement doit etre consideree comme canonique et testee partout.
      Fichiers/scripts concernes: `app-landing/app/rss.xml/__tests__/route.test.ts`, `testing/e2e/landing/seo.spec.ts`, `app-landing/components/pages/SerpResourcePage.tsx`, `app-landing/app/api/resource-asset/`.
      Commande de validation: `pnpm test && pnpm test:e2e:landing`
      Resultat attendu: les suites landing passent sans assertion obsolete sur le RSS ou les assets SEO.
      Dependance eventuelle a un autre item: aucune.

- [ ] Verrouiller explicitement les versions Node et Python dans le bootstrap repo
      Problem: les prerequis sont documentes mais pas enforcees, ce qui laisse tourner le repo sur des toolchains differentes de celles ciblees.
      Preuve: la machine d'audit execute `node v25.2.1` et `Python 3.14.3`, alors que le repo annonce `Node.js 22+` et `Python 3.12+`; aucune commande racine n'a bloque ou averti explicitement.
      Correctif exact: ajouter un mecanisme versionne type `.nvmrc` ou Volta pour Node, plus une version Python epinglee (`.python-version` ou equivalent uv), et brancher un check fail-fast dans le bootstrap ou les scripts `dev:*`.
      Fichiers/scripts concernes: `README.md`, `package.json`, `app-api/pyproject.toml`, `scripts/dev/dev-setup.sh`, eventuels fichiers `.nvmrc` / `.python-version`.
      Commande de validation: `node -v && python3 --version && ./scripts/dev/dev-setup.sh`
      Resultat attendu: une machine fraiche est soit alignee automatiquement, soit arretee tot avec un message clair de version supportee.
      Dependance eventuelle a un autre item: aucune.

- [ ] Faire correspondre la commande Python documentee au vrai chemin de bootstrap
      Problem: la commande annoncee pour tester le sous-projet Python ne fonctionne pas sur un shell frais, ce qui force de l'archeologie des outils.
      Preuve: `cd app-api && pytest -q` retourne `command not found`; `uv sync --extra dev` puis `uv run pytest -q` passent.
      Correctif exact: soit fournir un script racine ou package qui encapsule `uv run pytest -q`, soit aligner toutes les docs et consignes repo sur cette commande unique.
      Fichiers/scripts concernes: `AGENTS.md`, `README.md`, `app-api/README.md`, eventuel script `package.json` ou shell dedie.
      Commande de validation: `cd app-api && <commande documentee>`
      Resultat attendu: la commande documentee pour la QA Python fonctionne verbatim sur une machine equipee de `uv`.
      Dependance eventuelle a un autre item: aucune.

## P2 Improvements

- [ ] Supprimer le bruit `canvas` des tests Vitest qui passent
      Problem: certaines suites restent vertes tout en emettant un bruit `jsdom` massif, ce qui noie les vraies regressions.
      Preuve: `pnpm test` journalise de multiples `Error: Not implemented: HTMLCanvasElement.prototype.getContext` pendant `app-landing/components/homepage/__tests__/HeroPulsorSection.test.tsx`.
      Correctif exact: mocker `HTMLCanvasElement.getContext` dans `testing/vitest.setup.ts` ou neutraliser le chemin canvas dans l'environnement de test.
      Fichiers/scripts concernes: `testing/vitest.setup.ts`, `app-landing/components/homepage/HeroPulsorDepthLayers.tsx`, `app-landing/components/homepage/__tests__/HeroPulsorSection.test.tsx`.
      Commande de validation: `pnpm test`
      Resultat attendu: la suite reste verte et la sortie stderr n'est plus polluee par des erreurs `canvas` attendues.
      Dependance eventuelle a un autre item: aucune.

- [ ] Remplacer les credentials locaux versionnes par une convention de secret dev plus sure
      Problem: le repo normalise un mot de passe Postgres local explicite dans plusieurs surfaces doc et compose, ce qui banalise la copie de credentials.
      Preuve: `infra/docker-compose.yml` versionne `POSTGRES_PASSWORD=praedixa_local_dev_pg_2026`; la meme valeur apparait dans `docs/DATABASE.md` et `app-api/.env.example`.
      Correctif exact: basculer vers un placeholder ou une generation locale documentee, puis faire pointer les docs et exemples vers cette convention plutot que vers un mot de passe fixe.
      Fichiers/scripts concernes: `infra/docker-compose.yml`, `docs/DATABASE.md`, `app-api/.env.example`, `README.md`.
      Commande de validation: `rg -n "praedixa_local_dev_pg_2026" infra docs app-api README.md`
      Resultat attendu: aucune doc ou config versionnee ne promeut encore un secret local fixe reutilisable.
      Dependance eventuelle a un autre item: aucune.

## Recommended Execution Order

- [ ] Ordre 1 - Reparrer la verite des gates avant toute autre fermeture
      Problem: tant que les commandes canoniques sont rouges ou mensongeres, toute autre correction reste difficile a mesurer.
      Preuve: `pnpm lint` et `pnpm test` sont rouges, et `pnpm test` ignore des suites backend critiques.
      Correctif exact: traiter d'abord `Rendre les quality gates racine veridiques et toutes vertes`.
      Fichiers/scripts concernes: `package.json`, `vitest.config.ts`, `app-api-ts/src/**`.
      Commande de validation: `pnpm lint && pnpm test && pnpm --dir app-api-ts test`
      Resultat attendu: le repo dispose d'un signal fiable pour mesurer les items suivants.
      Dependance eventuelle a un autre item: aucune.

- [ ] Ordre 2 - Rendre l'API deployable avant de reparer le cloud
      Problem: le preflight et la release ne peuvent pas converger tant que l'image `app-api-ts` ne build pas.
      Preuve: `docker build -f app-api-ts/Dockerfile .` echoue.
      Correctif exact: traiter ensuite `Rendre l'image Docker app-api-ts buildable depuis le Dockerfile versionne`.
      Fichiers/scripts concernes: `app-api-ts/Dockerfile`, `packages/shared-types/**`, `packages/telemetry/**`.
      Commande de validation: `docker build -f app-api-ts/Dockerfile .`
      Resultat attendu: une image versionnee et reproductible existe pour le service API.
      Dependance eventuelle a un autre item: `Ordre 1 - Reparrer la verite des gates avant toute autre fermeture`.

- [ ] Ordre 3 - Remettre l'admin et Camunda dans un etat testable
      Problem: le back-office et l'orchestration restent les deux surfaces les plus susceptibles de bloquer un cycle feature.
      Preuve: `pnpm test:e2e:admin` echoue avec 14 fails; `pnpm test:camunda:onboarding` echoue; `pnpm camunda:status` est unhealthy.
      Correctif exact: fermer ensuite `Stabiliser pnpm test:e2e:admin` et `Remettre Camunda onboarding dans un etat vraiment operationnel`.
      Fichiers/scripts concernes: `app-admin/**`, `testing/e2e/admin/**`, `scripts/dev/camunda-dev.sh`, `app-api-ts/src/services/admin-onboarding-camunda.ts`.
      Commande de validation: `pnpm test:e2e:admin && pnpm camunda:status && pnpm test:camunda:onboarding`
      Resultat attendu: l'operabilite admin locale et l'onboarding BPM sont prouvables, pas seulement documentes.
      Dependance eventuelle a un autre item: `Ordre 1 - Reparrer la verite des gates avant toute autre fermeture`.

- [ ] Ordre 4 - Reconcilier ensuite le contrat cloud versionne avec le runtime live
      Problem: corriger le preflight avant d'avoir des images et des services fiables ferait converger l'infra vers un artefact encore instable.
      Preuve: `pnpm scw:preflight:staging` est massivement rouge et depend des images/services precedents.
      Correctif exact: fermer enfin `Ramener le preflight Scaleway staging a un etat deployable`.
      Fichiers/scripts concernes: `scripts/scw/scw-*.sh`, `docs/deployment/**`.
      Commande de validation: `pnpm scw:preflight:staging`
      Resultat attendu: le staging devient un vrai environnement de validation pour le cycle feature.
      Dependance eventuelle a un autre item: `Ordre 2 - Rendre l'API deployable avant de reparer le cloud`, `Ordre 3 - Remettre l'admin et Camunda dans un etat testable`.

## Exit Criteria

- [ ] Les gates racine et backend sont alignes et verts
      Problem: la sortie de crise doit se mesurer sur les commandes que l'equipe utilisera reellement chaque jour.
      Preuve: aujourd'hui, `pnpm lint`, `pnpm test` et `pnpm --dir app-api-ts test` ne convergent pas.
      Correctif exact: garder les scripts et suites alignes apres correction.
      Fichiers/scripts concernes: `package.json`, `vitest.config.ts`, `app-api-ts/**`, `app-connectors/**`.
      Commande de validation: `pnpm lint && pnpm typecheck && pnpm test && pnpm --dir app-api-ts test && pnpm --dir app-connectors test`
      Resultat attendu: toutes les commandes sortent en code `0` sans suite backend oubliee.
      Dependance eventuelle a un autre item: tous les P0 sauf le preflight cloud.

- [ ] Les surfaces produit/admin critiques sont couvertes par des E2E passants et intentionnels
      Problem: un cycle feature ne peut pas demarrer si les surfaces frontales cassent ou si leurs specs testent un produit different du produit reel.
      Preuve: `pnpm test:e2e:landing` et `pnpm test:e2e:admin` sont rouges aujourd'hui.
      Correctif exact: garder les specs synchronisees avec les routes et gates versionnes.
      Fichiers/scripts concernes: `testing/e2e/landing/**`, `testing/e2e/admin/**`, `app-landing/**`, `app-admin/**`.
      Commande de validation: `pnpm test:e2e:landing && pnpm test:e2e:smoke && pnpm test:e2e:admin`
      Resultat attendu: `0` test rouge, sans attente sur des routes mortes ou des surfaces volontairement fail-close.
      Dependance eventuelle a un autre item: `Stabiliser pnpm test:e2e:admin`, `Realigner les checks landing sur le contrat public effectivement shippe`.

- [ ] Les runtimes critiques bootent et l'onboarding BPM passe
      Problem: l'equipe doit pouvoir prouver le bootstrap local des services critiques avant d'empiler des features dessus.
      Preuve: aujourd'hui, la DB n'est pas montee par defaut, Camunda est unhealthy, et le smoke onboarding echoue.
      Correctif exact: garantir un chemin local documente et fiable pour Postgres, API TS, admin et Camunda.
      Fichiers/scripts concernes: `infra/docker-compose.yml`, `scripts/dev/dev-api-run.sh`, `scripts/dev/camunda-dev.sh`, `app-api/alembic/**`, `app-api-ts/src/services/admin-onboarding-camunda.ts`.
      Commande de validation: `docker compose -f infra/docker-compose.yml up -d postgres && cd app-api && uv run --active alembic upgrade head && cd .. && pnpm dev:api & sleep 5 && curl -fsS http://127.0.0.1:8000/api/v1/health && pnpm camunda:status && pnpm test:camunda:onboarding`
      Resultat attendu: API health `200`, DB migree, Camunda healthy et smoke onboarding vert.
      Dependance eventuelle a un autre item: `Remettre Camunda onboarding dans un etat vraiment operationnel`.

- [ ] Le preflight staging ne remonte plus de drift infra critique
      Problem: un environnement de validation feature doit exister et etre reconcilie avec le contrat repo.
      Preuve: `pnpm scw:preflight:staging` remonte aujourd'hui `38` erreurs et `3` warnings.
      Correctif exact: provisionner ou nettoyer tous les assets declares jusqu'a obtenir un preflight propre.
      Fichiers/scripts concernes: `scripts/scw/scw-preflight-deploy.sh`, `scripts/scw/scw-bootstrap-*.sh`, `scripts/scw/scw-configure-*.sh`, `docs/deployment/runtime-secrets-inventory.json`, `docs/deployment/environment-secrets-owners-matrix.md`.
      Commande de validation: `pnpm scw:preflight:staging`
      Resultat attendu: `0` erreur bloquante et un etat staging coherent avec le contrat versionne.
      Dependance eventuelle a un autre item: `Ramener le preflight Scaleway staging a un etat deployable`.
