# `src/` - Runtime applicatif API TS

## Role

Ce dossier contient tout le runtime Node de l'API exposee aux apps web Praedixa.

## Fichiers cle

- `index.ts` : bootstrap du process.
- `config.ts` : parsing/validation stricte des variables d'environnement.
- `server.ts` : serveur HTTP, CORS, auth, request id / trace id, reponses et middleware transverses.
- `auth.ts` : verification JWT, roles et contexte utilisateur.
- `router.ts` : matching de routes minimaliste et typage des handlers.
- `response.ts` : helpers `success` / `failure`.
- `routes.ts` : table de routes produit + admin.
- `routes/` : slices de routes admin volumineuses extraites de `routes.ts` pour garder les handlers reviewables par domaine.
- `admin-integrations.ts` : pont vers le runtime `app-connectors`.
- `types.ts` : types runtime partages entre config, auth et server, dont le contexte telemetry propage aux handlers.

## Comment ca s'integre avec le reste

- `app-webapp` appelle surtout la surface `/api/v1/live/*` et `/api/v1/*`.
- `app-admin` appelle la surface `/api/v1/admin/*`.
- `app-connectors` est appele pour les flux integrations admin.
- `app-api/` alimente les tables et jeux de donnees consommes ici, mais ne sert pas les requetes front directement.
- Le lifecycle des comptes client/backoffice passe maintenant ici pour la creation admin: l'API TS provisionne l'identite Keycloak, puis ecrit `users.auth_user_id` sans placeholder `pending-*`.
- `contracts/openapi/public.yaml` porte le contrat public non-admin versionne.
- `packages/shared-types/src/api/public-contract.ts` porte le catalogue type partage des operations publiques et la politique de compatibilite ascendante.
- `packages/telemetry` porte l'enveloppe runtime commune des logs structures pour `request_id`, `trace_id` et les champs de correlation associes.

## Familles de routes

Routes live / produit:

- dashboard, forecasts, canonical, proof, alerts, scenarios, operational decisions, decision config, conversations, support thread.

Routes admin:

- organisations, utilisateurs, billing, onboarding, monitoring, audit log, contact requests, canonical/datasets, proof packs, decision config, integrations.
- gouvernance `DecisionContract` (`decision-contract-templates`, `instantiate-preview`, `decision-compatibility/evaluate`) et runtime org-scoped du Contract Studio (`decision-contracts`, `transition`, `fork`, `rollback-candidates`, `rollback`).

## Auth et autorisation

- JWT OIDC verifies dans `auth.ts`.
- `auth.ts` ne lit plus que le contrat top-level canonique `sub`, `email`, `role`, `organization_id`, `site_id`, `permissions`.
- Pour garder le contrat admin stable, `super_admin` herite de la taxonomie de permissions admin versionnee et d'un `organization_id` synthetique quand le token IdP n'en porte pas encore.
- Aucun fallback legacy n'est accepte depuis `preferred_username`, `org_id`, `organizationId`, `siteId`, `site_ids`, `roles`, `groups`, `realm_access`, `resource_access` ou `app_metadata`.
- Les roles doivent utiliser les valeurs canoniques exactes (`super_admin`, `org_admin`, `hr_manager`, `manager`, `employee`, `viewer`).
- Rattachement org/site, roles et permissions explicites propagés au `RouteContext`.
- `RouteContext` transporte aussi un contexte `telemetry` pret a enrichir si un handler rattache ensuite un `contract_version`, un `run_id` ou un `action_id`.
- Guards admin appliques sur la surface `/api/v1/admin/*`.
- Les appels sensibles restent couples a la persistance PostgreSQL quand disponible.
- Un `site_id` demande par query ne doit jamais elargir le scope: la persistance doit le refuser s'il n'appartient pas a `accessibleSiteIds`.
- Les lectures live persistantes reconstruisent toujours un `SiteAccessScope` complet avant la requete SQL, y compris pour `/api/v1/live/forecasts`.

## Appels internes sensibles

- `admin-integrations.ts` envoie un bearer token vers `app-connectors`.
- `services/keycloak-admin-identity.ts` appelle aussi l'admin REST Keycloak pour creer un compte, synchroniser les claims canoniques et envoyer l'email `UPDATE_PASSWORD` lors d'une invitation backoffice.
- `config.ts` bloque donc les `CONNECTORS_RUNTIME_URL` avec credentials, query ou fragment.
- Hors developpement, le runtime connecteurs doit etre en `https` et son host doit appartenir a `CONNECTORS_RUNTIME_ALLOWED_HOSTS`.

