# Auth Modes Connecteurs Et Audit Integration

- Statut: draft durable
- Owner: CTO / platform engineering
- Derniere revue: 2026-03-21
- Source de verite:
  - `app-connectors/src/types.ts`
  - `app-connectors/src/catalog.ts`
  - `app-connectors/src/service.ts`
  - `app-connectors/src/store.ts`
  - `app-connectors/src/persistent-store.ts`
  - `app-api/app/models/integration.py`
  - `app-api/alembic/versions/026_integration_platform_foundation.py`
- Depend de:
  - `docs/cto/07-connecteurs-et-sync-runs.md`
  - `docs/cto/15-capabilities-et-securite-connecteurs.md`
  - `docs/architecture/adr/ADR-004-source-de-verite-runtime-integrations.md`
- Voir aussi:
  - `docs/DATABASE.md`
  - `app-connectors/README.md`
  - `app-api/app/models/README.md`

## Objectif

Cette page ferme un angle mort precis:

- quels auth modes existent vraiment dans le runtime `app-connectors`;
- lesquels existent dans le modele relationnel `integration_*`;
- quels objets runtime critiques n'ont pas encore de representation durable claire;
- quel risque cela cree pour la comprehension CTO et la convergence d'architecture.

## Verdict rapide

Le runtime connecteurs supporte aujourd'hui 5 auth modes:

- `oauth2`
- `api_key`
- `session`
- `service_account`
- `sftp`

Le modele relationnel Python/Alembic n'en supporte explicitement que 4:

- `oauth2`
- `api_key`
- `service_account`
- `sftp`

Conclusion:

- l'ecart `session` est reel et prouve dans le code;
- la convergence `integration_*` n'est pas terminee tant que cet ecart reste ouvert;
- d'autres objets runtime durables existent encore seulement dans le snapshot `app-connectors`.

## Preuves directes

### Runtime TypeScript `app-connectors`

Le type `ConnectorAuthMode` expose:

- `oauth2`
- `api_key`
- `session`
- `service_account`
- `sftp`

Le catalogue vendor utilise effectivement ces modes, notamment:

- `Geotab` en `session`;
- `Salesforce`, `UKG`, `Toast`, `Oracle TM`, `SAP TM` en `oauth2` selon le connecteur;
- `Olo`, `Fourth`, `Manhattan`, `Blue Yonder`, `NCR Aloha` en `api_key` selon le connecteur;
- `CDK`, `Reynolds` en `service_account`;
- plusieurs vendors avec un chemin `sftp`.

Le service runtime implemente aussi des comportements specifiques par auth mode:

- validation et sealing OAuth;
- validation `api_key`;
- auth stateful `session` pour `Geotab`;
- `service_account` borne a `clientId + clientSecret` ou `clientEmail + privateKey`;
- `sftp` borne a `host + username + privateKey`, sans mot de passe.

### Modele relationnel `integration_*`

`IntegrationAuthMode` dans `app-api/app/models/integration.py` expose seulement:

- `oauth2`
- `api_key`
- `service_account`
- `sftp`

La migration `026_integration_platform_foundation.py` cree le type PostgreSQL `integrationauthmode` avec ce meme ensemble.

Le mode `session` n'existe donc ni dans l'enum Python, ni dans l'enum PostgreSQL.

## Ecarts constates

| Sujet                   | Runtime reel                                          | Modele durable                                              | Statut                     |
| ----------------------- | ----------------------------------------------------- | ----------------------------------------------------------- | -------------------------- |
| `session`               | supporte par `app-connectors` et utilise par `Geotab` | absent de `IntegrationAuthMode` et de `integrationauthmode` | ecart ouvert               |
| `authorizationSessions` | stockees dans le snapshot runtime                     | pas de table relationnelle dediee                           | ecart ouvert               |
| `ingestCredentials`     | stockees dans le snapshot runtime                     | pas de table `integration_*` dediee                         | ecart ouvert               |
| `rawEvents` metadata    | stockes dans le snapshot runtime                      | une table cible `integration_raw_events` existe cote Python | convergence partielle      |
| `syncStates`            | stockes dans le snapshot runtime                      | une table cible `integration_sync_state` existe cote Python | convergence partielle      |
| `runs`                  | stockes dans le snapshot runtime                      | une table cible `integration_sync_runs` existe cote Python  | convergence partielle      |
| secrets scelles         | `connector_secret_records` + payload scelle           | `secret_ref` seulement                                      | ecart assume et acceptable |
| payloads bruts complets | payload store / object store                          | reference seulement attendue cote relationnel               | ecart assume et acceptable |

