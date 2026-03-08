# app-webapp -- Tableau de bord client Praedixa

Application de pilotage de capacite pour les responsables de sites logistiques. Previsions d'absences, alertes de couverture, scenarios d'arbitrage et suivi des decisions -- le tout centralise dans un tableau de bord unique.

**Stack** : Next.js 15 / React 19 / OIDC (PKCE) / Tailwind CSS (OKLCH) / Scaleway Containers
**Port** : `3001`
**Package** : `@praedixa/webapp`

---

## Demarrage rapide

```bash
# 1. Variables d'environnement
cp app-webapp/.env.local.example app-webapp/.env.local
# Remplir NEXT_PUBLIC_API_URL + AUTH_APP_ORIGIN + AUTH_OIDC_* + AUTH_SESSION_SECRET

# 2. Installer les dependances (depuis la racine du monorepo)
pnpm install

# 3. Lancer le serveur de developpement
pnpm dev:webapp   # http://localhost:3001
```

> **Prerequis** : l'API backend doit tourner sur le port 8000 (`pnpm dev:api`) et PostgreSQL sur le port 5433 (`docker compose -f infra/docker-compose.yml up -d postgres`).

### Variables d'environnement

| Variable                  | Description                                     | Exemple                                     |
| ------------------------- | ----------------------------------------------- | ------------------------------------------- |
| `NEXT_PUBLIC_API_URL`     | URL de l'API backend (`https://` requis en production) | `http://localhost:8000`               |
| `AUTH_APP_ORIGIN`         | Origin publique du webapp pour les redirects OIDC et les controles same-origin (`https://` requis en production) | `http://localhost:3001` |
| `AUTH_OIDC_ISSUER_URL`    | URL realm OIDC (Keycloak)                       | `https://auth.praedixa.com/realms/praedixa` |
| `AUTH_OIDC_CLIENT_ID`     | Client ID OIDC webapp                           | `praedixa-webapp`                           |
| `AUTH_OIDC_CLIENT_SECRET` | Client secret OIDC (optionnel si client public) | `<secret>`                                  |
| `AUTH_OIDC_SCOPE`         | Scope OIDC                                      | `openid profile email offline_access`       |
| `AUTH_SESSION_SECRET`     | Secret de signature session, unique et aleatoire (32+ caracteres minimum) | `<48+ random chars>` |
| `AUTH_TRUST_X_FORWARDED_FOR` | Autorise les en-tetes proxy IP (`CF-Connecting-IP`, `X-Real-IP`, `X-Forwarded-For`) pour le rate limit; laisser desactive hors proxy de confiance | `1` |
| `AUTH_RATE_LIMIT_REDIS_URL` | URL Redis/Valkey pour rate limit distribue (optionnel) | `rediss://user:pass@redis-fr.example:6380/0` |
| `AUTH_RATE_LIMIT_KEY_PREFIX` | Prefix de cle Redis/Valkey (optionnel)       | `prx:auth:rl`                               |
| `AUTH_RATE_LIMIT_KEY_SALT` | Sel pour pseudonymiser les cles rate limit (optionnel) | `<long random secret>`               |
| `AUTH_RATE_LIMIT_REDIS_CONNECT_TIMEOUT_MS` | Timeout connexion Redis (ms) | `300` |
| `AUTH_RATE_LIMIT_REDIS_COMMAND_TIMEOUT_MS` | Timeout commande Redis (ms) | `300` |
| `API_PROXY_MAX_BODY_BYTES` | Taille max acceptee par le proxy BFF pour les corps de requete authentifies | `1048576` |
| `CSP_REPORT_URI`          | Endpoint `report-uri` CSP (optionnel)           | `/api/security/csp-report`                  |
| `CSP_REPORT_TO_URL`       | Endpoint `report-to` CSP (optionnel)            | `https://reports.praedixa.com/csp`          |

---

## Inventaire des pages

### Route group `(app)` -- pages authentifiees