## Persistance et contrat fail-close

- `src/services/persistence.ts` ouvre le pool Postgres et protege les usages SQL.
- Les routes reelles du runtime principal n'ont plus de chemin demo/stub implicite.
- Quand la DB n'est pas disponible, qu'un scope n'est pas eligible, ou qu'une implementation persistante manque encore, le handler doit echouer explicitement.
- La frontiere a garder nette est donc: route -> service -> persistance, avec erreur explicite si la persistance requise n'est pas disponible.
- `DEMO_MODE` reste un garde-fou de configuration de developpement; il ne doit plus reactiver de payload mock sur les surfaces produit/admin reelles.
- Toute evolution publique doit rester additive dans le major courant, ou passer par une deprecation explicite (`Deprecation` + `Sunset`) avant retrait.
- `live scenarios`, `decision workspace` et `operational decisions` sont maintenant branches sur les services persistants dedies; le runtime public ne doit plus diverger du contrat webapp sur ces flux.
- La creation d'une `operational_decision` initialise maintenant la persistance DecisionOps read-model (`decision_approvals`, `action_dispatches`, `decision_ledger_entries`) dans la meme transaction.
- Les endpoints admin read-only `approval-inbox`, `action-dispatches/:actionId` et `ledgers/:ledgerId` lisent maintenant la persistance DecisionOps reelle; ils ne tombent plus sur un 404 implicite ni sur un faux succes.
- L'inbox d'approbation expose aussi une mutation persistante `POST /api/v1/admin/organizations/:orgId/approvals/:approvalId/decision`; elle met a jour l'approbation, annule les approbations soeurs encore ouvertes en cas de rejet, et synchronise l'etat interne action/ledger sans simuler un dispatch externe.
- Le detail de dispatch expose aussi une mutation persistante `POST /api/v1/admin/organizations/:orgId/action-dispatches/:actionId/decision`; elle fait progresser le lifecycle `pending/dispatched/failed/retried/canceled/acknowledged` et resynchronise le ledger le plus recent de la recommendation.
- Le detail de dispatch expose aussi `POST /api/v1/admin/organizations/:orgId/action-dispatches/:actionId/fallback`; elle prepare ou execute explicitement le fallback humain persistant quand le write-back live ne peut pas aller au bout.
- Les mutations de dispatch et de fallback ne se contentent plus de `admin:org:write`: elles verifient aussi que le contrat autorise le write-back et que les permission keys de destination presentes dans `ActionDispatch.permissionsContext` sont bien dans le jeton admin courant.
- Le detail ledger expose aussi une mutation persistante `POST /api/v1/admin/organizations/:orgId/ledgers/:ledgerId/decision`; elle permet la cloture, le recalcul revisionne et la validation finance d'un ledger persistant.
- L'initialisation persistante du read-model DecisionOps ajoute maintenant un garde-fou d'idempotence sur `action_dispatches` pour bloquer les doublons silencieux par `organization_id + idempotency_key`.
- La gouvernance `DecisionContract` expose maintenant un catalogue admin des templates par pack, une previsualisation d'instanciation non persistante et une evaluation explicite de compatibilite `contract <-> graph` sans dependre de la base.
- Le runtime `DecisionContract` est maintenant persistant et distinct du simple `decision-config`: le Contract Studio org-scoped permet creation de draft depuis template, lecture liste/detail, transitions de lifecycle, fork, rollback candidates et rollback en nouveau draft versionne, avec audit dedie.
- Les slices de routes admin DecisionOps et DecisionContract propagent aussi maintenant les vraies `PersistenceError` (`PERSISTENCE_UNAVAILABLE`, `statusCode`, `details`) au lieu de les ecraser en `400`, afin que les surfaces admin restent strictement fail-close quand la persistance manque.
- Le `Contract Studio` ne doit plus accepter un body `{}` deguisant une mutation de save/create: les unions de schema route exigent des objets reels sur la branche `contract`, pour eviter qu'un `z.custom()` trop permissif avale la mauvaise forme de payload.

## Lecture conseillee pour un nouvel arrivant

1. `index.ts`
2. `config.ts`
3. `server.ts`
4. `auth.ts`
5. `routes.ts`
6. `services/README.md`
7. `__tests__/README.md`