## Lecture par auth mode

### `oauth2`

- aligne entre runtime et modele relationnel;
- flow interactif `authorize/start` et `authorize/complete` bien reel;
- point d'attention: les sessions d'autorisation pending ne vivent pas encore dans une table relationnelle dediee.

### `api_key`

- aligne entre runtime et modele relationnel;
- bien supporte dans le service runtime et le catalogue vendors;
- pas d'ecart majeur de type, seulement l'ecart global snapshot vs tables cibles.

### `session`

- supporte dans `app-connectors`;
- utilise explicitement pour `Geotab`;
- absent du modele Python et de la migration `026`.

C'est l'ecart de modele le plus net et le plus important a fermer.

### `service_account`

- aligne nominalement entre runtime et modele relationnel;
- durci cote runtime: pas de fallback `username/password`;
- point d'attention: certains `credentialFields` internes restent portes par le runtime snapshot plutot que par une representation durable detaillee.

### `sftp`

- aligne nominalement entre runtime et modele relationnel;
- durci cote runtime: SSH key only;
- point d'attention: la persistence du curseur et des objets importes reste encore surtout visible via le snapshot runtime et les flux workers.

## Objets runtime encore hors modele durable

En plus du mode `session`, plusieurs objets operables existent encore surtout dans `connector_runtime_snapshots`:

- `authorizationSessions`
- `ingestCredentials`
- `connections`
- `runs`
- `syncStates`
- `rawEvents`
- `auditEvents`

Ce constat ne signifie pas que tout doit devenir une table detaillee. Il faut distinguer:

- ce qui doit converger vers `integration_*` comme metadonnees durables;
- ce qui doit rester hors tables comme secret ou payload brut;
- ce qui peut rester cache technique reconstructible.

## Risques CTO

### Risque 1

Lire `integration_*` comme runtime complet alors que `app-connectors` porte encore la verite operable.

### Risque 2

Penser que tous les auth modes supportes cote produit sont modelises en SQL, alors que `session` ne l'est pas encore.

### Risque 3

Confondre un ecart acceptable de securite:

- secret store specialise;
- payload store specialise;

avec un ecart non acceptable de modele metier durable:

- `session`;
- sessions d'autorisation;
- ingest credentials;
- etat runtime de sync.

## Decision de lecture

Tant que l'ADR-004 n'est pas completement executee:

1. lire `app-connectors` comme verite operable immediate;
2. lire `integration_*` comme cible durable versionnee;
3. considerer `session` comme un ecart de modele ouvert et non comme un detail cosmétique.

## Actions recommandees

### P0

- ajouter `session` a `IntegrationAuthMode` et au type PostgreSQL `integrationauthmode`, ou formaliser une autre representation durable equivalente si l'on decide que `session` est un sous-type distinct;
- definir la representation durable des `authorizationSessions` si elles restent des objets operables.

### P1

- definir la representation durable des `ingestCredentials` si elles doivent etre auditables hors snapshot;
- faire converger les metadonnees `connections`, `runs`, `syncStates` et `rawEvents` vers `integration_*` selon l'ADR-004.

### P2

- ajouter un garde-fou doc-vers-code qui compare explicitement:
  - les auth modes `app-connectors`;
  - l'enum `IntegrationAuthMode`;
  - la doc CTO connecteurs.

## Conclusion

Le repo raconte deja honnêtement l'ecart, mais il faut retenir une phrase simple:

le control plane connecteurs est operable aujourd'hui, mais son modele durable n'est pas encore complet tant que `session` et plusieurs objets runtime critiques restent portes seulement par le snapshot `app-connectors`.
