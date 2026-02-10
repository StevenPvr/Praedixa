# app-webapp -- Tableau de bord client Praedixa

Application de pilotage de capacite pour les responsables de sites logistiques. Previsions d'absences, alertes de couverture, scenarios d'arbitrage et suivi des decisions -- le tout centralise dans un tableau de bord unique.

**Stack** : Next.js 15 / React 19 / Supabase SSR / Tailwind CSS (OKLCH) / Cloudflare Workers
**Port** : `3001`
**Package** : `@praedixa/webapp`

---

## Demarrage rapide

```bash
# 1. Variables d'environnement
cp app-webapp/.env.local.example app-webapp/.env.local
# Remplir NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_API_URL

# 2. Installer les dependances (depuis la racine du monorepo)
pnpm install

# 3. Lancer le serveur de developpement
pnpm dev:webapp   # http://localhost:3001
```

> **Prerequis** : l'API backend doit tourner sur le port 8000 (`pnpm dev:api`) et PostgreSQL sur le port 5433 (`docker compose -f infra/docker-compose.yml up -d postgres`).

### Variables d'environnement

| Variable                        | Description                  | Exemple                   |
| ------------------------------- | ---------------------------- | ------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | URL du projet Supabase       | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cle publique (anon) Supabase | `eyJhbGciOi...`           |
| `NEXT_PUBLIC_API_URL`           | URL de l'API backend         | `http://localhost:8000`   |

---

## Inventaire des pages

### Route group `(app)` -- pages authentifiees

| Route               | Fichier                               | Description                                                         |
| ------------------- | ------------------------------------- | ------------------------------------------------------------------- |
| `/dashboard`        | `app/(app)/dashboard/page.tsx`        | Vue d'ensemble : KPIs couverture, alertes, prevision 14j, scenarios |
| `/donnees`          | `app/(app)/donnees/page.tsx`          | Exploration des datasets et journaux d'ingestion                    |
| `/previsions`       | `app/(app)/previsions/page.tsx`       | Liste des runs de prevision, decomposition, importance des features |
| `/actions`          | `app/(app)/actions/page.tsx`          | Alertes de couverture, selection d'alerte, panneau d'optimisation   |
| `/messages`         | `app/(app)/messages/page.tsx`         | Messagerie avec l'equipe Praedixa (conversations, fil de messages)  |
| `/rapports`         | `app/(app)/rapports/page.tsx`         | Proof packs, exports, historique des couts                          |
| `/parametres`       | `app/(app)/parametres/page.tsx`       | Configuration organisation, sites, parametres de couts              |
| `/coverage-harness` | `app/(app)/coverage-harness/page.tsx` | Page utilitaire pour la couverture de tests                         |

### Route group `(auth)` -- pages publiques

| Route            | Description                           |
| ---------------- | ------------------------------------- |
| `/login`         | Connexion via Supabase Auth           |
| `/auth/callback` | Callback OAuth apres authentification |

---

## Authentification

L'authentification repose sur **Supabase SSR** (`@supabase/ssr`). Trois fichiers cles composent le systeme :

| Fichier                  | Role                                              |
| ------------------------ | ------------------------------------------------- |
| `lib/auth/middleware.ts` | Validation serveur de la session a chaque requete |
| `lib/auth/server.ts`     | Client Supabase cote serveur (Server Components)  |
| `lib/auth/client.ts`     | Client Supabase cote navigateur (singleton)       |

### Flux middleware

Le middleware (`middleware.ts`) execute deux operations sur chaque requete :

1. **CSP nonce** -- genere un nonce unique par requete et l'injecte dans le header `Content-Security-Policy`.
2. **Session auth** -- appelle `updateSession()` qui valide le token via `getUser()` (validation serveur, pas `getSession()`).

Regles de routage :

- **Non authentifie** → redirection vers `/login`
- **`super_admin`** → redirection vers `/login` (doit utiliser `app-admin`)
- **Authentifie sur `/login`** → redirection vers `/dashboard`
- **`/login?reauth=1`** → accessible meme authentifie (recovery apres 401)

### Token refresh cote client

```typescript
// lib/auth/client.ts -- extrait
export async function getValidAccessToken(
  options: { minTtlSeconds?: number } = {},
): Promise<string | null> {
  const { minTtlSeconds = 60 } = options;
  const supabase = getSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  let nextSession = session;
  const isExpiringSoon =
    !!nextSession?.expires_at &&
    nextSession.expires_at - Math.floor(Date.now() / 1000) <= minTtlSeconds;

  if (!nextSession || isExpiringSoon) {
    const { data } = await supabase.auth.refreshSession();
    nextSession = data.session;
  }
  return nextSession?.access_token ?? null;
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

| Dossier                  | Contenu                                                                                                                       |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `components/dashboard/`  | `ForecastTimelineChart`, `NextActionCard`, `ScenarioComparisonChart`, `ForecastChart`                                         |
| `components/previsions/` | `DecompositionPanel`, `FeatureImportanceBar`                                                                                  |
| `components/actions/`    | `AlertSelector`, `OptimizationPanel`                                                                                          |
| `components/chat/`       | `ConversationList`, `MessageThread`, `MessageInput`                                                                           |
| `components/` (racine)   | `Sidebar`, `AnimatedSection`, `StaggeredGrid`, `StatusBanner`, `EmptyState`, `ErrorFallback`, `PraedixaLogo`, `ToastProvider` |

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

Le design utilise l'espace colorimetrique **OKLCH** pour toutes les couleurs, defini dans `tailwind.config.js` et `app/globals.css`.

| Token            | Valeur OKLCH             | Usage                         |
| ---------------- | ------------------------ | ----------------------------- |
| `page` / `cream` | `oklch(0.984 0.003 106)` | Fond de page (creme chaud)    |
| `card` / `paper` | `oklch(1 0 0)`           | Fond des cartes               |
| `sidebar`        | `oklch(0.145 0 0)`       | Fond sidebar (charcoal fonce) |
| `charcoal`       | `oklch(0.145 0 0)`       | Texte principal               |
| `amber-400`      | `oklch(0.828 0.208 84)`  | Couleur active sidebar        |
| `amber-500`      | `oklch(0.769 0.205 70)`  | Accent principal              |

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

L'application est deployee sur **Cloudflare Workers** via [OpenNext](https://opennext.js.org/) :

```bash
pnpm --filter @praedixa/webapp cf:build   # Build pour Cloudflare
pnpm --filter @praedixa/webapp preview    # Preview locale (Wrangler)
pnpm --filter @praedixa/webapp deploy     # Deployer en production
```

La configuration OpenNext est dans `open-next.config.ts`. Le build Next.js utilise `output: "standalone"` avec `transpilePackages` pour les packages monorepo (`@praedixa/ui`, `@praedixa/shared-types`).

### Securite HTTP

Les headers de securite sont configures dans `next.config.ts` :

- **CSP** : nonce-based, genere par requete dans `middleware.ts`
- **HSTS** : active en production (2 ans, preload)
- **X-Frame-Options** : `DENY`
- **Permissions-Policy** : geolocation, microphone, camera, payment desactives
- **COOP / CORP** : `same-origin` (mitigation Spectre)

---

## Voir aussi

- [`docs/ux-redesign-webapp.md`](../docs/ux-redesign-webapp.md) -- Specifications UX du tableau de bord
- [`packages/ui/README.md`](../packages/ui/README.md) -- Librairie de composants partagee
- [`app-api/`](../app-api/) -- Backend FastAPI
- [`CLAUDE.md`](../CLAUDE.md) -- Guide complet du monorepo
