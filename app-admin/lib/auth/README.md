# `lib/auth/` - Auth, session et permissions admin

Le back-office n'est pas seulement protege par un role; il applique aussi des permissions fines par route. Ce dossier porte la resolution de session, les permissions metier et les garde-fous d'acces directs.

## Fichiers principaux

| Fichier                   | Role                                                                         |
| ------------------------- | ---------------------------------------------------------------------------- |
| `admin-route-policies.ts` | Source de verite typée des pages admin, tabs workspace et policies API proxy |
| `middleware.ts`           | Garde des requetes Next, redirections login/unauthorized                     |
| `request-session.ts`      | Resolution centralisee de la session admin                                   |
| `server.ts`               | Helpers serveur pour lire l'utilisateur                                      |
| `client.ts`               | Lecture client de la session via `/auth/session`                             |
| `permissions.ts`          | Normalisation des permissions et acces console                               |
| `oidc.ts`                 | Sous-systeme OIDC admin (cookies, JWT, refresh, session)                     |

## Regles importantes

- Acces console reserve a `canAccessAdminConsole(...)`.
- Les routes `/api/*` ne sont pas gerees par le middleware de page; elles gardent leur propre contrat JSON.
- `admin-route-policies.ts` protege les URL directes du workspace client, la navigation UI et le proxy same-origin `/api/v1/[...path]`.
- L'endpoint partage `GET /api/v1/admin/organizations/[orgId]`, utilise pour l'en-tete et l'arborescence du workspace client, doit rester accessible a chaque surface qui l'emploie, y compris aux profils onboarding-only et aux surfaces `messages/` qui montent sous le meme layout.
- Les pages detail read-only (`approvals`, `dispatches/[actionId]`, `ledgers/[ledgerId]`) et les surfaces de gouvernance runtime comme `/clients/[orgId]/contrats` doivent etre declarees dans `admin-route-policies.ts` en meme temps que leurs endpoints API, sinon middleware, navigation et proxy divergent.
- Les endpoints globaux de gouvernance (`decision-contract-templates`, preview d'instanciation, evaluation de compatibilite`) et les endpoints org-scoped du Contract Studio (`decision-contracts`, `transition`, `fork`, `rollback\*`) doivent aussi etre declares ici pour rester visibles a `admin-route-policies.ts` et au proxy admin.
- Les operations connecteurs visibles depuis `/clients/[orgId]/config` (`connections/:connectionId/test`, `connections/:connectionId/sync`, `integrations/sync-runs`) doivent rester synchronisees ici avec leurs permissions `admin:integrations:*`.
- Tout chemin admin ou proxy admin sans policy explicite est refuse par defaut.
- `resolveAccessibleAdminPath(...)` est la source de verite du fallback post-login et du reroutage depuis `/` quand la home n'est pas accessible; ne pas recoder un `"/"` par defaut ailleurs.
- `middleware.ts` garde maintenant `updateSession(...)` comme orchestrateur court, avec helpers dedies pour le passthrough, la classification de route, l'etat d'acces session et les decisions de redirection.
- `request-session.ts` garde maintenant `resolveRequestSession(...)` comme orchestrateur court, avec helpers dedies pour la lecture des cookies, la validation de session, la verification des bindings et la branche refresh.
- Les JWT admin n'acceptent plus que les claims top-level canoniques `sub`, `email`, `role`, `organization_id`, `site_id` et `permissions`; aucune permission n'est derivee depuis `profiles` ou `roles`.
- Les sessions `super_admin` et les tokens admin normalisent maintenant la taxonomie complete des permissions via `@praedixa/shared-types`; un vieux cookie signe sans ce jeu complet doit repartir en reauth forcee plutot qu'atterrir durablement sur `/unauthorized`.
- `canAccessAdminConsole(...)` reste appelee avec la signature `(role, permissions)` pour stabilite d'appel, mais l'autorisation console est resolue uniquement depuis la permission canonique `admin:console:access`.
- En production, le callback admin exige aussi un claim `amr` conforme a `AUTH_ADMIN_REQUIRED_AMR` avant de creer la session console.
- `resolveAuthAppOrigin(...)` doit fail-close en production: `AUTH_APP_ORIGIN` ou `NEXT_PUBLIC_APP_ORIGIN` est obligatoire et les redirects OIDC ne doivent jamais etre derives de `request.nextUrl.origin`.
- En developpement local, si l'admin tourne via une IP privee ou un alias loopback sur le port `3002`, `resolveAuthAppOrigin(...)` conserve ce host de requete au lieu de forcer `localhost`; les cookies de login et le callback OIDC restent ainsi sur le meme host.
- La confiance OIDC reste `https`-only par defaut, sauf en developpement local explicite ou `oidc.ts` accepte `http://localhost`, `127.0.0.1` et `::1` pour permettre un Keycloak local sur `localhost:8081` sans assouplir la prod.
- Cette politique de discovery/trust OIDC n'est plus dupliquee dans les apps: `oidc.ts` consomme maintenant le helper partage `@praedixa/shared-types/oidc-discovery`, qui doit rester la seule source de verite pour admin et webapp.
- `oidc.ts` manipule les claims JWT et les segments base64url avec des primitives Unicode et d'introspection modernes (`Object.hasOwn`, `codePointAt`, `fromCodePoint`, `replaceAll`) pour eviter les faux positifs Sonar et garder des conversions explicites.
- La decouverte OIDC admin remonte maintenant le statut HTTP et un extrait du payload d'erreur du provider (par exemple realm manquant) au lieu d'un simple `OIDC discovery request failed`, pour que les handlers puissent journaliser une cause utile sans exposer plus de detail au navigateur.
- `GET /auth/session` renvoie toujours `accessTokenExpiresAt` pour permettre au cache navigateur de respecter `min_ttl`; `accessToken` n'est inclus que sur demande explicite (`include_access_token=1`) et uniquement quand `NEXT_PUBLIC_ADMIN_API_MODE=direct`.
- `lib/auth/client.ts` garde un cache session TTL-aware: une entree memoire n'est reutilisable que si `accessTokenExpiresAt - now > min_ttl`, et un cache hydrate sans bearer ne peut pas satisfaire un appel direct-mode qui demande un token.

## Tests

- `__tests__/admin-route-policies.test.ts`
- `__tests__/client.test.ts`
- `__tests__/middleware.test.ts`
- `__tests__/oidc.test.ts`
- `__tests__/permissions.test.ts`
- `__tests__/route-access.test.ts`
- `__tests__/server.test.ts`
