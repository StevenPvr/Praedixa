# Infra Readiness TODO

## Executive Summary

Verdict courant: **No-Go global**, mais plus pour les memes raisons qu'au premier audit.

Le repo n'est plus dans l'etat "socle contradictoire et non fiable" de fevrier. Les points suivants sont maintenant fermes ou durcis par des preuves repo-owned:

- `pnpm test` couvre bien le socle workspace critique via Turbo et le garde-fou `critical-test`;
- les contrats runtime preservent `all_of` / `any_of` et ne mentent plus sur les secrets alternatifs;
- le bootstrap local et la doc portable sont gardes par des validateurs dedies;
- `main` est protege par `Autorite - Required`, `strict = true`, `1` review obligatoire et `enforce_admins = true`;
- Dependabot couvre aussi les Dockerfiles suivis dans le repo;
- `CI - Autorite` publie maintenant un verdict machine-readable `build-ready` par SHA.

Le `No-Go` restant est donc **structurel et prouve**, pas bureaucratique:

1. le HEAD distant de `main` n'expose pas encore une preuve `Autorite - Required` verte et relisible;
2. le coeur DecisionOps V1 n'est pas totalement ferme;
3. le bundle de preuves fraiches release/rollback/restore n'est pas encore attache a un SHA recent comme evidence canonique;
4. l'operabilite SRE provider-backed reste partielle;
5. le chemin de confiance E2E global n'est pas encore ferme.

La source de verite machine-readable de ce verdict est maintenant `docs/governance/build-ready-status.json`.

## Reconciliation du precedent audit

### Points fermes depuis l'audit initial

- [x] Gates racine et couverture backend:
      `pnpm test` n'ignore plus les workspaces critiques et la policy `critical-test` bloque toute absence silencieuse de suite.
- [x] Drift runtime/doc bootstrap:
      `README.md`, `infra/docker-compose.yml`, `app-admin/.env.local.example`, `app-webapp/.env.local.example` et les docs applicatives sont surveilles par `scripts/validate-local-bootstrap-consistency.mjs`.
- [x] Contrat runtime semantique:
      `scripts/runtime-env-contracts.mjs` preserve maintenant `all_of` / `any_of`, et `validate-runtime-env-contracts.mjs` en controle la semantique.
- [x] Portabilite documentaire:
      `scripts/validate-doc-portability.mjs` bloque les chemins absolus de machine locale.
- [x] Gouvernance distante minimale:
      `scripts/github/verify-main-branch-protection.sh` prouve maintenant `Autorite - Required`, `1` review obligatoire, `strict = true`, `enforce_admins = true`, linear history et interdiction des force-push/suppressions.
- [x] Dependabot Docker:
      `.github/dependabot.yml` couvre les repertoires Docker suivis (`app-api-ts`, `app-admin`, `app-webapp`, `app-landing`, `infra/auth`).

### Ce qui reste reellement ouvert

- [ ] Produire une preuve fraiche de merge authority sur le HEAD distant:
      `scripts/github/verify-main-required-check.sh` doit passer sur `main`, pas seulement la branch protection.
- [ ] Fermer le coeur DecisionOps V1:
      `DecisionGraph` semantique versionne, semantic query API, runtime scenario persistant/explicable, Mapping Studio operable et closing ledger finance-grade.
- [ ] Produire une preuve fraiche release/recovery par SHA:
      staging smoke vert, rollback execute et restore drill attaches a un SHA recent de `main`.
- [ ] Industrialiser l'operabilite SRE au-dela de la baseline versionnee:
      synthetics provider-backed, dashboards/alertes fermes, support console least-privilege, maintenance/degraded mode par tenant.
- [ ] Fermer le parcours E2E canonique:
      `auth -> signal -> compare -> approve -> dispatch -> ledger`.
- [ ] Fermer le cost/perf closeout:
      cost monitoring/alerts, SQL/index/pagination, preuve "no full refresh critique".

## P0 Blockers actuels

- [ ] Preuve distante du check requis encore absente sur le HEAD de `main`
      Problem: la policy GitHub est bien en place, mais la preuve Checks GitHub du check requis n'est pas encore verte sur le HEAD distant.
      Preuve: `./scripts/github/verify-main-required-check.sh`.
      Correctif exact: faire tourner `CI - Autorite` sur le HEAD cible de `main` jusqu'a obtenir un `Autorite - Required` `completed/success`.

- [ ] DecisionOps core globalement incomplet
      Problem: le repo n'est pas encore `Go global` tant que les primitives coeur produit restent ouvertes.
      Preuve: `docs/prd/TODO.md`, `docs/prd/decision-graph-and-scenario-runtime-spec.md`, `docs/prd/decision-ledger-and-roi-proof-spec.md`.
      Correctif exact: fermer `DecisionGraph`, semantic query API, runtime scenario persistant/explicable, Mapping Studio operable et ledger finance-grade.

- [ ] Bundle de preuves release/rollback/restore pas encore frais sur un SHA recent
      Problem: les scripts et workflows existent, mais la preuve canonique recente par SHA reste a produire.
      Preuve: `docs/governance/build-ready-status.json` garde `release-proof-bundle-freshness` ouvert.
      Correctif exact: faire tourner `Release - Platform` sur un SHA vert recent, attacher smoke staging, rollback execute et restore drill au manifest ou au bundle de preuves associe.

- [ ] Operabilite SRE provider-backed encore partielle
      Problem: la baseline machine-readable existe, pas encore les monitors externes et la support console complete.
      Preuve: `docs/prd/build-release-sre-readiness-spec.md`, `docs/prd/TODO.md`, `docs/governance/build-ready-status.json`.
      Correctif exact: brancher les synthetics provider-backed, fermer dashboards/alertes, support console least-privilege et degraded mode par tenant.

## P1 Important Gaps

- [ ] E2E canonique du chemin de confiance global
- [ ] Closeout cost monitoring / SQL / no-full-refresh
- [ ] Revue reguliere du verdict machine-readable a chaque fermeture de chantier structurel

## Recommended Execution Order

- [ ] Ordre 1 - produire une preuve release/recovery fraiche
- [ ] Ordre 2 - fermer les chantiers SRE provider-backed
- [ ] Ordre 3 - fermer `DecisionGraph` + runtime scenario + Mapping Studio + ledger finance-grade
- [ ] Ordre 4 - fermer l'E2E global de confiance et declarer `Go` dans `build-ready-status.json`

## Exit Criteria

- [ ] `docs/governance/build-ready-status.json` passe a `go`
- [ ] `CI - Autorite` publie un rapport SHA `go`
- [ ] `docs/prd/TODO.md` section 15 est completement fermee
- [ ] plus aucun document canonique recent ne dit `No-Go` pour une raison deja corrigee dans le repo