| Route                 | Fichier                                 | Description                                                   |
| --------------------- | --------------------------------------- | ------------------------------------------------------------- |
| `/dashboard`          | `app/(app)/dashboard/page.tsx`          | Tableau de bord prioritaire (risques, couverture, arbitrages) |
| `/donnees`            | `app/(app)/donnees/page.tsx`            | Vue operationnelle consolidee                                 |
| `/donnees/datasets`   | `app/(app)/donnees/datasets/page.tsx`   | Fichiers importes, statuts pipeline et volumetrie             |
| `/donnees/canonique`  | `app/(app)/donnees/canonique/page.tsx`  | Alias de la vue consolidee canonique                          |
| `/donnees/gold`       | `app/(app)/donnees/gold/page.tsx`       | Explorateur complet de la couche Gold                         |
| `/previsions`         | `app/(app)/previsions/page.tsx`         | Projection capacite + decomposition des drivers               |
| `/previsions/alertes` | `app/(app)/previsions/alertes/page.tsx` | Liste complete des alertes avec filtres severite/statut       |
| `/previsions/modeles` | `app/(app)/previsions/modeles/page.tsx` | Monitoring IA/ML (MAPE, drift, latence, retrain)              |
| `/actions`            | `app/(app)/actions/page.tsx`            | Centre de traitement des alertes prioritaires                 |
| `/actions/historique` | `app/(app)/actions/historique/page.tsx` | Historique decisionnel (audit des choix passes)               |
| `/messages`           | `app/(app)/messages/page.tsx`           | Messagerie avec l'equipe Praedixa                             |
| `/rapports`           | `app/(app)/rapports/page.tsx`           | Rapports executifs et exports                                 |
| `/onboarding`         | `app/(app)/onboarding/page.tsx`         | Readiness client et checklist de mise en route                |
| `/parametres`         | `app/(app)/parametres/page.tsx`         | Gouvernance et reglages organisationnels                      |

### Route group `(auth)` -- pages et route handlers publics

| Route            | Description                           |
| ---------------- | ------------------------------------- |
| `/login`         | Connexion via OIDC (Keycloak)         |
| `/auth/callback` | Callback OAuth apres authentification |
| `/auth/login`    | Route handler qui initie le flow OIDC |
| `/auth/logout`   | Route handler de deconnexion avec revocation OIDC best-effort |
| `/auth/session`  | Refresh de token et lecture session   |

---

## Authentification

L'authentification repose sur **OIDC Authorization Code + PKCE**. Trois fichiers cles composent le systeme :

| Fichier                  | Role                                              |
| ------------------------ | ------------------------------------------------- |
| `lib/auth/middleware.ts` | Validation serveur de la session a chaque requete |
| `lib/auth/server.ts`     | Lecture/verification de session cote serveur      |
| `lib/auth/client.ts`     | Lecture de session client sans exposition du bearer |

### Flux proxy

Le proxy (`proxy.ts`) execute deux operations sur chaque requete :

1. **CSP nonce** -- genere un nonce unique par requete et l'injecte dans le header `Content-Security-Policy`.
2. **Session auth** -- appelle `updateSession()` qui valide la session signee cote serveur, verifie la correspondance avec les cookies d'acces/refresh et renouvelle les tokens si necessaire.

Regles de routage :

- **Non authentifie** → redirection vers `/login`
- **`super_admin`** → redirection vers `/login` (doit utiliser `app-admin`)
- **Authentifie sur `/login`** → redirection vers `/dashboard`
- **`/login?reauth=1`** → accessible meme authentifie (recovery apres 401)
- **`/login?reauth=1&reason=api_unauthorized&error_code=<code>&request_id=<id>`** → contexte de reauth explicite pour support/debug

Regles de scope role/site :

- **`super_admin`** : bloque sur `app-webapp`, doit utiliser `app-admin`
- **`org_admin`** : acces a tous les sites de son organisation
- **`manager` / `hr_manager`** : scope limite au site du claim `site_id` (absence de `site_id` => `403`)

### Session client

```typescript
// lib/auth/client.ts -- extrait
export function useCurrentUser(): CurrentUser | null {
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    fetch("/auth/session?min_ttl=60", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => setUser(payload?.user ?? null));
  }, []);

  return user;
}
```

Le refresh reste proactif cote serveur: si le token expire bientot, il est renouvele avant de proxifier l'appel backend. Le navigateur ne recoit jamais le bearer token.

---

## Client API

Toute communication avec le backend passe par le client type dans `lib/api/`.

### Architecture

```
app/api/v1/[...path]  -- BFF / proxy serveur Next.js vers l'API backend
lib/api/client.ts     -- client browser-aware, proxy same-origin cote navigateur
lib/api/endpoints.ts  -- wrappers types par domaine (forecasts, decisions, alerts, etc.)
```

Dans le navigateur, `lib/api/client.ts` passe toujours par le proxy same-origin `/api/v1/*`, qui injecte le bearer cote serveur depuis les cookies de session. Aucun composant client n'accede directement au token.

### Endpoints Gold (explorer)

La page `/donnees/gold` consomme directement les endpoints live suivants :

- `/api/v1/live/gold/schema`
- `/api/v1/live/gold/rows`
- `/api/v1/live/gold/coverage`
- `/api/v1/live/gold/provenance`

Le endpoint `/api/v1/live/gold/provenance` expose notamment `strictDataPolicyOk`, `forecastMockColumns` et `nonForecastMockColumns` pour verifier la politique "pas de mock hors forecasting".

```typescript
// Exemple d'utilisation dans un composant client
import { useApiGet } from "@/hooks/use-api";

const { data } = useApiGet("/api/v1/live/dashboard/summary");
```

