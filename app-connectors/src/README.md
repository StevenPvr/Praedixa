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
- les frontends n'appellent pas directement ce service depuis le navigateur public; l'acces est medie par tokens de service scopes.

## Patterns a retenir

- validation d'entree Zod dans `routes.ts`
- logique metier centralisee dans `ConnectorService`
- persistance interchangeable memoire/Postgres
- secrets jamais en clair dans la config: sealing obligatoire
- `CONNECTORS_PUBLIC_BASE_URL` doit rester explicite et propre; le service n'emet plus d'URL d'ingestion publique en fallback local
- chaque connexion porte un `runtimeEnvironment=production|sandbox`
- operations de sync protegees par `Idempotency-Key`
- chaque route protegee declare des `requiredCapabilities`; les service tokens sont scopes par organisation et par action
- l'ingestion publique est rate limited par IP et masque les details d'echec d'authentification dans la reponse HTTP
- les credentials d'ingestion sont signes par HMAC par defaut; le mode bearer simple doit etre explicite
- toutes les URLs sortantes sensibles (`baseUrl`, `testEndpoint`, endpoints OAuth) passent par `outbound-url.ts`
- `CONNECTORS_ALLOWED_OUTBOUND_HOSTS` et `CONNECTORS_ALLOWED_SANDBOX_OUTBOUND_HOSTS` separent strictement prod et sandbox; un host reserve a la sandbox est refuse sur une connexion `production`
- `activation-readiness.ts` produit un verdict stable `authorization -> connection test -> sync` pour les connecteurs standards afin d'eviter les activations partielles
- les IP clientes ne doivent utiliser `cf-connecting-ip` / `x-forwarded-for` que si `TRUST_PROXY=true`
- le runtime reemet `X-Request-ID` sur chaque reponse et journalise le cycle `request.started` / `request.completed` avec les champs de correlation normalises
