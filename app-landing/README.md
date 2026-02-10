# Landing Page

**URL :** `praedixa.com`
**Hebergement :** Cloudflare Workers (OpenNext)
**Stack :** Next.js 15 App Router, React 19, Tailwind CSS 3.4, Framer Motion

## Objectif

Site marketing qui :

- Explique la boucle "Capacite -> Decision -> Preuve"
- Rassure (methode, auditabilite, securite, minimisation)
- Capte la demande (demo / diagnostic via le formulaire pilote)

## Developpement

```bash
pnpm dev:landing   # Demarre sur http://localhost:3000 (Turbopack)
```

## Deploiement

Le deploiement est gere par GitHub Actions (push sur `main`).
Configuration Cloudflare dans `wrangler.jsonc`.

## Preview Workers (local)

```bash
cp .dev.vars.example .dev.vars
pnpm preview
```

## Notes

- Pas de donnees client sensibles stockees localement
- CDN mondial OK (assets publics uniquement)

---

## Pages

| Route                    | Description                                       | Fichier                              |
| ------------------------ | ------------------------------------------------- | ------------------------------------ |
| `/`                      | Page d'accueil (9 sections marketing)             | `app/page.tsx`                       |
| `/devenir-pilote`        | Formulaire de candidature entreprise pilote       | `app/devenir-pilote/page.tsx`        |
| `/cgu`                   | Conditions generales d'utilisation                | `app/cgu/page.tsx`                   |
| `/confidentialite`       | Politique de confidentialite                      | `app/confidentialite/page.tsx`       |
| `/mentions-legales`      | Mentions legales                                  | `app/mentions-legales/page.tsx`      |
| `/logo-preview`          | Preview du logo (usage interne)                   | `app/logo-preview/page.tsx`          |
| `/api/health`            | Health check (verifie `RESEND_API_KEY`)           | `app/api/health/route.ts`            |
| `/api/pilot-application` | Soumission formulaire pilote (POST, Resend email) | `app/api/pilot-application/route.ts` |

## Architecture composants

```
components/
├── sections/           # 9 sections de la page d'accueil
│   ├── HeroSection         Section hero avec titre, CTA et illustration
│   ├── TrustBand           Bandeau de logos de confiance
│   ├── ProblemSection       Expose du probleme (lazy-loaded)
│   ├── SolutionSection      Presentation de la solution Praedixa
│   ├── PipelineSection      Pipeline en 3 etapes (lazy-loaded)
│   ├── DeliverablesSection  Livrables concrets (lazy-loaded)
│   ├── PilotSection         Programme pilote et avantages
│   ├── FaqSection           Questions frequentes
│   └── ContactSection       Formulaire de contact
├── layout/             # Structure globale
│   ├── Navbar               Navigation principale
│   ├── Footer               Pied de page avec liens legaux
│   └── StickyMobileCTA      CTA fixe en bas sur mobile
├── shared/             # Composants utilitaires
│   ├── SectionHeader        Titre + sous-titre standardises
│   └── SectionWrapper       Container avec espacement uniforme
├── animations/         # Motion design
│   └── ScrollReveal         Wrapper d'animation au scroll (IntersectionObserver)
├── seo/                # Donnees structurees
│   └── JsonLd               Schema.org Organisation + WebSite
├── logo/
│   └── PraedixaLogo         Logo SVG vectoriel
└── hero/
    └── HeroIllustration     Illustration de la section hero
```

L'ordre de rendu sur la page d'accueil suit la sequence definie dans `app/page.tsx` :
Navbar -> HeroSection -> TrustBand -> ProblemSection -> SolutionSection -> PipelineSection -> DeliverablesSection -> PilotSection -> FaqSection -> ContactSection -> Footer -> StickyMobileCTA

## Contenu

Tout le contenu texte est centralise dans `lib/content/` pour faciliter les modifications sans toucher aux composants :

| Fichier                          | Contenu                                                            |
| -------------------------------- | ------------------------------------------------------------------ |
| `lib/content/hero-content.ts`    | Titre, sous-titre, CTA de la section hero                          |
| `lib/content/landing-faq.ts`     | Questions/reponses de la FAQ                                       |
| `lib/content/pilot-benefits.ts`  | Avantages du programme pilote                                      |
| `lib/content/pipeline-phases.ts` | Les 3 phases du pipeline Praedixa                                  |
| `lib/content/trust-logos.ts`     | Logos du bandeau de confiance                                      |
| `lib/config/site.ts`             | Configuration globale du site (nom, email de contact, hebergement) |

## SEO

La landing page integre une strategie SEO complete :

- **`robots.ts`** : autorise l'indexation de toutes les pages publiques, bloque `/api/` et `/_next/`
- **`sitemap.ts`** : sitemap XML dynamique avec 5 URLs (accueil, devenir-pilote, mentions-legales, confidentialite, cgu)
- **`JsonLd`** : donnees structurees Schema.org (Organisation + WebSite) injectees dans `<head>`
- **Meta tags** : Open Graph, Twitter Card, canonical URL, keywords -- configures dans `app/layout.tsx`
- **Favicon** : SVG + PNG multi-taille + Apple Touch Icon + Web Manifest (`public/site.webmanifest`)

