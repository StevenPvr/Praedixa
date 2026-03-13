# Runbook - Release and Rollback Baseline

## Objectif

Standardiser une release staging/prod avec:

- preflight bloqueur
- manifest signe
- smoke tests courts
- decision `GO` ou `NO-GO` explicite
- rollback rapide a partir du dernier manifest sain

Perimetre principal:

- `landing`
- `webapp`
- `admin`
- `api`
- `auth`
- `connectors` si le runtime public est expose pour le changement cible

## Regles simples

1. Aucune release sans SHA cible, manifest signe et manifest precedent deja identifie pour rollback.
2. Aucune promotion prod si staging n'est pas vert sur le meme manifest.
3. Un seul rouge sur preflight, smoke, synthetics ou alerting critique suffit pour passer en `NO-GO`.
4. Le rollback standard d'une release image consiste a redeployer le manifest precedent, pas a bricoler a la main.

## Preflight obligatoire

Checklist avant build:

- [ ] `pnpm install --frozen-lockfile`
- [ ] `pnpm gate:exhaustive`
- [ ] `pnpm gate:verify`
- [ ] `./scripts/run-supply-chain-audit.sh`
- [ ] `./scripts/scw-preflight-deploy.sh staging`
- [ ] `./scripts/scw-preflight-deploy.sh prod` avant promotion prod
- [ ] cle de signature presente: `~/.praedixa/release-manifest.key`
- [ ] dernier manifest sain connu et verifie
- [ ] liste des services touches figee

Stop immediat si un item est rouge.

## Sequence canonique

Variables:

```bash
REF=<git-ref>
SHA="$(git rev-parse "$REF")"
TAG=<release-tag>
REGISTRY=<registry-prefix>
OUT=".release/$TAG"
ROLLBACK_MANIFEST_DIR=".release/manifests"
SERVICES=<comma-separated-services>
GATE_REPORT=".git/gate-reports/${SHA}.json"
SUPPLY_CHAIN_EVIDENCE=".git/gate-reports/artifacts/supply-chain-evidence.json"
mkdir -p "$OUT" "$ROLLBACK_MANIFEST_DIR"
```

Build des services touches. Refaire la commande pour chaque service de `landing|webapp|admin|api|auth`:

```bash
pnpm release:build -- \
  --service api \
  --ref "$REF" \
  --tag "$TAG" \
  --registry-prefix "$REGISTRY" \
  --output "$OUT/api.json"
```

Creation puis verification du manifest signe:

```bash
./scripts/run-supply-chain-audit.sh

pnpm release:manifest:create -- \
  --ref "$REF" \
  --gate-report "$GATE_REPORT" \
  --output "$OUT/manifest.json" \
  --image api="$(jq -r '.registry_image' "$OUT/api.json")" \
  --supply-chain-evidence "$SUPPLY_CHAIN_EVIDENCE"

pnpm release:manifest:verify -- --manifest "$OUT/manifest.json"
```

Notes:

- Ajouter un `--image` par service touche.
- Copier aussi chaque manifest signe stable dans `"$ROLLBACK_MANIFEST_DIR"` pour rendre la selection rollback reproductible depuis un repertoire local versionne d'evidence.
- Pour une release candidate, rattacher explicitement `--supply-chain-evidence "$SUPPLY_CHAIN_EVIDENCE"` au manifest signe.
- `release-manifest-verify.sh` reverifie ensuite le digest du summary supply-chain et celui des artefacts qu'il reference (`sbom.cdx.json`, `grype-findings.json`).
- Cette evidence couvre l'integrite locale des artefacts produits par le repo. Elle ne constitue pas une revendication de provenance ou d'attestation signee externe.
- Si le changement touche la base ou un schema critique, ajouter `--database-impact`, `--backup-evidence <summary.json>` et `--restore-evidence <summary.json>` pour embarquer une preuve machine-readable dans le manifest signe.
- `release-manifest-verify.sh` reverifie ensuite aussi les summaries backup/restore contre `docs/security/control-plane-metadata-inventory.json`, pas seulement leur digest.
- `auth` est cible en prod seulement dans le manifest versionne actuel.
- Si le build doit lui-meme sceller le SHA, utiliser `--run-gates` sur `release:build`.

## Deploy staging et smoke

Deploy staging:

```bash
pnpm release:deploy -- \
  --manifest "$OUT/manifest.json" \
  --env staging \
  --services "$SERVICES"
```

Smoke minimal staging:

```bash
./scripts/scw-post-deploy-smoke.sh --env staging --services api,webapp,admin
pnpm test:e2e:smoke
```

Verifications rapides obligatoires selon le perimetre:

- landing: ajouter `landing` au smoke seulement avec `--landing-url <url>` tant qu'aucune URL canonique staging n'est versionnee; l'URL effective doit rester sur le host fourni et finir sur `/fr`
- webapp: `/login` charge, redirection `/auth/login` saine
- admin: `/login` charge, la spec `testing/e2e/admin/smoke.spec.ts` reste verte
- api: `smoke-test-production.sh` vert (`/health`, route protegee, CORS)
- auth: en staging, ne jamais compter `auth.praedixa.com` comme preuve; si un host auth staging dedie existe, lancer un second smoke explicite `--services auth --auth-url https://<staging-auth-origin>`
- connectors: si le runtime public change, lancer un smoke explicite `--services connectors --connectors-url https://<staging-connectors-origin>`

