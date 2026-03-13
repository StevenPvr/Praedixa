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
- `admin-integrations.ts` : pont vers le runtime `app-connectors`.
- `types.ts` : types runtime partages entre config, auth et server, dont le contexte telemetry propage aux handlers.

## Comment ca s'integre avec le reste

- `app-webapp` appelle surtout la surface `/api/v1/live/*` et `/api/v1/*`.
- `app-admin` appelle la surface `/api/v1/admin/*`.
- `app-connectors` est appele pour les flux integrations admin.
- `app-api/` alimente les tables et jeux de donnees consommes ici, mais ne sert pas les requetes front directement.
- `contracts/openapi/public.yaml` porte le contrat public non-admin versionne.
- `packages/shared-types/src/api/public-contract.ts` porte le catalogue type partage des operations publiques et la politique de compatibilite ascendante.
- `packages/telemetry` porte l'enveloppe runtime commune des logs structures pour `request_id`, `trace_id` et les champs de correlation associes.

## Familles de routes

Routes live / produit:

- dashboard, forecasts, canonical, proof, alerts, scenarios, operational decisions, decision config, conversations, support thread.

Routes admin:

- organisations, utilisateurs, billing, onboarding, monitoring, audit log, contact requests, canonical/datasets, proof packs, decision config, integrations.

## Auth et autorisation

- JWT OIDC verifies dans `auth.ts`.
- `auth.ts` ne lit plus que le contrat top-level canonique `sub`, `email`, `role`, `organization_id`, `site_id`, `permissions`.
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

## Lecture conseillee pour un nouvel arrivant

1. `index.ts`
2. `config.ts`
3. `server.ts`
4. `auth.ts`
5. `routes.ts`
6. `services/README.md`
7. `__tests__/README.md`
