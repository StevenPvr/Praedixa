# Flux De Donnees Applicatifs

Statut: draft durable
Owner: Platform + Product Engineering
Derniere revue: 2026-03-21
Source de verite: `docs/ARCHITECTURE.md`, `app-webapp/app/api/README.md`, `app-admin/app/api/README.md`, `app-api-ts/README.md`, `app-api-ts/src/services/README.md`, `app-connectors/README.md`, `app-api/README.md`
Depend de: `app-webapp`, `app-admin`, `app-api-ts`, `app-connectors`, `app-api`, PostgreSQL, Keycloak, Camunda
Voir aussi: `05-schemas-tenant-et-medallion.md`, `07-connecteurs-et-sync-runs.md`, `visuals/systeme-global.mmd`, `visuals/sequence-front-api.mmd`, `visuals/sequence-api-connectors-python.mmd`

## Resume executif

Praedixa ne repose pas sur un seul backend monolithique. Les flux de donnees traversent plusieurs frontieres clairement separables:

- les frontends Next ne parlent pas directement a l'API depuis le navigateur
- les BFF Next injectent la session et protègent les appels same-origin
- `app-api-ts` est le pivot HTTP produit/admin et la principale porte d'entree SQL
- `app-connectors` porte la surface integrations et les queues runtime internes
- `app-api` Python transforme, ingere, enrichit et alimente les resultats data/ML
- PostgreSQL est le point de convergence des etats metier et de nombreux read-models

Le diagramme systeme source est versionne dans `visuals/systeme-global.mmd`.

## Frontiere 1: navigateur -> BFF Next

Le navigateur parle a un endpoint same-origin:

- `app-webapp` expose `/api/v1/[...path]`
- `app-admin` expose `/api/v1/[...path]`

Le proxy Next:

- verifie l'origine et la session
- raffraichit si necessaire la session serveur
- injecte le bearer cote serveur
- propage les identifiants de correlation (`X-Request-ID`, `traceparent`, `tracestate`)
- bloque les appels browser cross-site

Conclusion importante pour un CTO: les tokens OIDC ne sont pas exposes directement au code React standard. Le navigateur reste derriere un BFF same-origin.

## Frontiere 2: BFF Next -> `app-api-ts`

`app-api-ts` recoit l'appel comme runtime HTTP principal:

- verification JWT, role et permissions
- dispatch route -> handler -> service
- lecture/ecriture PostgreSQL
- orchestration de dependances externes adjacentes

Dependances majeures de `app-api-ts`:

- PostgreSQL pour la persistance produit et admin
- Keycloak pour la gestion d'identite admin/client
- Camunda pour l'onboarding BPM
- `app-connectors` pour les integrations

Le repo montre aussi une realite utile a documenter:

- une partie importante des routes est industrielle et persistante
- d'autres restent volontairement fail-close via `liveFallbackFailure(...)`

Ce point doit etre visible dans toute lecture CTO des flux, sinon on confond tres vite perimeter live et perimeter encore ferme.

## Frontiere 3: `app-api-ts` -> PostgreSQL

Le runtime Node/TS porte une grande part des lectures et ecritures applicatives:

- organisations, utilisateurs, onboarding, audit, billing
- lectures operationnelles live
- routes gold/canonical/proof
- read-models DecisionOps
- surfaces admin integrations

La logique d'acces passe par `persistence.ts`, les services metier et les migrations SQL propres a la couche TS quand elle possede ses propres structures.

Le point cle: `app-api-ts` est a la fois facade HTTP et runtime de persistance. Il n'est pas un simple proxy.

## Frontiere 4: `app-api-ts` -> `app-connectors`

Pour le domaine integrations:

- la console admin passe par `app-api-ts`
- `app-api-ts` appelle `app-connectors`
- `app-connectors` gere connexions, readiness, OAuth, service tokens, payload store, queue `sync_runs`, `raw events`

Ce domaine est a lire comme un control plane:

- creation et mise a jour de connexions
- test de prerequis
- declenchement de sync
- consultation audit/runs