Observation staging:

- attendre 15 min
- verifier synthetics verts
- verifier absence d'alerte critique
- verifier `p95` et `5xx` stables sur les dashboards

## Criteres GO / NO-GO

| Etape             | GO                                                                 | NO-GO                                                   |
| ----------------- | ------------------------------------------------------------------ | ------------------------------------------------------- |
| Preflight         | zero echec, gate signe valide, manifest precedent connu            | un check rouge ou manifest non verifiable               |
| Build/manifest    | toutes les images ont un digest, manifest signe verifie            | digest manquant, signature invalide, service oublie     |
| Staging smoke     | smoke script vert, E2E cible vert, synthetics verts                | un rouge, timeout, nouvelle alerte critique             |
| Prod watch 15 min | trafic normal, pas de derive `5xx/p95`, pas de silence logs/traces | regression visible, alerte critique, telemetrie absente |

`NO-GO` veut dire: on stoppe, on corrige, on refait une release. Pas de promotion "pour voir".

Le preflight DNS est strict par defaut. `DNS_DELEGATION_MODE=transitional` reste un override explicite, temporaire et trace dans l'evidence de release.

## Promotion prod

Avant promo:

- rerun `./scripts/scw-preflight-deploy.sh prod`
- relire le manifest cible
- confirmer le manifest precedent a utiliser en rollback

Promotion:

```bash
pnpm release:promote -- \
  --manifest "$OUT/manifest.json" \
  --to prod
```

Ajouter `--services "$SERVICES"` seulement si le manifest cible versionne explicitement ce sous-ensemble. `auth` reste optionnel et prod-only dans les manifests actuels.

Smoke minimal prod:

```bash
./scripts/scw-post-deploy-smoke.sh --env prod --services api,webapp,admin,auth
pnpm test:e2e:smoke
```

Observation prod:

- 15 min minimum
- dashboards avec marqueur `release_id` ou `commit_sha`
- aucune alerte critique nouvelle

## Rollback rapide

Cas standard: regression liee a une image ou a un package deploye.

1. Geler toute nouvelle promo.
2. Calculer explicitement le manifest precedent a partir du manifest courant et du repertoire local d'evidence.
3. Verifier sa signature avant toute action.
4. Redeployer ce manifest sur l'environnement touche via le chemin versionne.
5. Rejouer les smoke tests.
6. Garder 15 min d'observation avant cloture.

Commandes:

```bash
CURRENT_MANIFEST="$OUT/manifest.json"
ROLLBACK_MANIFEST_DIR=".release/manifests"

./scripts/scw-rollback-plan.sh \
  --current-manifest "$CURRENT_MANIFEST" \
  --manifest-dir "$ROLLBACK_MANIFEST_DIR" \
  --env prod \
  --services "$SERVICES"

./scripts/scw-rollback-execute.sh \
  --current-manifest "$CURRENT_MANIFEST" \
  --manifest-dir "$ROLLBACK_MANIFEST_DIR" \
  --env prod \
  --services "$SERVICES" \
  --run-smoke
```

Options utiles:

- `--previous-manifest <path>` pour imposer explicitement un manifest precedent deja audite au lieu de laisser le script le choisir.
- `--dry-run` sur `scw-rollback-execute.sh` pour produire la commande exacte sans toucher a Scaleway.
- `--target connectors=<container-name>[@region]` tant que `connectors` reste marque `requires_target_override` dans `docs/deployment/rollback-targets.json`.
- `--landing-url`, `--auth-url`, `--connectors-url` si le smoke rollback exige encore une URL explicite.

Cas particulier: regression de `decision-config` sans incident image.

- utiliser le rollback applicatif via l'endpoint admin versionne `/api/v1/admin/organizations/:orgId/decision-config/versions/:versionId/rollback`
- garder la meme discipline de preuves et de smoke apres rollback

## Preuves a conserver

Conserver dans le ticket de change ou le dossier d'evidence:

- `commit_sha`
- liste des services touches
- rapport de gate signe: `.git/gate-reports/<sha>.json`
- JSON de build par service (`$OUT/*.json`)
- manifest signe et sortie de `release:manifest:verify`
- sortie de `scw-rollback-plan.sh` si un rollback a ete evalue ou execute
- sorties `scw:preflight:*`
- sorties des smoke tests staging et prod
- sortie de `scripts/validate-synthetic-monitoring-baseline.mjs`
- sortie de `scripts/run-supply-chain-audit.sh`
- summary supply-chain machine-readable: `.git/gate-reports/artifacts/supply-chain-evidence.json`
- liens ou captures des dashboards 15 min apres deploy
- horodatage debut/fin de release
- si rollback: manifest redeploye, raison, heure, resultat smoke
- lien vers la matrice env/secrets/owners en vigueur
- si le changement touche la base, lien vers l'evidence backup/restore associee (`scw-rdb-backup-evidence.sh` / `scw-rdb-restore-drill.sh`)
- si le manifest embarque une evidence supply-chain, conserver aussi `supply-chain-evidence.json`, `sbom.cdx.json` et `grype-findings.json`

Reference utile pour journaliser le changement:

- `docs/security/compliance-pack/08-change-management-log-template.md`
- `docs/deployment/environment-secrets-owners-matrix.md`
- `docs/runbooks/post-deploy-smoke-baseline.md`
- `docs/runbooks/backup-restore-evidence-baseline.md`
