# app-admin -- Back-office super-admin Praedixa

Interface d'administration reservee a l'equipe Praedixa. Gestion multi-tenant des organisations clientes : supervision des donnees, previsions, alertes, facturation, onboarding, et messagerie -- avec une vue par client et par site.

**Stack** : Next.js 15 / React 19 / OIDC (PKCE) / Tailwind CSS (OKLCH) / Vitest
**Port** : `3002`
**Package** : `@praedixa/admin`
**Acces** : role `super_admin` requis dans les claims token OIDC

---

## Demarrage rapide

```bash
# 1. Variables d'environnement
cp app-admin/.env.local.example app-admin/.env.local
# Remplir NEXT_PUBLIC_API_URL, AUTH_OIDC_ISSUER_URL, AUTH_OIDC_CLIENT_ID, AUTH_SESSION_SECRET

# 2. Installer les dependances (depuis la racine du monorepo)
pnpm install

# 3. Lancer le serveur de developpement
pnpm dev:admin   # http://localhost:3002
```

> **Prerequis** : un utilisateur IdP avec role `super_admin` est necessaire. L'API backend doit tourner sur le port 8000.

### Variables d'environnement

| Variable               | Description                 | Exemple                                     |
| ---------------------- | --------------------------- | ------------------------------------------- |
| `NEXT_PUBLIC_API_URL`  | URL de l'API backend        | `http://localhost:8000`                     |
| `AUTH_OIDC_ISSUER_URL` | URL realm OIDC (Keycloak)   | `https://auth.praedixa.com/realms/praedixa` |
| `AUTH_OIDC_CLIENT_ID`  | Client ID OIDC admin        | `praedixa-admin`                            |
| `AUTH_SESSION_SECRET`  | Secret de signature session | `<long random secret>`                      |

---

## Navigation

L'admin possede 4 sections principales, accessibles via la sidebar :

| Icone     | Label          | Route         | Description                              |
| --------- | -------------- | ------------- | ---------------------------------------- |
| Home      | **Accueil**    | `/`           | Page d'accueil -- KPIs plateforme, inbox |
| Building2 | **Clients**    | `/clients`    | Liste des organisations clientes         |
| BookOpen  | **Journal**    | `/journal`    | Journal d'audit (append-only) et RGPD    |
| Settings  | **Parametres** | `/parametres` | Configuration plateforme                 |

La sidebar (`components/admin-sidebar.tsx`) affiche le badge "Admin" a cote du logo et l'email de l'utilisateur connecte en bas. Elle est collapsible sur desktop et en overlay sur mobile.

---

## Workspace client

La section **Clients** est le coeur de l'admin. Elle permet de naviguer dans les donnees d'une organisation specifique, filtrables par site.

### Arborescence des routes

```
/clients                           → Liste de toutes les organisations
/clients/[orgId]/vue-client        → Vue synthetique du client
/clients/[orgId]/donnees           → Datasets, ingestion, qualite
/clients/[orgId]/previsions        → Runs de previsions
/clients/[orgId]/alertes           → Alertes de couverture
/clients/[orgId]/config            → Parametres de couts, configuration
/clients/[orgId]/equipe            → Utilisateurs, roles, invitations
/clients/[orgId]/messages          → Conversations avec le client
```

### Architecture du layout client

Le layout `/clients/[orgId]/layout.tsx` met en place trois elements :

1. **`OrgHeader`** -- Nom de l'organisation, badge de plan (pilot/starter/pro/enterprise), badge de statut (active/suspended/churned), boutons d'action (suspendre, reactiver, changer plan).

2. **`ClientTabsNav`** -- Barre d'onglets horizontale avec 7 tabs :

