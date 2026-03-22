# Audit statique des bugs - 2026-03-21

Ce document consolide les bugs deja identifies par inspection statique du repo, sans lancement de tests.

## Statut

- Mode: audit statique uniquement
- Tests executes pendant l'audit initial: aucun
- Correctifs appliques:
  - cluster auth/frontend partage
  - cluster runtime `app-connectors`
  - cluster ingestion/runtime `app-api` et auth `app-api-ts`
  - scripts HMAC / gate / smoke post-deploy
  - fermeture complementaire des findings restants sur SSRF DNS, permissions/layout admin, hydration webapp et scripts release/deploy
- Etat: baseline d'audit fermee dans le code; le document reste une trace des defects identifies le 2026-03-21

## Cloture

- Findings fermes dans la premiere vague:
  - 1 a 8
  - 11 a 16
  - 20 a 21
  - 26 a 37
- Findings fermes dans la vague de cloture:
  - 9. SSRF DNS `app-connectors`
  - 10. layout/messages admin
  - 17. manifest release refuse un gate report rouge
  - 18. deploy release refuse la degradation digest -> tag mutable
  - 19. `SCW_API_URL` borne et fail-close
  - 22. `vue-client` ne fetch plus le billing sans permission
  - 23. messages admin avec source de verite unique
  - 24. `/parametres` resynchronise sa section par defaut apres hydratation des droits
  - 25. date du shell webapp hydratee cote client
  - 28. smoke API recale sur le contrat versionne `/api/v1/health`
- Revalidation ciblee executee apres correction:
  - `pnpm --filter @praedixa/admin test -- --run 'app/(admin)/clients/[orgId]/vue-client/__tests__/page.test.tsx' 'app/(admin)/parametres/__tests__/page.test.tsx' 'app/(admin)/clients/[orgId]/messages/__tests__/page.test.tsx'`
  - `pnpm --filter @praedixa/webapp test -- --run 'hooks/__tests__/use-api.test.ts' 'components/__tests__/app-shell-model.test.tsx' 'app/(app)/messages/__tests__/page.test.tsx' 'app/(app)/actions/__tests__/page.test.tsx' 'app/(app)/parametres/__tests__/page.test.tsx'`
  - `pnpm --filter @praedixa/connectors test -- --run src/__tests__/outbound-url.test.ts src/__tests__/service.test.ts src/__tests__/config.test.ts`
  - `node --test scripts/__tests__/release-manifest-gate-report.test.mjs scripts/__tests__/scw-release-deploy.test.mjs scripts/__tests__/scw-apply-container-config.test.mjs scripts/__tests__/smoke-test-production.test.mjs`

## Findings consolides

### 1. Critique - `app-connectors` expose des credentials fournisseurs dechiffres sans lier l'acces a un `sync_run`/worker proprietaire

- Cause racine:
  - la route runtime exige seulement `provider_runtime:read`
  - le service renvoie ensuite directement des secrets dechiffres (bearer token, API key, mot de passe, private key)
- Impact:
  - un token interne compromis peut exfiltrer les credentials live d'une organisation entiere