### Domaines couverts par `endpoints.ts`

| Domaine         | Endpoints | Exemples de fonctions                                                    |
| --------------- | --------- | ------------------------------------------------------------------------ |
| Dashboard       | 1         | `getDashboardSummary`                                                    |
| Organisation    | 3         | `getOrganization`, `getSites`, `getDepartments`                          |
| Previsions      | 5         | `listForecasts`, `getDailyForecasts`, `runWhatIfScenario`                |
| Decisions       | 3         | `listDecisions`, `reviewDecision`, `recordDecisionOutcome`               |
| Arbitrage       | 2         | `getArbitrageOptions`, `validateArbitrage`                               |
| Alertes         | 2         | `getAlerts`, `dismissAlert`                                              |
| Coverage Alerts | 3         | `listCoverageAlerts`, `acknowledgeCoverageAlert`, `resolveCoverageAlert` |
| Scenarios       | 2         | `getScenariosForAlert`, `generateScenarios`                              |
| Datasets        | 5         | `listDatasets`, `getDataset`, `getDatasetData`, `getDatasetColumns`      |
| Canonical       | 2         | `listCanonical`, `getCanonicalQuality`                                   |
| Couts           | 3         | `listCostParameters`, `getEffectiveCostParameters`                       |
| Proof Packs     | 3         | `listProofPacks`, `getProofSummary`, `generateProof`                     |
| Conversations   | 5         | `listConversations`, `createConversation`, `sendConversationMessage`     |

---

## Architecture des composants

### Layout principal

L'application utilise un layout sidebar + topbar defini dans `app/(app)/layout.tsx` :

```
+--sidebar--+-----------------------------+
|  Praedixa  |  Topbar (organisation)     |
|  --------- |  ------------------------- |
|  Accueil   |                            |
|  Donnees   |     <page content>         |
|  Previsions|                            |
|  Actions   |                            |
|  Messages  |                            |
|  --------- |                            |
|  Rapports  |                            |
|  Parametres|                            |
+------------+----------------------------+
```

La sidebar (`components/sidebar.tsx`) est **collapsible** sur desktop et s'ouvre en overlay sur mobile. Elle affiche un badge de messages non lus sur l'item "Messages".

### Composants locaux

| Dossier                  | Contenu                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `components/dashboard/`  | `ForecastTimelineChart`, `NextActionCard`, `ScenarioComparisonChart`, `ForecastChart`                        |
| `components/previsions/` | `DecompositionPanel`, `FeatureImportanceBar`                                                                 |
| `components/actions/`    | `AlertSelector`, `OptimizationPanel`                                                                         |
| `components/chat/`       | `ConversationList`, `MessageThread`, `MessageInput`                                                          |
| `components/` (racine)   | `Sidebar`, `AnimatedSection`, `StatusBanner`, `EmptyState`, `ErrorFallback`, `PraedixaLogo`, `ToastProvider` |

### Composants partages (`@praedixa/ui`)

Les composants de la librairie partagee sont importes depuis `@praedixa/ui` :

- **StatCard** -- KPI card. `.value` doit etre `String()`, `.icon` doit etre un element JSX (`<Icon />`), pas une reference de composant.
- **DetailCard** -- Carte de contenu. `padding` accepte `"compact" | "default" | "loose"`.
- **DataTable** -- Tableau de donnees. Utilise `label` (pas `header`) pour les colonnes.
- **PageHeader**, **SkeletonCard**, **SkeletonChart**, **Button**, **Badge**

> Voir [`packages/ui/README.md`](../packages/ui/README.md) pour l'API complete.

---

## Hooks

| Hook                      | Fichier                        | Description                                                                                       |
| ------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------- |
| `useApiGet<T>`            | `hooks/use-api.ts`             | GET avec loading/error/refetch. Supporte `pollInterval`. Redirige vers `/login?reauth=1` sur 401. |
| `useApiGetPaginated<T>`   | `hooks/use-api.ts`             | GET pagine avec `page`, `limit`, retourne `data[]`, `total`, `pagination`.                        |
| `useApiPost<TReq, TRes>`  | `hooks/use-api.ts`             | Mutation POST avec `mutate()`, `loading`, `error`, `reset()`.                                     |
| `useApiPatch<TReq, TRes>` | `hooks/use-api.ts`             | Mutation PATCH, meme interface que `useApiPost`.                                                  |
| `useToast`                | `hooks/use-toast.ts`           | Notifications toast (necessite `<ToastProvider>`).                                                |
| `useAnimatedNumber`       | `hooks/use-animated-number.ts` | Anime un nombre de 0 a `target`. Respecte `prefers-reduced-motion`.                               |
| `useMediaQuery`           | `@praedixa/ui`                 | Fourni par le package partage, utilise dans le layout pour le responsive.                         |