| Onglet     | Route segment | Description                                   |
| ---------- | ------------- | --------------------------------------------- |
| Vue client | `vue-client`  | KPIs, resume, miroir de ce que voit le client |
| Donnees    | `donnees`     | Datasets importes, features, qualite          |
| Previsions | `previsions`  | Historique des runs de prevision              |
| Alertes    | `alertes`     | Alertes de couverture actives et historiques  |
| Config     | `config`      | Parametres de couts, seuils                   |
| Equipe     | `equipe`      | Gestion des utilisateurs, roles, invitations  |
| Messages   | `messages`    | Fil de conversation avec le client            |

3. **`SiteTree`** -- Panneau lateral gauche (desktop uniquement) avec l'arborescence sites/departements. Permet de filtrer les donnees par site. "Tous les sites" = aucun filtre.

### ClientContext

Le state du workspace client est partage via `ClientContext` :

```typescript
// app/(admin)/clients/[orgId]/client-context.tsx
interface ClientContextValue {
  orgId: string;
  orgName: string;
  selectedSiteId: string | null; // null = tous les sites
  setSelectedSiteId: (id: string | null) => void;
  hierarchy: SiteHierarchy[]; // sites + departements + employee count
}

// Utilisation dans un composant enfant
const { orgId, selectedSiteId } = useClientContext();
```

L'interface `SiteHierarchy` contient les sites avec leurs departements et le nombre d'employes, alimentee par l'endpoint `ADMIN_ENDPOINTS.organization(orgId)`.

---

## Composants admin

### Composants specifiques

| Composant       | Fichier                          | Description                                                         |
| --------------- | -------------------------------- | ------------------------------------------------------------------- |
| `AdminSidebar`  | `components/admin-sidebar.tsx`   | Sidebar avec 4 items, badge Admin, email utilisateur, bouton logout |
| `AdminTopbar`   | `components/admin-topbar.tsx`    | Barre superieure avec titre de page dynamique, hamburger mobile     |
| `OrgHeader`     | `components/org-header.tsx`      | En-tete organisation (nom + PlanBadge + OrgStatusBadge + actions)   |
| `ClientTabsNav` | `components/client-tabs-nav.tsx` | Navigation par onglets dans le workspace client                     |
| `SiteTree`      | `components/site-tree.tsx`       | Arborescence sites/departements, expandable, avec compteurs         |

### Badges

| Composant               | Props               | Valeurs                                         |
| ----------------------- | ------------------- | ----------------------------------------------- |
| `PlanBadge`             | `plan: PlanTier`    | `"pilot"`, `"starter"`, `"pro"`, `"enterprise"` |
| `OrgStatusBadge`        | `status: OrgStatus` | `"active"`, `"suspended"`, `"churned"`          |
| `OnboardingStatusBadge` | `status: string`    | Statut de l'onboarding                          |
| `SeverityBadge`         | `severity: string`  | Niveau de severite d'alerte                     |

### Skeletons

Quatre skeletons pre-construits dans `components/skeletons/` :

| Skeleton                 | Usage                     |
| ------------------------ | ------------------------- |
| `SkeletonAdminDashboard` | Page d'accueil admin      |
| `SkeletonOrgList`        | Liste des organisations   |
| `SkeletonOrgDetail`      | Detail d'une organisation |
| `SkeletonStepper`        | Stepper d'onboarding      |

### Systeme de messagerie

Le dossier `components/chat/` contient les composants de messagerie admin-client :

| Composant          | Role                                                           |
| ------------------ | -------------------------------------------------------------- |
| `ConversationList` | Liste des conversations d'une organisation                     |
| `MessageThread`    | Fil de messages d'une conversation                             |
| `MessageInput`     | Champ de saisie avec sanitization (HTML strip, 5000 chars max) |

---

## Client API admin

### Endpoints

Les endpoints admin sont definis dans `lib/api/endpoints.ts` sous la constante `ADMIN_ENDPOINTS`. Tous les chemins commencent par `/api/v1/admin/`.

