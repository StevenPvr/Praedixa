# Audit Securite Frontend — Praedixa

**Date** : 2026-02-08
**Scope** : app-webapp, app-admin, app-landing, packages/ui
**Auditeur** : bastion (agent securite frontend)

---

## Resume Executif

Le frontend Praedixa presente une posture de securite **solide** avec des fondations bien concues. Les problemes identifies sont principalement des durcissements manquants plutot que des vulnerabilites actives. Le fix P1 CSP nonce-based a ete implemente dans ce meme sprint.

| Severite     | Nombre | Status                                                      |
| ------------ | ------ | ----------------------------------------------------------- |
| P1 (Haute)   | 2      | 1 fixe (CSP nonce), 1 accepted risk (rate limiting landing) |
| P2 (Moyenne) | 2      | Findings documentes                                         |
| P3 (Faible)  | 3      | Findings documentes                                         |
| Info         | 4      | Points positifs notes                                       |

---

## 1. Content Security Policy (CSP) — FIXE

**Severite** : P1
**Fichiers** : `app-*/middleware.ts`, `app-*/next.config.ts`, `app-*/lib/security/csp.ts`

### Avant (vulnerabilite)

Les 3 apps utilisaient `script-src 'self' 'unsafe-inline'` et `style-src 'self' 'unsafe-inline'` en headers statiques dans `next.config.ts`. La directive `'unsafe-inline'` annule la protection XSS offerte par CSP car tout script inline injecte par un attaquant serait autorise.

### Apres (fix applique)

- Implementation nonce-based dans le middleware Next.js (generation par requete)
- `script-src 'self' 'nonce-<random>' 'strict-dynamic'` — propage la confiance aux scripts charges dynamiquement
- `style-src 'self' 'nonce-<random>'` en production, `'unsafe-inline'` en dev uniquement (HMR)
- Le nonce est transmis aux Server Components via le header `x-nonce`
- `'unsafe-eval'` autorise en dev uniquement pour le HMR de Next.js
- 21 tests unitaires ajoutés (7 par app)

### Fichiers modifies

