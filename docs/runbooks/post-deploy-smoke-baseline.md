# Runbook - Post-Deploy Smoke Baseline

## Objectif

Standardiser un smoke post-deploy court, reproductible et bloquant pour les surfaces Praedixa exposees publiquement.

Le smoke ne remplace pas les synthetics, l'observabilite 15 min ni les E2E complets. Il sert a verifier vite qu'un deploy n'a pas casse:

- l'accessibilite HTTP de la surface;
- l'auth OIDC de base;
- le contrat minimal API;
- les routes de login publiques du webapp et de l'admin;
- les gardes `same-origin` et le comportement de session anonyme sur `webapp` et `admin`.

## Artefact executable

Script canonique:

```bash
./scripts/scw/scw-post-deploy-smoke.sh --env <staging|prod> [--services <comma-separated>] [--landing-url <url>] [--auth-url <url>] [--connectors-url <url>]
```

Par defaut, le script smoke:

- `api` via `./scripts/smoke-test-production.sh`
- `webapp` via `GET /login`, `GET /auth/login`, `GET /auth/session` same-origin anonyme et `GET /auth/session` cross-origin
- `admin` via `GET /login`, `GET /auth/login`, `GET /auth/session` same-origin anonyme et `GET /auth/session` cross-origin
- `auth` via le endpoint OIDC well-known en `prod` uniquement
- `connectors` via `GET /health` si le runtime public est expose

`landing` est supporte, mais exige:

- `--landing-url <url>` en staging;
- ou bien un host canonique prod (`praedixa.com` ou `www.praedixa.com`).

`connectors` est supporte, mais exige:

- `--connectors-url <url>` en staging;
- ou bien le host canonique prod `https://connectors.praedixa.com`.

`webapp` et `admin` exigent maintenant aussi:

- `--auth-url <url>` en staging, car le smoke verifie le vrai redirect OIDC de `/auth/login`;
- un redirect OIDC `https` vers le host auth attendu;
- des cookies bootstrap OIDC emis sur `/auth/login`;
- un `401 unauthorized` cache `no-store` pour `/auth/session` en same-origin anonyme;
- un `403` cache `no-store` pour `/auth/session` quand `Origin` / `Sec-Fetch-Site` simulent un navigateur cross-origin.

Contraintes fail-close:

- toutes les cibles doivent etre en `https`;
- le smoke refuse les queries, fragments, userinfo et ports explicites;
- l'URL effective apres redirects doit rester sur le host autorise;
- `landing` doit finir sur `/fr`;
- `auth` staging n'est valide que si `--auth-url` pointe vers un host staging dedie; `auth.praedixa.com` est refuse en staging pour eviter un faux vert couple a la prod.
- `webapp` et `admin` staging ne sont valides que si `--auth-url` pointe vers le host auth staging qui sera vraiment utilise par `/auth/login`;
- `connectors` staging n'est valide que si `--connectors-url` pointe vers un host staging dedie; `connectors.praedixa.com` est refuse en staging pour eviter un faux vert couple a la prod.

## Alignement avec le contrat synthetic

Le smoke et les synthetics ne sont pas des listes paralleles libres. La baseline versionnee `docs/runbooks/synthetic-monitoring-baseline.json` est la source de verite pour la couverture minimale continue, et elle impose maintenant:

- au moins un probe explicite sur `landing`, `webapp`, `admin`, `api`, `auth` et `connectors`;
- un `probe.intent` borne par service (`health`, `login_page`, `oidc_discovery`, `public_homepage`, `anonymous_rejection`);
- une `metadata.smokeService` qui doit rester strictement alignee avec le service smoke correspondant;
- une politique `hostMode` identique aux regles de ce runbook: `landing`, `auth` et `connectors` restent `explicit` en staging et `canonical` en prod.

Verifier la baseline avant de considerer un nouveau probe ou une nouvelle exception comme "done":

```bash
./scripts/validate-synthetic-monitoring-baseline.mjs
```

Si un nouveau service public apparait ou si le scope d'un service smoke change, mettre a jour en meme temps:

- `docs/runbooks/synthetic-monitoring-baseline.json`
- `docs/runbooks/observability-baseline.md`
- ce runbook
- le test `scripts/__tests__/synthetic-monitoring-baseline.test.mjs`

