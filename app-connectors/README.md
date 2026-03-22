# app-connectors

Runtime TypeScript dedie au control plane des integrations Praedixa.

Lire aussi:

- `docs/cto/07-connecteurs-et-sync-runs.md`
- `docs/cto/15-capabilities-et-securite-connecteurs.md`
- `docs/cto/22-auth-modes-connecteurs-et-audit-integration.md`
- `docs/architecture/adr/ADR-004-source-de-verite-runtime-integrations.md`

## Objectif

- Exposer un catalogue de connecteurs et gerer les connexions par organisation.
- Gerer l'onboarding OAuth/API key/session/service account des fournisseurs.
- Delivrer des credentials d'ingestion push et stocker les evenements bruts.
- Servir de pont securise entre `app-api-ts` (pivot HTTP/admin) et `app-api` (data plane Python).

## Architecture rapide

- `src/index.ts` : bootstrap process.
- `src/server.ts` : serveur HTTP, CORS, auth service-token, IP, rate limiting et JSON handling.
- `src/routes.ts` : validation Zod et handlers HTTP.
- `src/service.ts` : logique metier principale du control plane connecteurs.
- `src/activation-readiness.ts` : verdict standardise des prerequis d'activation sans intervention dev.
- `src/store.ts` : store memoire.
- `src/persistent-store.ts` : extension Postgres du store.
- `src/payload-store.ts` : stockage local des payloads bruts.
- `src/security.ts` : sealing de secrets, HMAC, PKCE, redaction.
- `src/oauth.ts` : helpers OAuth.

## Sous-docs

- [src/README.md](./src/README.md)
- [src/**tests**/README.md](./src/__tests__/README.md)

## Surface HTTP

Catalogue et connexions:

- `GET /v1/connectors/catalog`
- `GET /v1/organizations/:orgId/connections`
- `GET /v1/organizations/:orgId/connections/:connectionId`
- `POST /v1/organizations/:orgId/connections`
- `PATCH /v1/organizations/:orgId/connections/:connectionId`

Sync, audit, runs:

- `GET /v1/organizations/:orgId/sync-runs`
- `GET /v1/organizations/:orgId/sync-runs/:runId`
- `GET /v1/organizations/:orgId/audit-events`
- `POST /v1/runtime/sync-runs/claim`
- `POST /v1/organizations/:orgId/sync-runs/:runId/execution-plan`
- `POST /v1/organizations/:orgId/sync-runs/:runId/sync-state`
- `POST /v1/organizations/:orgId/sync-runs/:runId/completed`
- `POST /v1/organizations/:orgId/sync-runs/:runId/failed`
- `POST /v1/runtime/organizations/:orgId/connections/:connectionId/access-context`
- `POST /v1/runtime/organizations/:orgId/connections/:connectionId/provider-events`

Le reste de la surface d'onboarding/integration vit aussi dans `src/routes.ts`: authorization start/complete, test, sync, ingest credentials, endpoints d'ingestion push et worker APIs.

Regle de lecture:

- `app-connectors` est la verite operable immediate du control plane integrations.
- La source de verite durable cible reste `integration_*` cote modele Python / Alembic.
- Les secrets scelles et payloads bruts restent dans des stockages specialises; ils ne doivent pas etre confondus avec les metadonnees relationnelles durables.

## Configuration runtime

Variables importantes:

- `PORT`, `HOST`, `NODE_ENV`
- `DATABASE_URL`
- `CONNECTORS_PUBLIC_BASE_URL`
- `CONNECTORS_OBJECT_STORE_ROOT`
- `CONNECTORS_ALLOWED_OUTBOUND_HOSTS`
- `CONNECTORS_ALLOWED_SANDBOX_OUTBOUND_HOSTS`
- `CONNECTORS_SERVICE_TOKENS`
- `CONNECTORS_SECRET_SEALING_KEY`
- `CORS_ORIGINS`
- `TRUST_PROXY`

Exemple `CONNECTORS_SERVICE_TOKENS`:

```json
[
  {
    "name": "webapp",
    "token": "replace-with-32-char-min-token",
    "allowedOrgs": ["org-1", "org-2"],
    "capabilities": ["connections:read", "connections:write", "oauth:write"]
  }
]
```

Pour un token interne dedie au control plane admin/API qui doit pouvoir piloter toutes les organisations, utiliser explicitement le scope `allowedOrgs=["global:all-orgs"]` plutot qu'une enumeration impossible a maintenir manuellement.

Notes de securite:

- hors developpement, `DATABASE_URL`, `CONNECTORS_PUBLIC_BASE_URL`, `CONNECTORS_OBJECT_STORE_ROOT`, `CONNECTORS_ALLOWED_OUTBOUND_HOSTS` et `CONNECTORS_SECRET_SEALING_KEY` sont obligatoires; le runtime ne retombe plus sur des modes memoire/tmp implicites.
- les variables legacy `CONNECTORS_INTERNAL_TOKEN`, `CONNECTORS_ALLOWED_ORGS` et `CONNECTORS_ALLOWED_CAPABILITIES` sont refusees; seul `CONNECTORS_SERVICE_TOKENS` est accepte.
- `CONNECTORS_ALLOWED_OUTBOUND_HOSTS` doit contenir les hosts approuves pour tous les appels sortants du runtime (OAuth, probes de connexion, APIs partenaires).
- `CONNECTORS_ALLOWED_SANDBOX_OUTBOUND_HOSTS` reserve les suffixes autorises pour `runtimeEnvironment=sandbox`; ces hosts sont refuses pour `runtimeEnvironment=production`.
- chaque connexion doit declarer `runtimeEnvironment=production|sandbox`; l'environnement fournisseur n'est jamais devine a partir d'un fallback.
- `CONNECTORS_PUBLIC_BASE_URL` doit rester une URL publique propre, sans credentials, query string ni fragment; les credentials d'ingestion ne peuvent plus retomber sur `127.0.0.1`.
- les `CONNECTORS_SERVICE_TOKENS` doivent porter des `capabilities` explicites par token; un token scopes par organisation ne doit pas recevoir automatiquement tous les droits.
- les endpoints internes de lifecycle `sync-runs` (`claim`, `execution-plan`, `completed`, `sync-state`, `failed`) doivent rester derriere la capability dediee `sync_runtime:write`; ne pas les exposer via la capability operateur generique `sync:write`.
- `POST /v1/runtime/.../access-context` doit rester derriere `provider_runtime:write`; il ne doit plus etre exposable via une capability de lecture large.
- les endpoints runtime qui mutent ou claiment les `raw_events` doivent rester derriere `raw_events_runtime:write`; la capability generique `raw_events:write` ne doit pas suffire pour piloter la file interne.
- laissez `TRUST_PROXY=false` par defaut tant qu'un reverse proxy de confiance n'est pas explicitement devant le service.
- quand `TRUST_PROXY=true`, `cf-connecting-ip` puis `x-forwarded-for` sont utilises pour l'IP cliente; sinon seul `remoteAddress` est accepte.
- les credentials d'ingestion emis par defaut imposent `bearer_hmac`; il faut expliciter `requireSignature=false` pour ouvrir un mode bearer simple.
- l'endpoint public `/v1/ingest/:orgId/:connectionId/events` reste non authentifie par service token, mais il est protege par rate limit IP et repond avec un message d'authentification generique.
- le serveur emet maintenant des logs JSON `request.started`, `request.completed` et `request.failed` avec `request_id`, `trace_id`, `organization_id` et champs de correlation standardises a `null` quand ils ne s'appliquent pas encore.
- les connecteurs standards disposent d'un verdict de readiness interne qui bloque `test` et `sync` tant que les prerequis versionnes (config, credentials, autorisation OAuth, probe target) ne sont pas satisfaits.
- pour `UKG`, ces prerequis incluent maintenant aussi `globalTenantId` et `ukgEndpoints`; le runtime ne pretend plus pouvoir synchroniser UKG sans ces metadonnees edition-aware.
- pour `Toast`, ces prerequis incluent maintenant aussi `toastRestaurantExternalId` et `toastEndpoints`; le runtime ne pretend plus pouvoir synchroniser Toast sans ce contexte POS.
- pour `Geotab`, ces prerequis incluent maintenant aussi `geotabFeeds`; le runtime ne pretend plus pouvoir synchroniser Geotab sans mapping feed explicite par objet.
- pour `Olo`, ces prerequis incluent maintenant aussi `oloEndpoints`; le runtime ne pretend plus pouvoir synchroniser Olo sans mapping endpoint explicite par objet.
- pour `Fourth`, ces prerequis incluent maintenant aussi `fourthEndpoints`; le runtime ne pretend plus pouvoir synchroniser Fourth sans mapping endpoint explicite par objet.
- pour `Oracle TM`, ces prerequis incluent maintenant aussi `oracleTmEndpoints`; le runtime ne pretend plus pouvoir synchroniser Oracle TM sans mapping endpoint explicite par objet.
- pour `SAP TM`, ces prerequis incluent maintenant aussi `sapTmEndpoints`; le runtime ne pretend plus pouvoir synchroniser SAP TM sans mapping endpoint explicite par objet.
- pour `Manhattan`, ces prerequis incluent maintenant aussi `manhattanEndpoints`; le runtime ne pretend plus pouvoir synchroniser Manhattan sans mapping endpoint explicite par objet.
- pour `Blue Yonder`, ces prerequis incluent maintenant aussi `blueYonderEndpoints`; le runtime ne pretend plus pouvoir synchroniser Blue Yonder sans mapping endpoint explicite par objet.
- pour `NCR Aloha`, ces prerequis incluent maintenant aussi `alohaEndpoints`; le runtime ne pretend plus pouvoir synchroniser NCR Aloha sans mapping endpoint explicite par objet.
- pour `CDK`, ces prerequis incluent maintenant aussi `cdkEndpoints`; le runtime ne pretend plus pouvoir synchroniser CDK sans mapping endpoint explicite par objet.
- pour `Reynolds`, ces prerequis incluent maintenant aussi `reynoldsEndpoints`; le runtime ne pretend plus pouvoir synchroniser Reynolds sans mapping endpoint explicite par objet.
- les connexions `oauth2`, `api_key` et `session` disposent aujourd'hui d'un probe live runtime; `service_account` et `sftp` restent fail-close pour le `connection test` tant qu'un probe/extracteur dedie n'est pas implemente.
- le `sync-state` runtime accepte maintenant uniquement un `cursorJson` JSON-serializable, borne en taille/profondeur et sans cles reservees type `__proto__`; un worker interne ne doit pas pouvoir y pousser un blob arbitraire ni un payload de pollution de prototype.
- les `payloadPreview` des raw events masquent maintenant aussi les PII evidentes et champs texte de preview (`email`, `phone`, `mobile`, `prenom`, `nom`, `telephone`, `portable`, `message`, `comment`, `note`, `body`) en plus des secrets techniques.
- le listing `GET .../raw-events` ne doit remonter qu'un resume metadata-only; le payload brut et les previews restent bornes aux surfaces internes / endpoints explicites qui en ont reellement besoin.
- l'acces HTTP au payload brut `.../raw-events/:eventId/payload` reste maintenant borne a la capability worker `raw_events_runtime:write`; un token de lecture admin ne doit plus suffire pour relire ce contenu.
- l'OAuth client-credentials supporte maintenant un `audience` optionnel (`config.oauthAudience` / `config.audience`) pour les vendors qui l'exigent, notamment `UKG`.
- le runtime peut maintenant aussi porter des headers provider additionnels non secrets pour certains vendors; c'est ce qui permet de passer `global-tenant-id` a `UKG` et `Toast-Restaurant-External-ID` a `Toast` sans sortir du contrat interne `access-context`.
- le runtime peut maintenant aussi porter des `credentialFields` internes pour les vendors a session applicative; c'est ce qui permet a `Geotab` de resoudre `database`, `userName` et `password` sans sortir les secrets de la frontiere interne.