## Frontiere 5: `app-connectors` -> `app-api` Python

Le data-plane Python n'est pas appele comme backend produit pour les frontends. Il intervient surtout comme worker et moteur de transformation:

1. un `sync_run` est cree cote control plane
2. un worker Python reclame le run via `/v1/runtime/sync-runs/claim`
3. le worker lit l'`execution plan`
4. selon le cas, il consomme:
   - `access-context` + `provider-events`
   - ou un chemin `sftpPull`
5. les donnees brutes sont persistees, transformees puis rejouees dans le pipeline data
6. les resultats alimentent les lectures live et les tables metier

Le diagramme de sequence associe est versionne dans `visuals/sequence-api-connectors-python.mmd`.

## Frontiere 6: `app-api` Python -> couches medallion -> lectures live

Le moteur Python:

- ingere les entrees fournisseur/fichier
- applique les traitements Bronze/Silver/Gold
- alimente les couches qualite, canonical, previsions, alerts, proof et surfaces analytiques

Ensuite, `app-api-ts` relit ces resultats pour les exposer via:

- `/api/v1/live/gold/*`
- `/api/v1/live/canonical*`
- `/api/v1/live/forecasts*`
- `/api/v1/proof*`

Le coupling principal entre Node/TS et Python est donc structurellement:

- PostgreSQL
- workers batch
- contrats runtime integrations

et non un simple appel HTTP synchrone Python pour chaque page produit.

## Les 4 flux que le CTO doit connaitre par coeur

### 1. Consultation produit

`Navigateur -> app-webapp BFF -> app-api-ts -> PostgreSQL -> reponse JSON`

Usage typique:

- dashboard live
- canonical
- forecasts
- gold
- proof

### 2. Action admin

`Navigateur -> app-admin BFF -> app-api-ts -> PostgreSQL / Keycloak / Camunda / app-connectors`

Usage typique:

- creer une organisation
- provisionner un compte
- suivre onboarding
- consulter audit, monitoring, integrations

### 3. Sync integration

`app-admin -> app-api-ts -> app-connectors -> worker Python -> pipeline data -> PostgreSQL -> lectures live`

Usage typique:

- connecteur OAuth/API key/session/service account
- import SFTP
- replay ou reprise de sync

### 4. Parcours landing

`Navigateur -> app-landing -> route publique -> app-api-ts public -> PostgreSQL/admin follow-up`

Usage typique:

- formulaire contact
- collecte de leads et relecture cote admin

## Sources de verite par flux

| Flux               | Source de verite principale                                          | Source de verite secondaire                              |
| ------------------ | -------------------------------------------------------------------- | -------------------------------------------------------- |
| BFF webapp/admin   | `app-webapp/app/api/README.md`, `app-admin/app/api/README.md`        | impl route `[...path]`                                   |
| HTTP produit/admin | `app-api-ts/src/routes.ts`                                           | `contracts/openapi/public.yaml`, `packages/shared-types` |
| SQL Node/TS        | `app-api-ts/src/services/*`                                          | migrations SQL TS                                        |
| Integrations       | `app-connectors/src/routes.ts`, `app-connectors/src/service.ts`      | `app-api` workers + docs integrations                    |
| Pipeline data      | `app-api/scripts/medallion_pipeline.py`, `medallion_orchestrator.py` | docs medallion                                           |

## Ce qu'il faut verifier avant de dire "ce flux est compris"

- est-ce un flux live ou fail-close?
- qui porte l'auth effective?
- quel runtime detient l'invariant metier?
- ou la donnee est-elle vraiment persistee?
- quelle table ou quel read-model alimente finalement la page ou l'endpoint?
- quel champ de correlation permet de suivre le flux dans les logs?

## Diagrammes source

- systeme global: `visuals/systeme-global.mmd`
- sequence front/API: `visuals/sequence-front-api.mmd`
- sequence integrations/data-plane: `visuals/sequence-api-connectors-python.mmd`
- lineage medallion: `visuals/lineage-medallion.mmd`