Tous les hooks API gèrent automatiquement :

- `AbortController` pour annuler les requetes en cours lors du demontage
- La protection contre les races conditions (stale fetch guard via `fetchIdRef`)
- La redirection vers `/login?reauth=1` en cas de 401

---

## Styling

### Design system

Le design utilise l'espace colorimetrique **OKLCH** avec une source de verite partagee:

- `packages/ui/src/brand-tokens.css` (primitives globales)
- `packages/ui/tailwind.preset.js` (tokens semantiques Tailwind)
- `app/globals.css` (mapping app-specific light/dark)

| Token              | Valeur OKLCH             | Usage            |
| ------------------ | ------------------------ | ---------------- |
| `page` / `cream`   | `oklch(0.965 0.012 246)` | Fond principal   |
| `card` / `paper`   | `oklch(0.995 0.004 246)` | Surface elevee   |
| `ink` / `charcoal` | `oklch(0.24 0.04 248)`   | Texte principal  |
| `primary`          | `oklch(0.54 0.155 246)`  | Accent marque    |
| `success`          | `oklch(0.62 0.12 156)`   | Etat positif     |
| `warning`          | `oklch(0.72 0.12 88)`    | Etat attention   |
| `danger`           | `oklch(0.62 0.16 26)`    | Etat erreur      |
| `info`             | `oklch(0.62 0.11 226)`   | Etat information |

### Typographie

- **Corps** : Plus Jakarta Sans (`font-sans`)
- **Titres H2** : DM Serif Display (`font-serif`)

### Conventions

- Cards : `rounded-2xl`, `shadow-soft`
- Boutons : `rounded-lg`
- Animations : Framer Motion, desactivees si `prefers-reduced-motion`
- **Ne pas utiliser** `@apply` avec des modifiers d'opacite OKLCH (bug Tailwind 3.4). Utiliser du CSS brut.

---

## Tests

Les tests suivent le pattern de **co-location** : chaque composant ou module a son dossier `__tests__/` adjacent.

```
components/dashboard/
  forecast-timeline-chart.tsx
  __tests__/
    forecast-timeline-chart.test.tsx
```

### Execution

```bash
# Depuis la racine du monorepo
pnpm test                                    # Tous les tests (tous les workspaces)
pnpm vitest run app-webapp/hooks/use-api.ts  # Un fichier specifique
```

### Configuration

Les tests s'executent via **Vitest** avec la config partagee `testing/vitest.setup.ts` qui mock :

- `matchMedia` (responsive hooks)
- `ResizeObserver` (Tremor/charts)
- `IntersectionObserver` (scroll reveal)
- `crypto.randomUUID` (API client `X-Request-ID`)

**Couverture a 100%** : le seuil est applique en CI. Les lignes exclues sont annotees `/* v8 ignore */` avec justification.

---

## Deploiement

L'application est deployee sur **Scaleway Serverless Containers (fr-par)** via script local (sans GitHub Actions) :

```bash
pnpm run scw:bootstrap:frontends      # Bootstrap infra (idempotent)
pnpm run scw:deploy:webapp:staging    # Deploy staging
pnpm run scw:deploy:webapp:prod       # Deploy production
```

Le conteneur utilise `app-webapp/Dockerfile.scaleway`. Le build Next.js conserve `output: "standalone"` avec `transpilePackages` pour les packages monorepo (`@praedixa/ui`, `@praedixa/shared-types`).

Note DNS:

- Le routage public est actuellement en mode transitoire (delegation NS Cloudflare).
- `app.praedixa.com` et `staging-app.praedixa.com` resolvent deja vers les endpoints Scaleway.

### Securite HTTP

Les headers de securite sont configures dans `next.config.ts` :

- **CSP** : nonce-based, genere par requete dans `proxy.ts`
- **HSTS** : active en production (2 ans, preload)
- **X-Frame-Options** : `DENY`
- **Permissions-Policy** : geolocation, microphone, camera, payment desactives
- **API base URL** : HTTP autorise uniquement en local loopback, HTTPS obligatoire en production
- **Logout OIDC** : reveille la revocation upstream des tokens avant purge locale des cookies
- **COOP / CORP** : `same-origin` (mitigation Spectre)

---

## Voir aussi

- [`docs/ux-redesign-webapp.md`](../docs/ux-redesign-webapp.md) -- Specifications UX du tableau de bord
- [`packages/ui/README.md`](../packages/ui/README.md) -- Librairie de composants partagee
- [`app-api-ts/`](../app-api-ts/) -- Backend API TypeScript (HTTP)
- [`app-api/`](../app-api/) -- Data/ML engine Python (batch/jobs)
- [`CLAUDE.md`](../CLAUDE.md) -- Guide complet du monorepo