- References:
  - [app-connectors/src/routes.ts](/Users/steven/Programmation/praedixa/app-connectors/src/routes.ts#L479)
  - [app-connectors/src/server.ts](/Users/steven/Programmation/praedixa/app-connectors/src/server.ts#L890)
  - [app-connectors/src/service.ts](/Users/steven/Programmation/praedixa/app-connectors/src/service.ts#L1622)
  - [app-connectors/src/service.ts](/Users/steven/Programmation/praedixa/app-connectors/src/service.ts#L2263)
  - [app-connectors/src/service.ts](/Users/steven/Programmation/praedixa/app-connectors/src/service.ts#L2290)
  - [app-connectors/src/service.ts](/Users/steven/Programmation/praedixa/app-connectors/src/service.ts#L2341)
  - [app-connectors/src/service.ts](/Users/steven/Programmation/praedixa/app-connectors/src/service.ts#L2362)

### 2. Critique - le store persistant `app-connectors` est en `last writer wins` sur un snapshot global

- Cause racine:
  - chaque instance hydrate un snapshot global unique en memoire
  - chaque mutation reecrit l'ensemble du snapshot JSONB
  - aucune protection ne previent l'ecrasement d'un etat plus recent par une autre instance
- Impact:
  - perte de locks, `sync_runs`, `raw_events`, sessions OAuth ou index d'idempotence sous concurrence multi-processus
- References:
  - [app-connectors/src/persistent-store.ts](/Users/steven/Programmation/praedixa/app-connectors/src/persistent-store.ts#L77)
  - [app-connectors/src/persistent-store.ts](/Users/steven/Programmation/praedixa/app-connectors/src/persistent-store.ts#L113)
  - [app-connectors/src/persistent-store.ts](/Users/steven/Programmation/praedixa/app-connectors/src/persistent-store.ts#L169)
  - [app-connectors/src/persistent-store.ts](/Users/steven/Programmation/praedixa/app-connectors/src/persistent-store.ts#L184)

### 3. Critique - la transformation Python peut lire les raw events avant leur commit

- Cause racine:
  - l'ingestion ecrit via `AsyncSession`
  - la transformation lit ensuite via une autre connexion ouverte par `ddl_connection()`
  - la lecture peut donc partir avant que les lignes raw du lot courant soient commit
- Impact:
  - transformation a 0 ligne, watermark obsolete, lot considere traite alors qu'il ne l'a pas ete
- References:
  - [app-api/app/services/integration_event_ingestor.py](/Users/steven/Programmation/praedixa/app-api/app/services/integration_event_ingestor.py#L300)
  - [app-api/app/services/integration_event_ingestor.py](/Users/steven/Programmation/praedixa/app-api/app/services/integration_event_ingestor.py#L313)
  - [app-api/app/services/integration_dataset_file_ingestor.py](/Users/steven/Programmation/praedixa/app-api/app/services/integration_dataset_file_ingestor.py#L133)
  - [app-api/app/services/integration_dataset_file_ingestor.py](/Users/steven/Programmation/praedixa/app-api/app/services/integration_dataset_file_ingestor.py#L156)
  - [app-api/app/services/transform_engine.py](/Users/steven/Programmation/praedixa/app-api/app/services/transform_engine.py#L517)
  - [app-api/app/core/ddl_connection.py](/Users/steven/Programmation/praedixa/app-api/app/core/ddl_connection.py#L64)

### 4. Critique - des raw events peuvent etre marques `processed` avant commit DB cote Python

- Cause racine:
  - le worker Python accuse reception/consommation des events avant la fin definitive de la transaction SQLAlchemy
  - un rollback ulterieur laisse des events irreversiblement consommes cote runtime
- Impact:
  - perte silencieuse de donnees Bronze / raw
- References:
  - [app-api/app/services/integration_runtime_worker.py](/Users/steven/Programmation/praedixa/app-api/app/services/integration_runtime_worker.py#L774)
  - [app-api/app/services/integration_runtime_worker.py](/Users/steven/Programmation/praedixa/app-api/app/services/integration_runtime_worker.py#L781)
  - [app-api/app/services/integration_runtime_worker.py](/Users/steven/Programmation/praedixa/app-api/app/services/integration_runtime_worker.py#L985)
  - [app-api/app/services/integration_runtime_worker.py](/Users/steven/Programmation/praedixa/app-api/app/services/integration_runtime_worker.py#L1006)
  - [app-api/app/services/integration_runtime_worker.py](/Users/steven/Programmation/praedixa/app-api/app/services/integration_runtime_worker.py#L1039)

### 5. Haute - le mode API admin `direct` est casse: aucun bearer token n'est envoye

- Cause racine:
  - `getValidAccessToken()` retourne toujours `null`
  - le client admin n'ajoute `Authorization` qu'en mode direct
  - le mode expose dans la config ne peut donc jamais fonctionner
- Impact:
  - toutes les requetes hookees partent sans auth en `NEXT_PUBLIC_ADMIN_API_MODE=direct`
- References:
  - [app-admin/hooks/use-api.ts](/Users/steven/Programmation/praedixa/app-admin/hooks/use-api.ts#L17)
  - [app-admin/lib/auth/client.ts](/Users/steven/Programmation/praedixa/app-admin/lib/auth/client.ts#L97)
  - [app-admin/lib/api/client.ts](/Users/steven/Programmation/praedixa/app-admin/lib/api/client.ts#L101)
  - [app-admin/lib/api/client.ts](/Users/steven/Programmation/praedixa/app-admin/lib/api/client.ts#L115)

### 6. Haute - l'ownership des `sync_runs` repose sur un `workerId` fourni par le client

- Cause racine:
  - les routes runtime acceptent `workerId` depuis le body
  - le service ne verifie ensuite que `lockedBy === workerId`
  - aucun lien n'est fait avec l'identite authentifiee du caller
- Impact:
  - un worker peut usurper l'identifiant d'un autre et fermer ou detourner son run
- References:
  - [app-connectors/src/routes.ts](/Users/steven/Programmation/praedixa/app-connectors/src/routes.ts#L848)
  - [app-connectors/src/routes.ts](/Users/steven/Programmation/praedixa/app-connectors/src/routes.ts#L906)
  - [app-connectors/src/routes.ts](/Users/steven/Programmation/praedixa/app-connectors/src/routes.ts#L936)
  - [app-connectors/src/routes.ts](/Users/steven/Programmation/praedixa/app-connectors/src/routes.ts#L966)
  - [app-connectors/src/service.ts](/Users/steven/Programmation/praedixa/app-connectors/src/service.ts#L697)
  - [app-connectors/src/service.ts](/Users/steven/Programmation/praedixa/app-connectors/src/service.ts#L999)

### 7. Haute - un `sync_run` crashé peut rester bloque indefiniment

- Cause racine:
  - le lease est bien pose au claim
  - mais les reclaim ne couvrent pas les runs `running` expirés
  - les checks d'ownership ignorent l'expiration du lease
- Impact:
  - lock orphelin et sync bloquee jusqu'a intervention manuelle
- References:
  - [app-connectors/src/store.ts](/Users/steven/Programmation/praedixa/app-connectors/src/store.ts#L631)
  - [app-connectors/src/store.ts](/Users/steven/Programmation/praedixa/app-connectors/src/store.ts#L647)
  - [app-connectors/src/store.ts](/Users/steven/Programmation/praedixa/app-connectors/src/store.ts#L669)
  - [app-connectors/src/service.ts](/Users/steven/Programmation/praedixa/app-connectors/src/service.ts#L999)

### 8. Haute - les `raw_events` n'imposent pas reellement l'ownership du worker

- Cause racine:
  - `workerId` vient du body
  - `claimedBy` est ecrit au claim
  - mais les mutations `processed` / `failed` ne re-verifient pas l'ownership
- Impact:
  - un worker peut consommer ou ecraser les events d'un autre
- References:
  - [app-connectors/src/routes.ts](/Users/steven/Programmation/praedixa/app-connectors/src/routes.ts#L609)
  - [app-connectors/src/routes.ts](/Users/steven/Programmation/praedixa/app-connectors/src/routes.ts#L632)
  - [app-connectors/src/routes.ts](/Users/steven/Programmation/praedixa/app-connectors/src/routes.ts#L655)
  - [app-connectors/src/service.ts](/Users/steven/Programmation/praedixa/app-connectors/src/service.ts#L602)
  - [app-connectors/src/service.ts](/Users/steven/Programmation/praedixa/app-connectors/src/service.ts#L639)

### 9. Haute - la protection SSRF des connecteurs est contournable par DNS

- Cause racine:
  - la validation controle seulement la chaine de hostname et les IP litterales
  - aucune resolution DNS ni revalidation de l'IP finale
- Impact:
  - un hostname allowliste peut pointer vers une IP privee ou un service interne
- References:
  - [app-connectors/src/outbound-url.ts](/Users/steven/Programmation/praedixa/app-connectors/src/outbound-url.ts#L51)
  - [app-connectors/src/outbound-url.ts](/Users/steven/Programmation/praedixa/app-connectors/src/outbound-url.ts#L103)
  - [app-connectors/src/outbound-url.ts](/Users/steven/Programmation/praedixa/app-connectors/src/outbound-url.ts#L120)
  - [app-connectors/src/service.ts](/Users/steven/Programmation/praedixa/app-connectors/src/service.ts#L1253)
  - [app-connectors/src/service.ts](/Users/steven/Programmation/praedixa/app-connectors/src/service.ts#L1269)

### 10. Haute - la route messages admin est autorisee mais son layout parent bloque son montage

- Cause racine:
  - la route messages accepte `MESSAGES_ACCESS`
  - le layout parent fetch l'organisation via un endpoint qui requiert une autre famille de permissions
- Impact:
  - un admin avec seulement `admin:messages:read` obtient un `403` parent et ne peut jamais ouvrir la page messages
- References:
  - [app-admin/lib/auth/admin-route-policies.ts](/Users/steven/Programmation/praedixa/app-admin/lib/auth/admin-route-policies.ts#L283)
  - [app-admin/app/(admin)/clients/[orgId]/layout.tsx](</Users/steven/Programmation/praedixa/app-admin/app/(admin)/clients/[orgId]/layout.tsx#L37>)
  - [app-admin/lib/auth/admin-route-policies-api-core.ts](/Users/steven/Programmation/praedixa/app-admin/lib/auth/admin-route-policies-api-core.ts#L20)
  - [app-admin/lib/auth/admin-route-policies-api-core.ts](/Users/steven/Programmation/praedixa/app-admin/lib/auth/admin-route-policies-api-core.ts#L100)

### 11. Haute - la page Actions webapp lit l'historique sur le mauvais domaine API

- Cause racine:
  - les mutations ecrivent des `OperationalDecision`
  - l'onglet Historique lit des `DecisionSummary` via `/api/v1/decisions`
  - cette route est en plus non implementee actuellement
- Impact:
  - l'historique casse en `503` aujourd'hui, et resterait structurellement faux meme apres simple reroutage
- References:
  - [app-webapp/app/(app)/actions/use-actions-page-model.ts](</Users/steven/Programmation/praedixa/app-webapp/app/(app)/actions/use-actions-page-model.ts#L112>)
  - [app-webapp/app/(app)/actions/use-actions-page-model.ts](</Users/steven/Programmation/praedixa/app-webapp/app/(app)/actions/use-actions-page-model.ts#L123>)
  - [app-webapp/app/(app)/actions/history-section.tsx](</Users/steven/Programmation/praedixa/app-webapp/app/(app)/actions/history-section.tsx#L41>)
  - [packages/shared-types/src/domain/operational-decision.ts](/Users/steven/Programmation/praedixa/packages/shared-types/src/domain/operational-decision.ts#L8)
  - [app-api-ts/src/routes.ts](/Users/steven/Programmation/praedixa/app-api-ts/src/routes.ts#L1288)
  - [app-api-ts/src/routes.ts](/Users/steven/Programmation/praedixa/app-api-ts/src/routes.ts#L1664)

### 12. Haute - la page Messagerie webapp cible des routes backend explicitement stubbées et les poll en continu

- Cause racine:
  - le modele messages lit et ecrit sur `/api/v1/conversations...`
  - ces routes backend renvoient actuellement `liveFallbackFailure`
  - le polling continue malgre cet etat
- Impact:
  - erreurs 503 recurrentes et actions impossibles des l'ouverture de `/messages`
- References:
  - [app-webapp/app/(app)/messages/use-messages-page-model.ts](</Users/steven/Programmation/praedixa/app-webapp/app/(app)/messages/use-messages-page-model.ts#L90>)
  - [app-webapp/app/(app)/messages/use-messages-page-model.ts](</Users/steven/Programmation/praedixa/app-webapp/app/(app)/messages/use-messages-page-model.ts#L109>)
  - [app-webapp/app/(app)/messages/use-messages-page-model.ts](</Users/steven/Programmation/praedixa/app-webapp/app/(app)/messages/use-messages-page-model.ts#L125>)
  - [app-webapp/app/(app)/messages/use-messages-page-model.ts](</Users/steven/Programmation/praedixa/app-webapp/app/(app)/messages/use-messages-page-model.ts#L132>)
  - [app-api-ts/src/routes.ts](/Users/steven/Programmation/praedixa/app-api-ts/src/routes.ts#L824)
  - [app-api-ts/src/routes.ts](/Users/steven/Programmation/praedixa/app-api-ts/src/routes.ts#L1861)
  - [app-api-ts/src/routes.ts](/Users/steven/Programmation/praedixa/app-api-ts/src/routes.ts#L1867)
  - [app-api-ts/src/routes.ts](/Users/steven/Programmation/praedixa/app-api-ts/src/routes.ts#L1875)
  - [app-api-ts/src/routes.ts](/Users/steven/Programmation/praedixa/app-api-ts/src/routes.ts#L1883)

### 13. Haute - les pages webapp a polling conservent des donnees apres expiration de session

- Cause racine:
  - les polls `silent: true` avalent les `401`
  - aucun retour login ni purge de l'etat deja charge n'est declenche
- Impact:
  - affichage de donnees live stale apres invalidation de session
- References:
  - [app-webapp/app/api/v1/[...path]/route.ts](/Users/steven/Programmation/praedixa/app-webapp/app/api/v1/[...path]/route.ts#L276)
  - [app-webapp/app/api/v1/[...path]/route.ts](/Users/steven/Programmation/praedixa/app-webapp/app/api/v1/[...path]/route.ts#L306)
  - [packages/api-hooks/src/index.ts](/Users/steven/Programmation/praedixa/packages/api-hooks/src/index.ts#L228)
  - [packages/api-hooks/src/index.ts](/Users/steven/Programmation/praedixa/packages/api-hooks/src/index.ts#L286)
  - [app-webapp/hooks/use-decision-config.ts](/Users/steven/Programmation/praedixa/app-webapp/hooks/use-decision-config.ts#L35)
  - [app-webapp/app/(app)/messages/use-messages-page-model.ts](</Users/steven/Programmation/praedixa/app-webapp/app/(app)/messages/use-messages-page-model.ts#L90>)

### 14. Haute - `hr_manager` est scope site au parse JWT mais org-wide au moment des routes live

- Cause racine:
  - le parseur auth exige un `site_id` pour `hr_manager`
  - mais l'autorisation live le classe ensuite parmi les roles org-wide
- Impact:
  - un `hr_manager` scoped peut lire/agire hors de son site
- References:
  - [app-api-ts/src/auth.ts](/Users/steven/Programmation/praedixa/app-api-ts/src/auth.ts#L116)
  - [app-api-ts/src/routes.ts](/Users/steven/Programmation/praedixa/app-api-ts/src/routes.ts#L93)
  - [app-api-ts/src/routes.ts](/Users/steven/Programmation/praedixa/app-api-ts/src/routes.ts#L913)

### 15. Haute - les surfaces runtime `decision_contract_*` ne sont pas compatibles avec la migration livree

- Cause racine:
  - les tables creees par migration n'ont pas la forme que le store runtime lit/ecrit
  - `CREATE TABLE IF NOT EXISTS` ne corrige jamais une table deja presente avec le mauvais schema
- Impact:
  - `list/save/fork/publish` peuvent echouer immediatement sur colonnes manquantes ou `UPSERT` invalide
- References:
  - [app-api-ts/migrations/003_decision_contract_runtime.sql](/Users/steven/Programmation/praedixa/app-api-ts/migrations/003_decision_contract_runtime.sql#L1)
  - [app-api-ts/src/services/decision-contract-runtime-store.ts](/Users/steven/Programmation/praedixa/app-api-ts/src/services/decision-contract-runtime-store.ts#L44)
  - [app-api-ts/src/services/decision-contract-runtime-store.ts](/Users/steven/Programmation/praedixa/app-api-ts/src/services/decision-contract-runtime-store.ts#L198)
  - [app-api-ts/src/services/decision-contract-runtime-store.ts](/Users/steven/Programmation/praedixa/app-api-ts/src/services/decision-contract-runtime-store.ts#L323)

### 16. Haute - le parser auth `app-api-ts` accepte des `sub` / `organization_id` arbitraires que le runtime persistant refuse ensuite

- Cause racine:
  - le parseur auth ne fait qu'un `trim()`
  - plus bas, de nombreuses surfaces exigent de vrais UUIDs
- Impact:
  - tokens auth valides mais runtime/mutations qui cassent ensuite en `400/503`
- References:
  - [app-api-ts/src/auth.ts](/Users/steven/Programmation/praedixa/app-api-ts/src/auth.ts#L82)
  - [app-api-ts/src/auth.ts](/Users/steven/Programmation/praedixa/app-api-ts/src/auth.ts#L233)
  - [app-api-ts/src/services/persistence.ts](/Users/steven/Programmation/praedixa/app-api-ts/src/services/persistence.ts#L33)
  - [app-api-ts/src/services/operational-decisions.ts](/Users/steven/Programmation/praedixa/app-api-ts/src/services/operational-decisions.ts#L579)
  - [app-api-ts/src/services/admin-backoffice.ts](/Users/steven/Programmation/praedixa/app-api-ts/src/services/admin-backoffice.ts#L521)
  - [app-api-ts/src/services/admin-backoffice.ts](/Users/steven/Programmation/praedixa/app-api-ts/src/services/admin-backoffice.ts#L2234)

### 17. Haute - la release accepte un gate report rouge tant qu'il est signe et hashe

- Cause racine:
  - le manifest/deploy ne verifie que l'existence, le hash et la signature du report
  - aucune verification semantique de `summary.status` ou `blocking_failed_checks`
- Impact:
  - une release peut etre deployee malgre un report bloquant en echec
- References:
  - [scripts/scw/scw-release-manifest-create.sh](/Users/steven/Programmation/praedixa/scripts/scw/scw-release-manifest-create.sh#L68)
  - [scripts/release-manifest-verify.sh](/Users/steven/Programmation/praedixa/scripts/release-manifest-verify.sh#L96)
  - [scripts/scw/scw-release-deploy.sh](/Users/steven/Programmation/praedixa/scripts/scw/scw-release-deploy.sh#L60)

### 18. Haute - le deploiement release peut degrader d'un digest immuable vers un tag mutable

- Cause racine:
  - en cas d'echec sur `image@sha256:...`, le script retente avec le tag seul
- Impact:
  - l'image finalement deployee peut differer de celle attestee par le manifest signe
- References:
  - [scripts/scw/scw-release-deploy.sh](/Users/steven/Programmation/praedixa/scripts/scw/scw-release-deploy.sh#L127)

### 19. Haute - le script de config runtime Scaleway exfiltre potentiellement token et payload vers une URL arbitraire

- Cause racine:
  - `SCW_API_URL` est pris tel quel sans validation de schema/host
  - le script y envoie ensuite `X-Auth-Token` et tout le payload de config
- Impact:
  - un environnement shell compromis peut exfiltrer secret + config vers un tiers
- References:
  - [scripts/scw/scw-apply-container-config.sh](/Users/steven/Programmation/praedixa/scripts/scw/scw-apply-container-config.sh#L97)
  - [scripts/scw/scw-apply-container-config.sh](/Users/steven/Programmation/praedixa/scripts/scw/scw-apply-container-config.sh#L151)

### 20. Moyenne - le hook partage `useApiMutation` garde `data/error` quand l'URL change

- Cause racine:
  - l'URL est remplacee dans `urlRef`
  - aucun reset de l'etat n'est fait sur changement de cible
- Impact:
  - etat fantome reutilise sur une autre ressource
- References:
  - [packages/api-hooks/src/index.ts](/Users/steven/Programmation/praedixa/packages/api-hooks/src/index.ts#L439)
  - [app-admin/app/(admin)/clients/[orgId]/rapports/rapports-page-model.tsx](</Users/steven/Programmation/praedixa/app-admin/app/(admin)/clients/[orgId]/rapports/rapports-page-model.tsx#L81>)
  - [app-webapp/app/(app)/messages/use-messages-page-model.ts](</Users/steven/Programmation/praedixa/app-webapp/app/(app)/messages/use-messages-page-model.ts#L127>)

### 21. Moyenne - le cache de session admin ignore `minTtlSeconds`

- Cause racine:
  - le getter de cache jette explicitement la valeur de TTL
- Impact:
  - impossible de forcer une session plus fraiche si une session cachee existe deja
- References:
  - [app-admin/lib/auth/client.ts](/Users/steven/Programmation/praedixa/app-admin/lib/auth/client.ts#L52)
  - [app-admin/lib/auth/client.ts](/Users/steven/Programmation/praedixa/app-admin/lib/auth/client.ts#L104)

### 22. Moyenne - la page `vue-client` admin lance un fetch billing interdit pour une route qui n'exige que `admin:org:read`

- Cause racine:
  - la route est accessible avec `ORG_READ`
  - le model fetch `orgBilling()` sans gating par `BILLING_READ`
- Impact:
  - `403` garantis et degradation avoidable sur une visite pourtant autorisee
- References:
  - [app-admin/lib/auth/admin-route-policies.ts](/Users/steven/Programmation/praedixa/app-admin/lib/auth/admin-route-policies.ts#L135)
  - [app-admin/app/(admin)/clients/[orgId]/vue-client/vue-client-page-model.tsx](</Users/steven/Programmation/praedixa/app-admin/app/(admin)/clients/[orgId]/vue-client/vue-client-page-model.tsx#L66>)
  - [app-admin/lib/auth/admin-route-policies-api-core.ts](/Users/steven/Programmation/praedixa/app-admin/lib/auth/admin-route-policies-api-core.ts#L172)

### 23. Moyenne - la page messages admin maintient deux sources de verite pour les conversations

- Cause racine:
  - le parent et le panneau gauche chargent des listes differentes avec des strategies differentes
- Impact:
  - conversation visible a gauche mais introuvable a droite, ou detail stale
- References:
  - [app-admin/app/(admin)/clients/[orgId]/messages/page.tsx](</Users/steven/Programmation/praedixa/app-admin/app/(admin)/clients/[orgId]/messages/page.tsx#L22>)
  - [app-admin/app/(admin)/clients/[orgId]/messages/page.tsx](</Users/steven/Programmation/praedixa/app-admin/app/(admin)/clients/[orgId]/messages/page.tsx#L30>)
  - [app-admin/components/chat/conversation-list.tsx](/Users/steven/Programmation/praedixa/app-admin/components/chat/conversation-list.tsx#L79)

### 24. Moyenne - l'onglet par defaut de `/parametres` admin fige une decision prise avant l'hydratation des droits

- Cause racine:
  - l'etat initial depend d'un `useCurrentUser()` asynchrone
  - l'onglet n'est jamais resynchronise apres arrivee des permissions
- Impact:
  - affichage initial sur la mauvaise section, avec ecran de permission trompeur
- References:
  - [app-admin/app/(admin)/parametres/parametres-page-model.tsx](</Users/steven/Programmation/praedixa/app-admin/app/(admin)/parametres/parametres-page-model.tsx#L53>)
  - [app-admin/app/(admin)/parametres/parametres-page-model.tsx](</Users/steven/Programmation/praedixa/app-admin/app/(admin)/parametres/parametres-page-model.tsx#L67>)
  - [app-admin/lib/auth/client.ts](/Users/steven/Programmation/praedixa/app-admin/lib/auth/client.ts#L142)

### 25. Moyenne - le header webapp peut produire un hydration mismatch sur la date

- Cause racine:
  - `new Date()` est calcule pendant le render d'un composant client rendu cote serveur puis rehydrate cote client
- Impact:
  - mismatch deterministe si l'heure/jour/fuseau differe entre SSR et navigateur
- References:
  - [app-webapp/components/app-shell.tsx](/Users/steven/Programmation/praedixa/app-webapp/components/app-shell.tsx#L35)
  - [app-webapp/components/app-shell-model.tsx](/Users/steven/Programmation/praedixa/app-webapp/components/app-shell-model.tsx#L29)
  - [app-webapp/components/app-shell-topbar.tsx](/Users/steven/Programmation/praedixa/app-webapp/components/app-shell-topbar.tsx#L106)

### 26. Moyenne - la persistance de langue webapp est exposee alors que l'endpoint backend est stubbe

- Cause racine:
  - `I18nProvider` fait `GET/PATCH /api/v1/users/me/preferences`
  - ces routes sont encore branchees sur `liveFallbackFailure`
- Impact:
  - fonctionnalite structurellement indisponible malgre une UI visible
- References:
  - [app-webapp/lib/i18n/provider.tsx](/Users/steven/Programmation/praedixa/app-webapp/lib/i18n/provider.tsx#L66)
  - [app-webapp/lib/i18n/provider.tsx](/Users/steven/Programmation/praedixa/app-webapp/lib/i18n/provider.tsx#L113)
  - [app-webapp/app/(app)/parametres/page.tsx](</Users/steven/Programmation/praedixa/app-webapp/app/(app)/parametres/page.tsx#L100>)
  - [app-api-ts/src/routes.ts](/Users/steven/Programmation/praedixa/app-api-ts/src/routes.ts#L1818)
  - [app-api-ts/src/routes.ts](/Users/steven/Programmation/praedixa/app-api-ts/src/routes.ts#L1821)

### 27. Moyenne - le parser `Bearer` de `app-api-ts` est sensible a la casse

- Cause racine:
  - seul `Bearer` exact est accepte
- Impact:
  - `bearer` ou `BEARER` sont rejetes malgre un jeton valide
- References:
  - [app-api-ts/src/auth.ts](/Users/steven/Programmation/praedixa/app-api-ts/src/auth.ts#L213)

### 28. Moyenne - le smoke canonique API ne suit plus le contrat de routes versionnees

- Cause racine:
  - le smoke teste `/health`
  - le runtime TS expose `/api/v1/health`
- Impact:
  - faux negatif de deploy sain ou faux sentiment de couverture par un alias legacy
- References:
  - [scripts/smoke-test-production.sh](/Users/steven/Programmation/praedixa/scripts/smoke-test-production.sh#L64)
  - [scripts/scw/scw-post-deploy-smoke.sh](/Users/steven/Programmation/praedixa/scripts/scw/scw-post-deploy-smoke.sh#L856)
  - [app-api-ts/src/routes.ts](/Users/steven/Programmation/praedixa/app-api-ts/src/routes.ts#L975)

### 29. Haute - l'admin n'echoue pas en fail-close sur l'origine OIDC canonique en production

- Cause racine:
  - si `AUTH_APP_ORIGIN` manque, l'admin reutilise encore `request.nextUrl.origin`
  - ce fallback est accepte en prod tant qu'il est en `https://`
  - le webapp, lui, echoue ferme sans fallback equivalent
- Impact:
  - redirects OIDC et controles same-origin derives d'un host entrant non canonique
- References:
  - [app-admin/lib/auth/oidc.ts](/Users/steven/Programmation/praedixa/app-admin/lib/auth/oidc.ts#L384)
  - [app-admin/app/auth/login/route.ts](/Users/steven/Programmation/praedixa/app-admin/app/auth/login/route.ts#L56)
  - [app-admin/app/auth/callback/route.ts](/Users/steven/Programmation/praedixa/app-admin/app/auth/callback/route.ts#L72)
  - [app-admin/app/auth/session/route.ts](/Users/steven/Programmation/praedixa/app-admin/app/auth/session/route.ts#L121)
  - [app-webapp/lib/auth/origin.ts](/Users/steven/Programmation/praedixa/app-webapp/lib/auth/origin.ts#L149)

### 30. Haute - un JWT webapp malforme peut faire throw au lieu d'etre traite comme invalide

- Cause racine:
  - `decodeJwtPayload()` appelle `base64UrlDecode()` sans `try/catch`
  - `atob()` peut lever sur un segment base64url corrompu
  - les appelants s'attendent pourtant a une API nullable et non a une exception
- Impact:
  - 500/plantage middleware ou resolution de session sur cookie/token malforme
- References:
  - [app-webapp/lib/auth/oidc/jwt.ts](/Users/steven/Programmation/praedixa/app-webapp/lib/auth/oidc/jwt.ts#L35)
  - [app-webapp/lib/auth/oidc/jwt.ts](/Users/steven/Programmation/praedixa/app-webapp/lib/auth/oidc/jwt.ts#L78)
  - [app-webapp/lib/auth/request-session.ts](/Users/steven/Programmation/praedixa/app-webapp/lib/auth/request-session.ts#L93)
  - [app-webapp/lib/auth/middleware.ts](/Users/steven/Programmation/praedixa/app-webapp/lib/auth/middleware.ts#L73)
  - [app-admin/lib/auth/oidc.ts](/Users/steven/Programmation/praedixa/app-admin/lib/auth/oidc.ts#L156)

### 31. Moyenne - les scripts de signature exposent la signature HMAC dans les arguments de processus

- Cause racine:
  - la signature est calculee correctement
  - mais elle est ensuite injectee dans `jq --arg signature ...`
  - la valeur se retrouve donc visible dans `argv`
- Impact:
  - fuite locale de secret/artefact signe via inspection de processus
- References:
  - [scripts/release-manifest-sign.sh](/Users/steven/Programmation/praedixa/scripts/release-manifest-sign.sh#L57)
  - [scripts/gates/gate-report-sign.sh](/Users/steven/Programmation/praedixa/scripts/gates/gate-report-sign.sh#L54)

### 32. Haute - le gate exhaustif manuel peut rester vert alors que build, tests et E2E ont echoue

- Cause racine:
  - de nombreux checks critiques de build, test et E2E sont classes `low`
  - le resume ne bloque que sur `medium/high/critical`
  - la verification du gate accepte explicitement un report `fail` si seuls des checks `low` ont echoue
- Impact:
  - release ou validation manuelle possible sur un repo objectivement casse
- References:
  - [scripts/gates/gate-exhaustive-local.sh](/Users/steven/Programmation/praedixa/scripts/gates/gate-exhaustive-local.sh#L253)
  - [scripts/gates/gate-exhaustive-local.sh](/Users/steven/Programmation/praedixa/scripts/gates/gate-exhaustive-local.sh#L309)
  - [scripts/gates/verify-gate-report.sh](/Users/steven/Programmation/praedixa/scripts/gates/verify-gate-report.sh#L115)

### 33. Haute - `app-connectors` peut laisser un `sync_run` zombie en `running` sur echec d'ingestion webhook

- Cause racine:
  - `ingestEvents()` cree d'abord un `sync_run` en `running`
  - les validations et ecritures payload viennent ensuite
  - aucun `catch/finally` ne repasse le run en `failed` si une exception survient entre les deux
- Impact:
  - run zombie, idempotence de retry faussee, et perception trompeuse d'un run en cours alors que l'ingestion a plante
- References:
  - [app-connectors/src/service.ts](/Users/steven/Programmation/praedixa/app-connectors/src/service.ts#L2149)
  - [app-connectors/src/service.ts](/Users/steven/Programmation/praedixa/app-connectors/src/service.ts#L2170)
  - [app-connectors/src/service.ts](/Users/steven/Programmation/praedixa/app-connectors/src/service.ts#L2196)
  - [app-connectors/src/store.ts](/Users/steven/Programmation/praedixa/app-connectors/src/store.ts#L469)

### 34. Haute - un doublon `raw_event` peut ecraser le payload brut stocke et casser la coherence de replay

- Cause racine:
  - le blob payload est ecrit avant la deduplication `createRawEvent()`
  - la deduplication ne depend que de `eventId`
  - le payload store utilise lui aussi `eventId` comme nom de fichier
- Impact:
  - un replay avec le meme `eventId` mais un payload different remplace le blob disque tout en conservant l'ancien `raw_event` et son ancien `payloadSha256`
- References:
  - [app-connectors/src/service.ts](/Users/steven/Programmation/praedixa/app-connectors/src/service.ts#L2102)
  - [app-connectors/src/service.ts](/Users/steven/Programmation/praedixa/app-connectors/src/service.ts#L2134)
  - [app-connectors/src/store.ts](/Users/steven/Programmation/praedixa/app-connectors/src/store.ts#L320)
  - [app-connectors/src/payload-store.ts](/Users/steven/Programmation/praedixa/app-connectors/src/payload-store.ts#L31)
  - [app-connectors/src/service.ts](/Users/steven/Programmation/praedixa/app-connectors/src/service.ts#L966)

### 35. Haute - le preflight Scaleway peut passer alors que les hosts publics prod ne sont ni bindes ni resolus

- Cause racine:
  - les checks de binding et de resolution publique des hosts prod sont classes `soft`
  - le script n'echoue qu'en presence de `FAIL_COUNT`, pas de simples warnings
- Impact:
  - deploiement possible alors que `app/admin/api.praedixa.com` ou les domaines publics restent inaccessibles depuis Internet
- References:
  - [scripts/scw/scw-preflight-deploy.sh](/Users/steven/Programmation/praedixa/scripts/scw/scw-preflight-deploy.sh#L724)
  - [scripts/scw/scw-preflight-deploy.sh](/Users/steven/Programmation/praedixa/scripts/scw/scw-preflight-deploy.sh#L756)
  - [scripts/scw/scw-preflight-deploy.sh](/Users/steven/Programmation/praedixa/scripts/scw/scw-preflight-deploy.sh#L764)

### 36. Haute - le smoke post-deploy frontend ne prouve jamais qu'une vraie session authentifiee fonctionne

- Cause racine:
  - le smoke session appelle seulement `/auth/session` sans cookie jar ni login prealable
  - il attend explicitement `401 unauthorized` en same-origin et `403` en cross-origin
  - aucune verification n'exerce la chaine reelle `login -> cookies -> refresh -> session OK`
- Impact:
  - un runtime auth casse pour les utilisateurs connectes peut quand meme etre declare "Frontend session smoke passed"
- References:
  - [scripts/scw/scw-post-deploy-smoke.sh](/Users/steven/Programmation/praedixa/scripts/scw/scw-post-deploy-smoke.sh#L708)
  - [scripts/scw/scw-post-deploy-smoke.sh](/Users/steven/Programmation/praedixa/scripts/scw/scw-post-deploy-smoke.sh#L725)
  - [scripts/scw/scw-post-deploy-smoke.sh](/Users/steven/Programmation/praedixa/scripts/scw/scw-post-deploy-smoke.sh#L821)
  - [scripts/scw/scw-post-deploy-smoke.sh](/Users/steven/Programmation/praedixa/scripts/scw/scw-post-deploy-smoke.sh#L876)

### 37. Haute - une session OAuth pendante peut survivre a une autorisation par credentials et ecraser ensuite le secret actif

- Cause racine:
  - `startAuthorization()` persiste une `AuthorizationSession`
  - `completeOAuthCodeAuthorization()` supprime bien cette session
  - `completeOAuthCredentialAuthorization()` marque la connexion `authorized` mais ne supprime jamais la session pendante
- Impact:
  - un vieux callback OAuth encore valide peut remplacer plus tard les credentials actifs par un autre token/provider account
- References:
  - [app-connectors/src/service.ts](/Users/steven/Programmation/praedixa/app-connectors/src/service.ts#L2655)
  - [app-connectors/src/store.ts](/Users/steven/Programmation/praedixa/app-connectors/src/store.ts#L183)
  - [app-connectors/src/service.ts](/Users/steven/Programmation/praedixa/app-connectors/src/service.ts#L2758)
  - [app-connectors/src/service.ts](/Users/steven/Programmation/praedixa/app-connectors/src/service.ts#L2788)
  - [app-connectors/src/service.ts](/Users/steven/Programmation/praedixa/app-connectors/src/service.ts#L2814)

## Notes

- Certains findings viennent d'une verification locale croisee, d'autres ont ete identifies par sous-agents puis retenus parce qu'ils pointent vers un scenario de casse concret.
- Le document doit rester evolutif: tant que l'audit continue, de nouveaux findings peuvent y etre ajoutes.
