# `src/` - Runtime control plane connecteurs

## Role

Code source du service HTTP connecteurs.

## Fichiers cle

- `index.ts` : bootstrap.
- `config.ts` : validation stricte env et scopes d'organisation.
- `server.ts` : serveur, auth service tokens, CORS, routing et traitement requetes.
- `server.ts` applique aussi les garde-fous de rate limiting par route.
- `routes.ts` : schemas Zod et routes HTTP.
- `router.ts` : moteur de matching de routes.
- `outbound-url.ts` : validation centralisee des URLs sortantes et des allowlists d'hotes.
- `response.ts` : enveloppes de succes/erreur.
- `catalog.ts` : catalogue des connecteurs connus.
- `activation-readiness.ts` : contrat et evaluation des prerequis d'activation standard.
- `service.ts` : orchestration metier du cycle de vie des connexions.
- `store.ts` : implementation memoire.
- `persistent-store.ts` : persistance Postgres.
- `payload-store.ts` : stockage des payloads bruts.
- `oauth.ts` : generation d'URL OAuth, echange de code, refresh.
- `security.ts` : redaction, sealing AES-GCM, HMAC, PKCE, secrets opaques.
- `types.ts` : contrats internes du runtime.

## Integration avec les autres apps

- `app-api-ts` appelle ce service pour la surface admin integrations.
- `app-api` consomme ensuite les raw events et payloads via ses workers Python.
- le listing `raw-events` destine aux surfaces operateur reste maintenant metadata-only; le payload brut reste reserve au chemin explicite `.../raw-events/:eventId/payload`, et le worker Python continue de passer par `claim` + `/payload`.
- le chemin HTTP `.../raw-events/:eventId/payload` est maintenant garde par `raw_events_runtime:write`, pas par une simple capability de lecture admin.
- les frontends n'appellent pas directement ce service depuis le navigateur public; l'acces est medie par tokens de service scopes.
- la verification live de connexion existe aujourd'hui pour `oauth2`, `api_key` et `session`; `service_account` et `sftp` restent au stade onboarding/stockage de credentials tant que leurs adaptateurs runtime ne sont pas livres.
- le runtime expose maintenant aussi la queue interne `sync_runs` (`claim`, `completed`, `failed`) pour qu'un worker batch puisse executer les drains Python hors du serveur HTTP.
- ce runtime expose maintenant aussi un `execution plan` borne a un `sync_run` claimé et un `sync-state` persistant par `connection + sourceObject`, utilises notamment par le chemin `sftpPull` du worker Python.
- ce runtime expose maintenant aussi `GET .../access-context` et `POST .../provider-events` pour que le worker Python execute un vrai `provider pull` vendor-specifique sans exposer les secrets fournisseur hors frontiere de confiance.
- ce contexte provider peut maintenant porter des headers additionnels, necessaires par exemple a `UKG` (`global-tenant-id`) ou `Toast` (`Toast-Restaurant-External-ID`), ainsi que des `credentialFields` internes pour les vendors a session comme `Geotab`.

## Patterns a retenir