## Persistence

- En developpement/test, sans `DATABASE_URL`, le service reste en mode memoire avec store local.
- Hors developpement, `DATABASE_URL` est obligatoire et `PostgresBackedConnectorStore` devient le seul mode supporte.
- En mode Postgres, `app-connectors` prend maintenant un advisory lock de runtime au demarrage: une seule instance active peut porter l'etat mutable du control plane a la fois, afin d'eviter tout split-brain sur ownership, leases et idempotence.
- Les payloads bruts sont stockes a part via `payload-store.ts`; hors developpement, `CONNECTORS_OBJECT_STORE_ROOT` doit etre explicite.
- `connector_runtime_snapshots` reste un mecanisme runtime transitoire et non la cible d'architecture durable pour les objets metier integrations.

## Flows importants

OAuth interactif:

1. creer la connexion
2. choisir explicitement `runtimeEnvironment=production|sandbox`
3. readiness check (`config`, `credentials`, endpoints, probe target)
4. `authorize/start`
5. redirection fournisseur
6. `authorize/complete`
7. `test`
8. `sync`

Push API client:

1. emission de credentials d'ingestion
2. remise de `ingestUrl` + `apiKey` + eventuel `signingSecret`
3. push sur l'endpoint d'ingestion
4. lecture ulterieure des `raw_events` par le worker Python