## API Routes

### `GET /api/health`

Health check qui verifie la presence de `RESEND_API_KEY`. Retourne `{ status: "healthy" }` (200) ou `{ status: "degraded" }` (503). Utilise par la CI pour valider le deploiement.

### `POST /api/pilot-application`

Formulaire de candidature entreprise pilote. Securise par :

- **Rate limiting** : 5 requetes/heure par IP (in-memory, via `CF-Connecting-IP` ou `X-Forwarded-For`)
- **Validation stricte** : allowlists pour secteur et tranche d'effectif, regex email, limites de longueur
- **Honeypot** : champ `website` invisible -- si rempli, retourne `{ success: true }` sans envoyer
- **Sanitisation** : echappement HTML de toutes les valeurs avant injection dans les templates email
- **Limitation de taille** : corps de requete limite a 2 KB

Envoie deux emails via [Resend](https://resend.com/) :

1. Notification a l'administrateur avec les details de la candidature
2. Email de confirmation a l'entreprise candidate

## Animations

Le systeme d'animations repose sur Framer Motion et l'IntersectionObserver :

- **`useScrollReveal`** (`hooks/useScrollReveal.ts`) : hook principal qui retourne `ref`, `isRevealed` et `progress`. Detecte l'entree dans le viewport avec un seuil configurable (defaut 20%)
- **`useReducedMotion`** (`hooks/useReducedMotion.ts`) : detecte `prefers-reduced-motion: reduce` et desactive les animations pour les utilisateurs qui le souhaitent
- **`ScrollReveal`** (`components/animations/ScrollReveal.tsx`) : wrapper declaratif pour animer l'entree d'un element
- **`lib/animations/config.ts`** : courbes d'easing (`smoothOut`, `dramatic`, `snappy`), configurations de spring, durees et delais de stagger
- **`lib/animations/variants.ts`** : variantes d'animation reutilisables

Les sections lourdes en SVG/illustrations sont chargees en lazy avec `React.lazy()` + `<Suspense>` :

- `ProblemSection`
- `PipelineSection`
- `DeliverablesSection`

## Securite

- **CSP nonce-based** : le middleware (`middleware.ts`) genere un nonce unique par requete et injecte l'en-tete `Content-Security-Policy` via `lib/security/csp.ts`
- **Sanitisation email** : echappement HTML strict contre le XSS stocke dans les templates email
- **Rate limiting** : protection contre l'abus du formulaire pilote
- **Pas de donnees sensibles** : aucun cookie, aucun token, aucun localStorage

## Tests

### Tests unitaires (Vitest)

Les tests sont co-localises avec les composants dans des dossiers `__tests__/` :

```
app/__tests__/                    # page.test.tsx, layout.test.tsx, error.test.tsx, etc.
app/api/health/__tests__/         # route.test.ts
app/api/pilot-application/__tests__/  # route.test.ts
components/sections/__tests__/    # 9 tests (un par section)
components/layout/__tests__/      # Navbar, Footer, StickyMobileCTA
components/shared/__tests__/      # SectionHeader, SectionWrapper
components/animations/__tests__/  # ScrollReveal
components/seo/__tests__/         # JsonLd
components/logo/__tests__/        # PraedixaLogo
hooks/__tests__/                  # useReducedMotion, useScrollReveal
lib/security/__tests__/           # csp
__tests__/                        # middleware
```

```bash
# Lancer les tests de la landing uniquement
pnpm vitest run app-landing/

# Mode watch
pnpm vitest app-landing/
```

### Tests E2E (Playwright)

Les tests E2E se trouvent dans `testing/e2e/landing/` :

| Fichier                    | Couverture                             |
| -------------------------- | -------------------------------------- |
| `navigation.spec.ts`       | Navigation entre pages, liens internes |
| `pilot-form.spec.ts`       | Soumission du formulaire pilote        |
| `seo.spec.ts`              | Meta tags, donnees structurees         |
| `cgu.spec.ts`              | Page CGU                               |
| `confidentialite.spec.ts`  | Page confidentialite                   |
| `mentions-legales.spec.ts` | Page mentions legales                  |
| `logo-preview.spec.ts`     | Page preview logo                      |
| `footer-links.spec.ts`     | Liens du footer                        |

```bash
# Lancer les E2E landing
pnpm test:e2e:landing
```

## Dependances principales

| Package                  | Role                                       |
| ------------------------ | ------------------------------------------ |
| `next` 15.5              | Framework React SSR/SSG                    |
| `react` 19.1             | Bibliotheque UI                            |
| `framer-motion` 12       | Animations et transitions                  |
| `lucide-react`           | Icones SVG                                 |
| `resend`                 | Envoi d'emails transactionnels             |
| `@opennextjs/cloudflare` | Adaptateur Next.js pour Cloudflare Workers |
| `@praedixa/ui`           | Composants partages du monorepo            |
| `@praedixa/shared-types` | Types TypeScript partages                  |
| `tailwindcss` 3.4        | CSS utilitaire                             |
| `wrangler`               | CLI Cloudflare Workers (dev + deploy)      |