- `app-webapp/middleware.ts` — fusion auth + CSP nonce
- `app-admin/middleware.ts` — fusion auth + CSP nonce
- `app-landing/middleware.ts` — cree (n'existait pas)
- `app-*/lib/security/csp.ts` — module genNonce + buildCspHeader
- `app-*/next.config.ts` — suppression CSP statique

---

## 2. Rate Limiting In-Memory (Landing) — ACCEPTED RISK

**Severite** : P1
**Fichier** : `app-landing/app/api/pilot-application/route.ts:28-57`

### Constat

Le rate limiting de la route `/api/pilot-application` utilise une `Map` en memoire :

- **Reset au redeploy** : chaque deploiement Cloudflare Workers reinitialise le compteur
- **Ne scale pas** : si plusieurs instances Workers tournent, chaque instance a sa propre Map
- **Eviction bornee** : `MAX_RATE_LIMIT_ENTRIES = 10_000` empeche la croissance memoire illimitee (bon)

### Risque residuel

Un attaquant peut soumettre `MAX_REQUESTS_PER_WINDOW * nombre_instances` requetes par heure. En pratique, Cloudflare Workers partage souvent un seul isolate par route, ce qui limite l'impact.

### Recommandation

Pour une protection robuste en production :

- Utiliser Cloudflare Rate Limiting (couche Workers) ou un store KV/Durable Object
- Alternative : validation CAPTCHA cote formulaire (deja protege par honeypot)

### Mitigations existantes (bonnes)

- Honeypot field (`website`) avec reponse silencieuse `{ success: true }` pour les bots
- Validation stricte avec allowlists (secteur, effectif)
- Taille de corps limitee (`MAX_REQUEST_BODY_LENGTH = 2_000`)
- IP extraite de `CF-Connecting-IP` (fiable sur Cloudflare)

---

## 3. Open Redirect — SECURE

**Severite** : Info (pas de vulnerabilite)
**Fichiers** : `app-*/app/auth/callback/route.ts`

### Analyse

Le callback OAuth accepte un parametre `next` pour la redirection post-auth :

```ts
const safeNext =
  next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
return NextResponse.redirect(`${origin}${safeNext}`);
```

**Verdict** : Correctement protege. Le check `startsWith("/") && !startsWith("//")` bloque :

- Les URLs absolues (`https://evil.com`)
- Les URLs protocol-relative (`//evil.com`)
- Le fallback est `/dashboard` (sain)

Toutes les autres redirections dans le code sont vers des chemins relatifs hardcodes (`/login`, `/dashboard`, `/organisations/...`).

---

## 4. XSS — SECURE (avec nuances)

**Severite** : Info (pas de vulnerabilite active)

### dangerouslySetInnerHTML

Utilise uniquement dans `app-landing/components/seo/JsonLd.tsx` et `BreadcrumbSchema.tsx` pour les schemas JSON-LD. Les donnees sont :

- **JsonLd** : schemas statiques (pas de donnees utilisateur), avec `toJsonLd()` qui escape `<` en `\u003c`
- **BreadcrumbSchema** : items passes par props depuis des donnees statiques, avec le meme escaping

**Verdict** : Safe. Pas de `dangerouslySetInnerHTML` avec des donnees utilisateur dans webapp, admin, ou packages/ui.

### Rendu d'erreurs Supabase

Les pages de login affichent `authError.message` dans le DOM via `{error}` :

```tsx
{
  error && <div className="...">{error}</div>;
}
```

React echappe automatiquement les strings dans JSX, donc pas de risque XSS. Cependant, les messages d'erreur Supabase pourraient leaker des informations (voir point 6).

---

## 5. Gestion des Tokens & Cookies — SECURE

**Severite** : Info
**Fichiers** : `app-*/lib/auth/client.ts`, `app-*/lib/auth/middleware.ts`

### Architecture

- Les tokens Supabase sont geres entierement par `@supabase/ssr` (cookies httpOnly geres cote serveur)
- Le client browser utilise `createBrowserClient` qui stocke les tokens dans des cookies geres par le SDK
- Pas de stockage manuel de tokens dans `localStorage` ou `sessionStorage`
- Les cookies de session sont rafraichis via `getUser()` (server-validated) dans le middleware

### Points positifs

- Singleton pattern pour eviter les races de refresh tokens
- `clearAuthSession` utilise `signOut({ scope: "local" })` — pas de round-trip reseau
- Le middleware utilise `getUser()` au lieu de `getSession()` (evite les sessions stale)

### Note : cookies Supabase

Les flags cookies (httpOnly, secure, sameSite) sont geres par `@supabase/ssr` selon l'environnement. En production HTTPS, le SDK applique automatiquement `secure; sameSite=lax; httpOnly`. Ce n'est pas configurable manuellement sans forker le SDK.

---

## 6. Messages d'Erreur Login — P2

**Severite** : P2 (Moyenne)
**Fichiers** : `app-webapp/app/(auth)/login/page.tsx:31-34`, `app-admin/app/(auth)/login/page.tsx:31-34`

### Constat

Les pages de login affichent directement `authError.message` de Supabase :

```ts
if (authError) {
  setError(authError.message);
}
```

Supabase renvoie des messages differents pour :

- Email inexistant : `"Invalid login credentials"`
- Mot de passe incorrect : `"Invalid login credentials"`

**Verdict** : Supabase utilise un message generique identique pour les deux cas, ce qui est correct. Cependant, d'autres erreurs Supabase pourraient exposer des details internes (ex: `"Email not confirmed"`, `"User banned"`).

### Recommandation

Wrapper le message d'erreur avec un message generique :

```ts
setError("Identifiants invalides. Veuillez reessayer.");
```

Sauf pour le cas specifique `reauth=1` qui affiche deja un message fixe.

---

## 7. encodeURIComponent dans les URLs dynamiques — SECURE

**Severite** : Info (pas de vulnerabilite)

### Webapp (`app-webapp/lib/api/endpoints.ts`)

Tous les path params sont encodes :

```ts
`/api/v1/forecasts/${encodeURIComponent(forecastId)}/summary``/api/v1/decisions/${encodeURIComponent(decisionId)}``/api/v1/arbitrage/${encodeURIComponent(alertId)}/options`;
```

### Admin (`app-admin/lib/api/endpoints.ts`)

Idem, encodage systematique :

```ts
`${V1}/organizations/${encodeURIComponent(orgId)}``${V1}/billing/organizations/${encodeURIComponent(orgId)}/change-plan`;
```

### Admin pages (router.push)

Les navigations frontend encodent egalement :

```ts
router.push(`/organisations/${encodeURIComponent(orgId)}`);
router.push(`/organisations/${encodeURIComponent(row.id)}`);
```

### Note sur API_ENDPOINTS constants

Les constantes statiques dans `API_ENDPOINTS` (ex: `coverageAlerts.acknowledge(id)`) n'utilisent PAS `encodeURIComponent` :

```ts
acknowledge: (id: string) => `/api/v1/coverage-alerts/${id}/acknowledge`,
```

**Impact** : Faible car ces IDs sont des UUIDs generes par le serveur (format fixe `[a-f0-9-]`), donc pas de caracteres speciaux possibles. Neanmoins, pour la coherence, l'encodage serait preferable.

---

## 8. Client API — P3

**Severite** : P3 (Faible)
**Fichier** : `app-webapp/lib/api/client.ts`, `app-admin/lib/api/client.ts`

### Erreurs exposees

Le client API propage les messages d'erreur du serveur :

```ts
throw new ApiError(
  errorData?.error?.message ?? `Request failed with status ${response.status}`,
  response.status,
  errorData?.error?.code,
  errorData?.error?.details,
);
```

Le hook `use-api.ts` affiche ensuite `err.message` dans l'UI. Les messages d'erreur du backend sont controles (PraedixaError hierarchy) et ne contiennent pas de stack traces, mais `errorData?.error?.details` pourrait potentiellement exposer des informations de validation internes.

### Recommandation

Les hooks devraient filtrer `details` avant affichage client, ou le backend ne devrait pas inclure `details` dans les reponses 4xx/5xx (il le fait pour les erreurs de validation 422, ce qui est acceptable).

---

## 9. CSRF Protection — P3

**Severite** : P3 (Faible)

### Analyse

- Les mutations (POST/PATCH/DELETE) utilisent le header `Authorization: Bearer <token>` et `Content-Type: application/json`
- Un token CSRF n'est pas necessaire car :
  1. L'API verifie le JWT dans le header `Authorization` (pas de cookie-based auth pour les mutations)
  2. Les requetes `application/json` ne peuvent pas etre forgees par un formulaire HTML cross-origin
  3. CORS est configure cote API (non audite ici, voir audit backend)

### Point d'attention

Le `X-Request-ID: crypto.randomUUID()` est genere cote client — c'est un header de tracabilite, pas un token anti-CSRF.

---

## 10. Super Admin Enforcement — SECURE

**Severite** : Info
**Fichiers** : `app-webapp/lib/auth/middleware.ts`, `app-admin/lib/auth/middleware.ts`

### Webapp

Les `super_admin` sont rejetes et rediriges vers `/login` :

```ts
if (role === "super_admin") {
  return NextResponse.redirect(loginUrl);
}
```

### Admin

Les non-`super_admin` sont rediriges vers `/unauthorized` :

```ts
if (role !== "super_admin") {
  return NextResponse.redirect(unauthorizedUrl);
}
```

**Verdict** : Correct. Le role est lu depuis `app_metadata.role` (set par l'admin API Supabase, non modifiable par l'utilisateur).

---

## 11. Composants UI Partages — SECURE

**Severite** : Info
**Fichier** : `packages/ui/src/components/*`

Audit des 15 composants partages (`alert`, `avatar`, `badge`, `button`, `card`, `data-table`, `date-range-picker`, `form-field`, `heatmap-grid`, `input`, `label`, `metric-card`, `page-header`, `pareto-chart`, `select-dropdown`, `skeleton`, `spinner`, `stat-card`, `status-badge`, `tab-bar`, `waterfall-chart`).

- Aucun `dangerouslySetInnerHTML`
- Aucune injection de style dynamique non-escapee
- Aucun eval() ou Function()
- Props typed avec TypeScript strict

---

## 12. Email Template XSS (Landing) — P3

**Severite** : P3 (Faible, bien gere)
**Fichier** : `app-landing/app/api/pilot-application/route.ts`

### Constat

Les templates email interpolent des donnees utilisateur dans du HTML :

```ts
const safeCompanyName = escapeHtml(companyName);
// ...
html: `<td>${safeCompanyName}</td>`;
```

### Verdict

La fonction `escapeHtml()` est correcte et couvre les 5 caracteres HTML dangereux (`&`, `<`, `>`, `"`, `'`). De plus, le sujet email est nettoye des newlines (prevention injection header SMTP). La validation stricte en amont (allowlists, regex) ajoute une couche de defense.

**Seule amelioration possible** : considerer une lib d'email templating (ex: react-email, mjml) pour eliminer le risque d'injection HTML par construction.

---

## Mapping OWASP Top 10 Web (2021)

| #   | Categorie OWASP           | Statut           | References                                                                          |
| --- | ------------------------- | ---------------- | ----------------------------------------------------------------------------------- |
| A01 | Broken Access Control     | **Secure**       | Middleware auth getUser() + role checks, tenant isolation cote API                  |
| A02 | Cryptographic Failures    | **Secure**       | Tokens Supabase geres par SDK (JWE), HSTS en prod, pas de secrets dans le client    |
| A03 | Injection (XSS)           | **Fixe P1**      | CSP nonce-based implemente, pas de dangerouslySetInnerHTML avec donnees utilisateur |
| A04 | Insecure Design           | **Secure**       | Architecture defense-in-depth (middleware + API + RLS), separation webapp/admin     |
| A05 | Security Misconfiguration | **Fixe P1**      | CSP durcie, headers securite complets (HSTS, X-Frame, CORP, COOP)                   |
| A06 | Vulnerable Components     | N/A              | Voir audit DevOps (supply chain)                                                    |
| A07 | Auth Failures             | **Attention P2** | Messages d'erreur login pourraient etre plus generiques                             |
| A08 | Software Integrity        | **Secure**       | `'strict-dynamic'` CSP + `integrity` possible pour les scripts                      |
| A09 | Logging & Monitoring      | **Partiel**      | X-Request-ID pour tracabilite, pas de CSP violation reporting (recommande)          |
| A10 | SSRF                      | N/A              | Pas de requetes server-side vers des URLs utilisateur                               |

---

## Recommandations Prioritisees

### Court terme (sprint suivant)

1. ~~**P1 CSP nonce-based**~~ — FAIT
2. **P2 Messages login** — Wrapper les erreurs Supabase avec un message generique
3. **P2 CSP Violation Reporting** — Ajouter `report-uri` ou `report-to` dans le CSP pour monitorer les violations en production

### Moyen terme

4. **P3 Rate limiting landing** — Migrer vers Cloudflare Rate Limiting ou Durable Objects
5. **P3 `encodeURIComponent` dans API_ENDPOINTS** — Ajouter encodage aux constantes dynamiques pour coherence
6. **P3 Email templating** — Considerer react-email pour les templates HTML

### Long terme

7. **CSP Report-Only** — Deployer d'abord en `Content-Security-Policy-Report-Only` pour valider avant enforcement
8. **Subresource Integrity (SRI)** — Ajouter `integrity` aux scripts tiers si ajoutes a l'avenir