Queue worker runtime:

1. `triggerSync(...)` cree un `sync_run` `queued`
2. un worker interne reclame les runs via `POST /v1/runtime/sync-runs/claim`
3. chaque `sync_run` claimé porte maintenant un `lockedBy` opaque emis par le runtime; ce lock token doit etre reutilise comme `lockToken` pour `execution-plan`, `sync-state`, `access-context`, `provider-events`, `completed` et `failed`
4. le worker Python recupere un `execution plan` borne au `sync_run` claimé et choisit le chemin `provider/raw events` ou `sftpPull`
5. pour le chemin `provider/raw events`, le runtime expose `POST /v1/runtime/organizations/:orgId/connections/:connectionId/access-context` et `POST /v1/runtime/organizations/:orgId/connections/:connectionId/provider-events`, tous deux lies au `sync_run` et a son `lockToken`
6. pour `sftpPull`, le worker persiste un curseur `sourceObject` et peut archiver les fichiers importes
7. le worker marque ensuite le `sync_run` `completed` ou `failed/requeued`

Queue raw events:

1. `POST .../raw-events/claim` reclame des evenements `pending`
2. chaque evenement claimé porte maintenant un `claimedBy` opaque emis par le runtime
3. ce claim token doit etre reutilise comme `claimToken` pour `POST .../processed` ou `POST .../failed`

Garanties runtime a retenir:

- un `sync_run` `running` dont le lease a expire redevient reclaimable par `POST /v1/runtime/sync-runs/claim`
- les appels runtime qui lisent ou ecrivent un `sync_run` possede revalident et prolongent le lease actif avant de continuer
- `ingestEvents` ne laisse plus de `sync_run` zombie si l'ecriture payload/raw-event echoue apres la creation du run
- la deduplication des `raw_events` est maintenant decidee avant toute reecriture du blob payload correspondant
- une session OAuth pendante est supprimee des qu'une autorisation OAuth est finalement completee par credentials manuels

Perimetre actuel a retenir:

