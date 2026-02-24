# Landing (`@praedixa/landing`)

Marketing site for `praedixa.com`, built with Next.js App Router (v15), React 19, Tailwind CSS, and Framer Motion.

## Runbook

From repository root:

```bash
pnpm dev:landing
```

Landing workspace only:

```bash
pnpm --filter @praedixa/landing lint
pnpm --filter @praedixa/landing typecheck
pnpm --filter @praedixa/landing build
```

Landing unit/integration tests (Vitest from root):

```bash
pnpm test -- app-landing
```

Landing E2E (Playwright from root):

```bash
pnpm test:e2e:landing
```

## Architecture

Core entrypoints:

- `app/layout.tsx`: root metadata and global skip-link
- `app/[locale]/layout.tsx`: locale-level shell (`fr` / `en`)
- `app/[locale]/page.tsx`: main landing composition

Main landing sections:

- `HeroSection`
- `ProblemSection`
- `MethodSection`
- `UseCasesSection`
- `SecuritySection`
- `PilotSection`
- `FaqSection`
- `ContactSection`

Layout components:

- `components/layout/Navbar.tsx`
- `components/layout/Footer.tsx`
- `components/layout/StickyMobileCTA.tsx`

## API routes

- `GET /api/health`
- `POST /api/pilot-application`
- `POST /api/contact`

Both form endpoints implement:

- request size guard
- per-IP rate limiting
- origin enforcement (`origin` / `referer` / `sec-fetch-site`)
- anti-automation protections (honeypot + timing checks; contact also includes captcha)

## SEO and i18n

- Localized routes under `app/[locale]`
- Canonicals/hreflang/Open Graph generated through `lib/seo/metadata.ts`
- `robots.txt` from `app/robots.ts`
- sitemap from `app/sitemap.ts`
- JSON-LD from `components/seo/JsonLd.tsx`

## Security headers

- CSP generated in `lib/security/csp.ts`
- proxy applies CSP per request (`proxy.ts`)
- additional headers configured through `lib/security/headers.ts` and `next.config.ts`

## Deployment

Current:

- Cloudflare Workers via OpenNext (`pnpm cf:build`, `pnpm deploy`)

Prepared target:

- Scaleway Serverless Containers (`app-landing/Dockerfile.scaleway`, `fr-par`)