## Commandes standards

Staging baseline:

```bash
./scripts/scw/scw-post-deploy-smoke.sh \
  --env staging \
  --services api,webapp,admin \
  --auth-url https://<staging-auth-explicite>
```

Staging avec landing versionnee sur une URL explicite:

```bash
./scripts/scw/scw-post-deploy-smoke.sh \
  --env staging \
  --services landing,api,webapp,admin \
  --landing-url https://<landing-staging-explicite>
```

Staging avec auth dediee et explicite:

```bash
./scripts/scw/scw-post-deploy-smoke.sh \
  --env staging \
  --services webapp,admin,auth \
  --auth-url https://<staging-auth-explicite>
```

Staging avec connectors dedies et explicites:

```bash
./scripts/scw/scw-post-deploy-smoke.sh \
  --env staging \
  --services connectors \
  --connectors-url https://<staging-connectors-explicite>
```

Prod baseline:

```bash
./scripts/scw/scw-post-deploy-smoke.sh --env prod --services api,webapp,admin,auth
```

Prod avec landing:

```bash
./scripts/scw/scw-post-deploy-smoke.sh --env prod --services landing,api,webapp,admin,auth
```

Prod avec connectors:

```bash
./scripts/scw/scw-post-deploy-smoke.sh --env prod --services connectors
```

## Quand le lancer

- juste apres `pnpm release:deploy --env staging`
- juste apres `pnpm release:promote --to prod`
- juste apres un rollback
- juste apres une rotation ou reconfiguration auth qui peut casser `webapp`, `admin` ou `auth`

## Sequence minimale par environnement

1. Lancer le smoke CLI et conserver la sortie brute.
2. Si `admin` ou `auth` ont bouge, rejouer `pnpm test:e2e:smoke` sur la spec versionnee `testing/e2e/admin/smoke.spec.ts`.
   Si `webapp` ou `admin` ont bouge, conserver aussi la preuve des checks `GET /auth/login` et `GET /auth/session` du smoke CLI.
3. Ouvrir les dashboards et attendre 15 min d'observation sans alerte critique.
4. Si un seul check est rouge, passer en `NO-GO` ou rollback.

## Politique de decision

- Un `curl` rouge ou un timeout du script = `NO-GO`.
- Une erreur OIDC well-known = `NO-GO` pour `webapp` et `admin`, meme si les pages HTML repondent.
- Un redirect `/auth/login` vers un host inattendu, sans cookies bootstrap, ou avec un `redirect_uri` incoherent = `NO-GO`.
- Un `/auth/session` qui n'est pas `401` same-origin anonyme ou qui n'est pas `403` cross-origin = `NO-GO`.
- Un redirect vers un host inattendu ou une URL effective non canonique = `NO-GO`.
- Un rollback se valide avec le meme smoke, pas avec une hypothese "la version precedente devait etre bonne".

## Evidence a conserver

Conserver dans le dossier release ou le ticket de change:

- sortie de `./scripts/scw/scw-post-deploy-smoke.sh`
- sortie de `pnpm test:e2e:smoke` si execute
- heure de debut et de fin du smoke
- environnement et services testes
- URL explicite de landing si `--landing-url` a ete utilise
- URL explicite de staging auth si `--auth-url` a ete utilise
- URL explicite de staging connectors si `--connectors-url` a ete utilise
- statut, `Location` et headers clefs des checks `/auth/login` et `/auth/session` webapp/admin
- capture ou lien dashboards apres 15 min

Exemple:

```bash
mkdir -p .meta/.release/$TAG
./scripts/scw/scw-post-deploy-smoke.sh --env staging --services api,webapp,admin \
  --auth-url https://<staging-auth-explicite> \
  | tee ".meta/.release/$TAG/smoke-staging.log"
```

## Lien avec les autres runbooks

- release standard: `docs/runbooks/release-and-rollback-baseline.md`
- matrice env/secrets/owners: `docs/deployment/environment-secrets-owners-matrix.md`
- observabilite 15 min: `docs/runbooks/observability-baseline.md`
- baseline synthetics: `docs/runbooks/synthetic-monitoring-baseline.json`