- `CSV/XLSX` est maintenant supporte aussi via le chemin runtime `sftpPull`, avec import direct des fichiers SFTP vers le dataset/raw pipeline Python.
- `Salesforce` est maintenant le premier connecteur `L2` reel: `access-context` + `provider-events` cote `app-connectors`, puis adaptateur `client/extractor/mapper/validator` cote `app-api`.
- `UKG` est maintenant le second connecteur `L2` reel: audience OAuth client-credentials, `global-tenant-id`, endpoints provider edition-aware, puis adaptateur `client/extractor/mapper/validator` cote `app-api`.
- `Toast` est maintenant le troisieme connecteur `L2` reel: header `Toast-Restaurant-External-ID`, endpoints provider configures par objet, puis adaptateur `client/extractor/mapper/validator` cote `app-api`.
- `Geotab` est maintenant le quatrieme connecteur `L2` reel: auth `session`, probe `Authenticate`, `GetFeed` stateful et curseur `fromVersion` persiste par `sourceObject`.
- `Olo` est maintenant le cinquieme connecteur `L2` reel: auth `api_key`, endpoints provider configures par objet, puis adaptateur `client/extractor/mapper/validator` cote `app-api`.
- `Fourth` est maintenant le sixieme connecteur `L2` reel: auth `api_key`, endpoints provider configures par objet, puis adaptateur `client/extractor/mapper/validator` cote `app-api`.
- `Oracle TM` est maintenant le septieme connecteur `L2` reel: auth `oauth2`, endpoints provider configures par objet, puis adaptateur `client/extractor/mapper/validator` cote `app-api`.
- `SAP TM` est maintenant le huitieme connecteur `L2` reel: auth `oauth2`, endpoints provider configures par objet, puis adaptateur `client/extractor/mapper/validator` cote `app-api`.
- `Manhattan` est maintenant le neuvieme connecteur `L2` reel: auth `api_key`, endpoints provider configures par objet, puis adaptateur `client/extractor/mapper/validator` cote `app-api`.
- `Blue Yonder` est maintenant le dixieme connecteur `L2` reel: auth `api_key`, endpoints provider configures par objet, puis adaptateur `client/extractor/mapper/validator` cote `app-api`.
- `NCR Aloha` est maintenant le onzieme connecteur `L2` reel: auth `api_key`, endpoints provider configures par objet, puis adaptateur `client/extractor/mapper/validator` cote `app-api`; le chemin `sftp` reste distinct.
- `CDK` est maintenant le douzieme connecteur `L2` reel: auth `service_account` scellee exposee via `credentialFields`, endpoints provider configures par objet, puis adaptateur `client/extractor/mapper/validator` cote `app-api`; le chemin `sftp` reste distinct.
- `Reynolds` est maintenant le treizieme connecteur `L2` reel: auth `service_account` scellee exposee via `credentialFields`, endpoints provider configures par objet, puis adaptateur `client/extractor/mapper/validator` cote `app-api`; le chemin `sftp` reste distinct.
- `OAuth2`, `API key` et `session` peuvent etre valides par probe live.
- `service_account` couvre maintenant un vrai chemin runtime `L2` pour `CDK` et `Reynolds`; en dehors de ces cas, il reste un modele de credentials/onboarding tant qu'aucun adaptateur vendor-specifique n'est branche.
- `sftp` couvre maintenant l'execution batch `sync_runs -> execution plan -> file pull -> dataset`, mais pas encore un `connection test` live dedie.
- le mode `service_account` n'accepte plus de fallback `username/password`; seules les formes `clientId + clientSecret` ou `clientEmail + privateKey` restent autorisees.
- en particulier, le mode `sftp` n'accepte plus l'authentification par mot de passe: seul `host + username + privateKey` est autorise, conformement au durcissement "SSH key only".

Les journaux d'audit du runtime attribuent les actions humaines au principal de service de confiance qui appelle `app-connectors`; ils n'acceptent plus un `userId` injecte via header HTTP.
Les logs runtime HTTP restent distincts des journaux d'audit metier: ils servent a corriger, correlater et monitorer les appels entrants sans exposer de payloads sensibles.

## Commandes

```bash
pnpm --dir app-connectors dev
pnpm --dir app-connectors test
pnpm --dir app-connectors lint
pnpm --dir app-connectors typecheck
pnpm --dir app-connectors build
```
