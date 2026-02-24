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
# Remplir NEXT_PUBLIC_API_URL + AUTH_OIDC_* + AUTH_SESSION_SECRET

# 2. Installer les dependances (depuis la racine du monorepo)
pnpm install

# 3. Lancer le serveur de developpement
pnpm dev:webapp   # http://localhost:3001
```

> **Prerequis** : l'API backend doit tourner sur le port 8000 (`pnpm dev:api`) et PostgreSQL sur le port 5433 (`docker compose -f infra/docker-compose.yml up -d postgres`).

### Variables d'environnement

| Variable                  | Description                                     | Exemple                                     |
| ------------------------- | ----------------------------------------------- | ------------------------------------------- |
| `NEXT_PUBLIC_API_URL`     | URL de l'API backend                            | `http://localhost:8000`                     |
| `AUTH_OIDC_ISSUER_URL`    | URL realm OIDC (Keycloak)                       | `https://auth.praedixa.com/realms/praedixa` |
| `AUTH_OIDC_CLIENT_ID`     | Client ID OIDC webapp                           | `praedixa-webapp`                           |
| `AUTH_OIDC_CLIENT_SECRET` | Client secret OIDC (optionnel si client public) | `<secret>`                                  |
| `AUTH_OIDC_SCOPE`         | Scope OIDC                                      | `openid profile email offline_access`       |
| `AUTH_SESSION_SECRET`     | Secret de signature session                     | `<long random secret>`                      |

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
| `/auth/logout`   | Route handler de deconnexion          |
| `/auth/session`  | Refresh de token et lecture session   |

---

## Authentification

L'authentification repose sur **OIDC Authorization Code + PKCE**. Trois fichiers cles composent le systeme :

| Fichier                  | Role                                              |
| ------------------------ | ------------------------------------------------- |
| `lib/auth/middleware.ts` | Validation serveur de la session a chaque requete |
| `lib/auth/server.ts`     | Lecture/verification de session cote serveur      |
| `lib/auth/client.ts`     | Recuperation de token via `/auth/session`         |

### Flux proxy

Le proxy (`proxy.ts`) execute deux operations sur chaque requete :

1. **CSP nonce** -- genere un nonce unique par requete et l'injecte dans le header `Content-Security-Policy`.
2. **Session auth** -- appelle `updateSession()` qui valide le token via `getUser()` (validation serveur, pas `getSession()`).

Regles de routage :

- **Non authentifie** → redirection vers `/login`
- **`super_admin`** → redirection vers `/login` (doit utiliser `app-admin`)
- **Authentifie sur `/login`** → redirection vers `/dashboard`
- **`/login?reauth=1`** → accessible meme authentifie (recovery apres 401)

Regles de scope role/site :

- **`super_admin`** : bloque sur `app-webapp`, doit utiliser `app-admin`
- **`org_admin`** : acces a tous les sites de son organisation
- **`manager` / `hr_manager`** : scope limite au site du claim `site_id` (absence de `site_id` => `403`)

### Token refresh cote client

```typescript
// lib/auth/client.ts -- extrait
export async function getValidAccessToken(
  options: { minTtlSeconds?: number } = {},
): Promise<string | null> {
  const { minTtlSeconds = 60 } = options;
  const response = await fetch(`/auth/session?min_ttl=${minTtlSeconds}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as { accessToken?: string };
  return payload.accessToken ?? null;
}
```

Le refresh est proactif : si le token expire dans moins de 60 secondes, il est renouvele avant l'appel API.

---

## Client API

Toute communication avec le backend passe par le client type dans `lib/api/`.

### Architecture

```
lib/api/client.ts     -- fonctions generiques : apiGet, apiGetPaginated, apiPost, apiPatch, apiDelete
lib/api/endpoints.ts  -- wrappers types par domaine (forecasts, decisions, alerts, etc.)
```

Chaque fonction accepte un callback `GetAccessToken` qui est injecte par les hooks. Cela permet aux Server Components et aux Client Components d'utiliser la meme couche API avec des strategies d'authentification differentes.

### Endpoints Gold (explorer)

La page `/donnees/gold` consomme directement les endpoints live suivants :

- `/api/v1/live/gold/schema`
- `/api/v1/live/gold/rows`
- `/api/v1/live/gold/coverage`
- `/api/v1/live/gold/provenance`

Le endpoint `/api/v1/live/gold/provenance` expose notamment `strictDataPolicyOk`, `forecastMockColumns` et `nonForecastMockColumns` pour verifier la politique "pas de mock hors forecasting".

```typescript
// Exemple d'utilisation dans un composant
import { getDashboardSummary } from "@/lib/api/endpoints";
import { getValidAccessToken } from "@/lib/auth/client";

const summary = await getDashboardSummary(() => getValidAccessToken());
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
- **COOP / CORP** : `same-origin` (mitigation Spectre)

---

## Voir aussi

- [`docs/ux-redesign-webapp.md`](../docs/ux-redesign-webapp.md) -- Specifications UX du tableau de bord
- [`packages/ui/README.md`](../packages/ui/README.md) -- Librairie de composants partagee
- [`app-api-ts/`](../app-api-ts/) -- Backend API TypeScript (HTTP)
- [`app-api/`](../app-api/) -- Data/ML engine Python (batch/jobs)
- [`CLAUDE.md`](../CLAUDE.md) -- Guide complet du monorepo
