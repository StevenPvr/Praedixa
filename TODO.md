# TODO — Deploiement POC Gratuit

Config code en place (wrangler, render.yaml, CI/CD). Reste les etapes manuelles.

## Neon (PostgreSQL)

- [ ] Creer un projet free tier sur neon.tech (region EU Frankfurt)
- [ ] Recuperer la connection string : `postgresql+asyncpg://<user>:<password>@<host>.neon.tech/praedixa?sslmode=require`

## Render (API FastAPI)

- [ ] Connecter le repo GitHub sur render.com
- [ ] Laisser Render detecter `render.yaml` (Blueprint)
- [ ] Configurer les secrets dans le dashboard Render :
  - `DATABASE_URL` (connection string Neon)
  - `SUPABASE_JWT_SECRET`
  - `SUPABASE_URL`
- [ ] Recuperer le deploy hook URL (Settings > Deploy Hook)

## GitHub Secrets

- [ ] `RENDER_DEPLOY_HOOK_URL` — URL du deploy hook Render
- [ ] `NEXT_PUBLIC_API_URL` — URL de l'API (ex: `https://praedixa-api.onrender.com` ou `https://api.praedixa.com`)
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Cloudflare DNS

- [ ] `app.praedixa.com` — auto-configure par Wrangler (`custom_domain: true`)
- [ ] (Optionnel) CNAME `api.praedixa.com` → `praedixa-api.onrender.com`

## Verification

- [ ] `pnpm run deploy` ou push sur `main`
- [ ] Landing OK sur `praedixa.com`
- [ ] Webapp OK sur `app.praedixa.com/login`
- [ ] API OK sur `/health`
- [ ] Login → Dashboard → donnees chargees
