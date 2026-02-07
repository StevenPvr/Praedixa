# Landing Page

**URL:** `praedixa.com`
**Hébergement:** Cloudflare Workers (OpenNext)
**Stack:** Next.js App Router

## Objectif

Site marketing qui :

- Explique la boucle "Capacité → Décision → Preuve"
- Rassure (méthode, auditabilité, sécurité, minimisation)
- Capte la demande (démo / diagnostic)

## Développement

```bash
pnpm dev
```

## Déploiement

Le déploiement est géré par GitHub Actions (push sur `main`).
Configuration Cloudflare dans `wrangler.jsonc`.

## Preview Workers (local)

```bash
cp .dev.vars.example .dev.vars
pnpm preview
```

## Notes

- Pas de données client sensibles stockées localement
- CDN mondial OK (assets publics uniquement)
