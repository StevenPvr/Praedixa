# Programme Anti-Scraping

## Objectif

Rendre l'extraction utile economiquement absurde sur les surfaces publiques et retirer du web public les contenus ou chemins a forte valeur de reexploitation.

## Controles maintenant en place

- `app-landing/lib/security/exposure-policy.ts` classifie les surfaces landing en `P0/P1/P2/P3`, avec audience, mode d'acces, budget et owner.
- `app-landing/proxy.ts` applique la policy d'exposition par surface, ajoute `X-Robots-Tag` sur les surfaces non indexables et reserve le blocage des crawlers IA aux chemins non sacrificiels comme APIs techniques, previews internes et assets signes.
- `app-landing/app/robots.ts` autorise explicitement les bots de search, de user fetch et de training documentes sur le perimetre public sacrifie pour le GEO, tout en gardant `/api/*`, `/admin/*` et les previews hors crawl.
- `llms.txt` et `llms-full.txt` publient un inventaire riche des pages publiques canoniques et indiquent explicitement que ce corpus public peut etre indexe, cite, recupere et utilise pour l'entrainement par les fournisseurs conformes.
- `GET /api/resource-asset` delivre uniquement une redirection meme-origine, rate-limitée et non indexable vers un asset signe a duree courte.
- `/:locale/ressources/:slug/asset` refuse maintenant tout acces sans signature valide et n'expose plus d'URL stable cacheable.
- `app-api-ts/src/exposure-policy.ts` classifie les familles de routes API TS; `server.ts` echoue fail-close si une route matchee n'a pas de policy resolvable.
- `app-api-ts/src/server.ts` journalise aussi la classification d'exposition avec la telemetrie HTTP et force `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet` sur la surface JSON.

## Secrets runtime requis

- `LANDING_ASSET_SIGNING_SECRET` est requis sur le landing deploye pour signer les URLs d'assets teaser.
- L'inventaire canonique reste `docs/deployment/runtime-secrets-inventory.json`.
- Le script de sync est `scripts/scw-configure-landing-env.sh`.

## Limites connues

- Le contenu encore integralement visible dans un navigateur reste copiable par un humain autorise.
- Le blocage IA repose encore en partie sur la cooperation des user-agents identifies et sur la politique edge existante; les couches WAF/bot management dediees restent un complement recommande pour proteger les surfaces non-GEO.
- Pour Google, `Google-Extended` est un token `robots.txt` de controle et non un user-agent HTTP distinct; le durcissement runtime des surfaces techniques s'appuie donc sur `Googlebot`/`GoogleOther` et les controles `noindex` complements.
- La classification API TS est stricte par famille de routes, pas encore par template individuel versionne.