- validation d'entree Zod dans `routes.ts`
- logique metier centralisee dans `ConnectorService`
- persistance interchangeable memoire/Postgres
- secrets jamais en clair dans la config: sealing obligatoire
- les `payloadPreview` exposes aux surfaces operateur passent par une redaction dediee qui masque secrets techniques, PII evidente et principaux champs texte (`email`, `phone`, `mobile`, `prenom`, `nom`, `telephone`, `portable`, `message`, `comment`, `note`, `body`)
- `CONNECTORS_PUBLIC_BASE_URL` doit rester explicite et propre; le service n'emet plus d'URL d'ingestion publique en fallback local
- chaque connexion porte un `runtimeEnvironment=production|sandbox`
- operations de sync protegees par `Idempotency-Key`
- chaque route protegee declare des `requiredCapabilities`; les service tokens sont scopes par organisation et par action
- l'ingestion publique est rate limited par IP et masque les details d'echec d'authentification dans la reponse HTTP
- les credentials d'ingestion sont signes par HMAC par defaut; le mode bearer simple doit etre explicite
- toutes les URLs sortantes sensibles (`baseUrl`, `testEndpoint`, endpoints OAuth) passent par `outbound-url.ts`
- `CONNECTORS_ALLOWED_OUTBOUND_HOSTS` et `CONNECTORS_ALLOWED_SANDBOX_OUTBOUND_HOSTS` separent strictement prod et sandbox; un host reserve a la sandbox est refuse sur une connexion `production`
- `activation-readiness.ts` produit un verdict stable `authorization -> connection test -> sync` pour les connecteurs standards afin d'eviter les activations partielles
- ce verdict reste fail-close: sans probe live supporte, une connexion ne doit pas etre promue comme `tested` ou `ready for sync`
- les credentials `service_account` sont restreints aux formes `clientId + clientSecret` ou `clientEmail + privateKey`; aucun fallback `username/password` n'est accepte
- les credentials `sftp` sont volontairement restreints a `host + username + privateKey`; aucun mot de passe SFTP ne doit etre persiste ou accepte dans ce runtime
- `sync-state` sert maintenant de curseur runtime pour memoriser les fichiers deja importes par un worker `sftpPull`; il doit rester attache au run claimé qui le met a jour
- `sync_runs` n'est plus seulement une file declarative: `service.ts` gere maintenant les transitions `queued -> running -> success|failed|queued(retry)`
- les endpoints runtime `provider access-context` et `provider-events` sont internes: ils exigent des service-token capabilities dediees `provider_runtime:read` / `provider_runtime:write` et revalident l'ownership du `sync_run`
- les endpoints runtime de lifecycle `sync-runs` (`claim`, `execution-plan`, `completed`, `sync-state`, `failed`) sont eux aussi internes: ils exigent maintenant la capability dediee `sync_runtime:write`, distincte de `sync:write`, car `execution-plan` peut exposer des credentials dechiffres au worker proprietaire du run.
- les endpoints runtime qui claiment ou mutent les `raw_events` exigent maintenant `raw_events_runtime:write`, distinct de `raw_events:write`, pour eviter qu'un token interne trop large puisse manipuler la file Bronze sans etre un vrai worker.
- le `cursorJson` du `sync-state` est maintenant nettoye cote service: JSON strict, profondeur/taille bornees, et rejet explicite des cles reservees de type `__proto__` / `constructor` / `prototype`.
- l'OAuth client-credentials runtime supporte maintenant aussi un `config.oauthAudience` / `config.audience`; c'est ce qui permet de brancher `UKG` sans sortir de la primitive OAuth generique.
- les prerequis `toastRestaurantExternalId` et `toastEndpoints` gardent le chemin `Toast` fail-close tant que le contexte POS vendor n'est pas explicitement configure.
- les prerequis `geotabFeeds` gardent le chemin `Geotab` fail-close tant que l'objet `GetFeed` / `Get` attendu n'est pas explicitement configure.
- les prerequis `oloEndpoints` gardent le chemin `Olo` fail-close tant que les endpoints `Orders` / `Stores` / `Products` / `Promotions` ne sont pas explicitement configures.
- les prerequis `fourthEndpoints` gardent le chemin `Fourth` fail-close tant que les endpoints `Employees` / `Roster` / `Timeclock` / `LaborForecast` ne sont pas explicitement configures.
- les prerequis `oracleTmEndpoints` gardent le chemin `Oracle TM` fail-close tant que les endpoints `Shipment` / `OrderRelease` / `Route` / `Stop` ne sont pas explicitement configures.
- les prerequis `sapTmEndpoints` gardent le chemin `SAP TM` fail-close tant que les endpoints `FreightOrder` / `FreightUnit` / `Resource` / `Stop` ne sont pas explicitement configures.
- les prerequis `manhattanEndpoints` gardent le chemin `Manhattan` fail-close tant que les endpoints `Wave` / `Task` / `Inventory` / `Shipment` ne sont pas explicitement configures.
- les prerequis `blueYonderEndpoints` gardent le chemin `Blue Yonder` fail-close tant que les endpoints `DemandPlan` / `LaborPlan` / `Store` / `SKU` ne sont pas explicitement configures.
- les prerequis `alohaEndpoints` gardent le chemin `NCR Aloha` fail-close tant que les endpoints `Check` / `Item` / `Labor` / `Inventory` ne sont pas explicitement configures.
- les prerequis `cdkEndpoints` gardent le chemin `CDK` fail-close tant que les endpoints `ServiceOrders` / `ROLines` / `Vehicle` / `Technician` ne sont pas explicitement configures.
- les prerequis `reynoldsEndpoints` gardent le chemin `Reynolds` fail-close tant que les endpoints `RepairOrder` / `Customer` / `Vehicle` / `Parts` ne sont pas explicitement configures.
- le mode `session` est reserve aux vendors a session applicative type MyGeotab; il reste sous secret sealing et n'est expose au worker Python qu'au travers des `credentialFields` internes du `ProviderRuntimeAccessContext`.
- le mode `service_account` peut maintenant, pour un vendor `L2` comme `CDK` ou `Reynolds`, exposer des `credentialFields` internes scelles au worker Python sans sortir les secrets de la frontiere runtime.
- les IP clientes ne doivent utiliser `cf-connecting-ip` / `x-forwarded-for` que si `TRUST_PROXY=true`
- le runtime reemet `X-Request-ID` sur chaque reponse et journalise le cycle `request.started` / `request.completed` avec les champs de correlation normalises