```typescript
// lib/api/endpoints.ts -- extrait
const V1 = "/api/v1/admin";

export const ADMIN_ENDPOINTS = {
  organizations: `${V1}/organizations`,
  organization: (orgId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}`,
  orgHierarchy: (orgId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/hierarchy`,
  orgUsers: (orgId: string) =>
    `${V1}/organizations/${encodeURIComponent(orgId)}/users`,
  // ... 40+ endpoints
} as const;
```

### Categories d'endpoints

| Categorie               | Exemples                                | Endpoints                                        |
| ----------------------- | --------------------------------------- | ------------------------------------------------ |
| Monitoring              | KPIs plateforme, tendances, erreurs     | `platformKPIs`, `trends`, `errors`               |
| Organisations           | CRUD, suspension, churn                 | `organizations`, `orgSuspend`, `orgChurn`        |
| Utilisateurs            | Liste, invitation, roles, desactivation | `orgUsers`, `orgUserRole`, `orgUserInvite`       |
| Facturation             | Billing, changement de plan, historique | `orgBilling`, `orgChangePlan`, `orgPlanHistory`  |
| Audit                   | Journal d'audit append-only             | `auditLog`                                       |
| Onboarding              | Liste, demarrage, progression par etape | `onboardingList`, `onboardingStep`               |
| Monitoring operationnel | Alertes, scenarios, decisions, ROI      | `monitoringAlertsSummary`, `monitoringRoiByOrg`  |
| Per-org operationnel    | Canonical, couts, alertes, proof packs  | `orgCanonical`, `orgCostParams`, `orgProofPacks` |
| Conversations           | Liste, messages, statut, non lus        | `orgConversations`, `conversationMessages`       |

### Acces cross-tenant

Contrairement au webapp (scope a une seule organisation), l'admin accede a **toutes les organisations**. Cote API, cela utilise `get_admin_tenant_filter()` qui donne un `TenantFilter` cross-org aux requetes provenant d'un `super_admin`.

### Hooks API

Les hooks sont identiques a ceux du webapp (`hooks/use-api.ts`) :

| Hook                      | Description                                       |
| ------------------------- | ------------------------------------------------- |
| `useApiGet<T>`            | GET avec loading/error/refetch, polling optionnel |
| `useApiGetPaginated<T>`   | GET pagine (`page`, `limit`)                      |
| `useApiPost<TReq, TRes>`  | Mutation POST                                     |
| `useApiPatch<TReq, TRes>` | Mutation PATCH                                    |
| `useToast`                | Notifications toast                               |

---

## Authentification et securite

### Middleware

Le middleware (`middleware.ts`) fonctionne comme celui du webapp avec une difference critique :

| Regle                       | Webapp                           | Admin                          |
| --------------------------- | -------------------------------- | ------------------------------ |
| Utilisateur non authentifie | → `/login`                       | → `/login`                     |
| Role `super_admin`          | → **rejete** (redirige `/login`) | → **accepte**                  |
| Autre role authentifie      | → accepte                        | → **rejete** (`/unauthorized`) |

```typescript
// lib/auth/middleware.ts -- extrait
if (session && !isLoginRoute && !isAuthRoute) {
  if (session.role !== "super_admin") {
    const unauthorizedUrl = new URL("/unauthorized", request.url);
    return NextResponse.redirect(unauthorizedUrl);
  }
}
```

Le role est lu depuis les claims du token OIDC (`realm_access` / `resource_access` / `app_metadata` selon l'IdP) puis normalise cote serveur.

### CSP nonce-based

Identique au webapp : un nonce unique est genere par requete dans `middleware.ts`, injecte dans le header `Content-Security-Policy` via `lib/security/csp.ts`. En developpement, `'unsafe-inline'` est autorise pour le HMR de Next.js. En production, seuls les scripts nonced sont executes.

### Headers de securite

Configures dans `next.config.ts` :

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security` (production uniquement)
- `Cross-Origin-Opener-Policy: same-origin`
- `Permissions-Policy` : geolocation, microphone, camera, payment, usb desactives

---

## Tests

### Configuration

L'admin possede sa propre configuration Vitest dans `vitest.config.ts` :

```typescript
// vitest.config.ts
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname) } },
  test: {
    name: "admin",
    globals: true,
    environment: "jsdom",
    setupFiles: [path.resolve(__dirname, "../testing/vitest.setup.ts")],
    include: ["**/*.{test,spec}.{ts,tsx}"],
  },
});
```

Les tests partagent le setup global `testing/vitest.setup.ts` (mocks `matchMedia`, `ResizeObserver`, `IntersectionObserver`, `crypto.randomUUID`).

### Execution

```bash
# Depuis la racine du monorepo
pnpm test                                         # Tous les tests
pnpm vitest run app-admin/components/__tests__/    # Tests admin uniquement
```

### Convention

Les tests suivent le pattern de **co-location** (`__tests__/` adjacent au fichier teste). Couverture a 100% exigee en CI.

---

## Deploiement

L'application admin est deployee sur **Scaleway Serverless Containers (fr-par)** via script local (sans GitHub Actions) :

```bash
pnpm run scw:bootstrap:frontends      # Bootstrap infra (idempotent)
pnpm run scw:deploy:admin:staging     # Deploy staging
pnpm run scw:deploy:admin:prod        # Deploy production
```

Le conteneur utilise `app-admin/Dockerfile.scaleway`.

Note DNS:

- Le routage public est actuellement en mode transitoire (delegation NS Cloudflare).
- `admin.praedixa.com` et `staging-admin.praedixa.com` resolvent deja vers les endpoints Scaleway.

---

## Structure des fichiers

```
app-admin/
  app/
    (admin)/                    # Routes protegees super_admin
      layout.tsx                # Layout sidebar + topbar
      page.tsx                  # Accueil (/)
      clients/
        page.tsx                # Liste organisations (/clients)
        [orgId]/
          layout.tsx            # Layout workspace client
          client-context.tsx    # Context React (orgId, site, hierarchy)
          page.tsx              # Redirection vers vue-client
          vue-client/page.tsx
          donnees/page.tsx
          previsions/page.tsx
          alertes/page.tsx
          config/page.tsx
          equipe/page.tsx
          messages/page.tsx
      journal/page.tsx          # Journal d'audit (/journal)
      parametres/page.tsx       # Parametres (/parametres)
    (auth)/
      layout.tsx
      login/page.tsx
    auth/callback/route.ts      # Callback OAuth
    unauthorized/page.tsx       # Page "acces non autorise"
  components/
    admin-sidebar.tsx
    admin-topbar.tsx
    client-tabs-nav.tsx
    org-header.tsx
    site-tree.tsx
    plan-badge.tsx
    org-status-badge.tsx
    onboarding-status-badge.tsx
    severity-badge.tsx
    chat/                       # ConversationList, MessageThread, MessageInput
    skeletons/                  # 4 skeletons pre-construits
  hooks/
    use-api.ts                  # useApiGet, useApiGetPaginated, useApiPost, useApiPatch
    use-toast.ts                # useToast
  lib/
    api/client.ts               # apiGet, apiPost, apiPatch, apiDelete, ApiError
    api/endpoints.ts            # ADMIN_ENDPOINTS (40+ endpoints)
    auth/client.ts              # Client auth navigateur (session endpoint)
    auth/middleware.ts           # Validation session + role super_admin
    auth/server.ts              # Lecture session serveur
    security/csp.ts             # Nonce CSP + header builder
```

---

## Voir aussi

- [`app-webapp/README.md`](../app-webapp/README.md) -- Application client
- [`packages/ui/README.md`](../packages/ui/README.md) -- Librairie de composants partagee
- [`app-api-ts/`](../app-api-ts/) -- Backend API TypeScript (routes admin sous `/api/v1/admin/`)
- [`app-api/`](../app-api/) -- Data/ML engine Python (batch/jobs)
- [`docs/security/`](../docs/security/) -- Rapports de securite
- [`CLAUDE.md`](../CLAUDE.md) -- Guide complet du monorepo
