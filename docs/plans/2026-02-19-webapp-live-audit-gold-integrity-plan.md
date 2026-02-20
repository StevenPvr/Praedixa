# Webapp Live Audit & Gold Integrity Plan (2026-02-19)

## 1) Objectif

Mettre la web app client en conformité avec les exigences suivantes:

- Revue exhaustive UI/UX et parcours fonctionnels via Playwright.
- Vérification que la couche Gold (architecture médaillon) est visible côté web app.
- Aucune donnée mock côté produit sauf forecasting.
- Contrôle d'accès strict:
  - Admin: accès multi-sites.
  - Manager/HR manager: accès site unique (site du token).
- Stabilisation des tests critiques exécutés par la gate locale stricte.

## 2) Scope technique

- Frontend client: `app-webapp/**`
- Frontend admin: `app-admin/**` (navigation + auth E2E)
- API live client: `app-api/app/routers/live_client.py`
- Services Gold: `app-api/app/services/gold_live_data.py`
- Schémas UX/API: `app-api/app/schemas/ux.py`
- E2E: `testing/e2e/webapp/**`, `testing/e2e/admin/**`, `playwright.config.ts`

## 3) Plan d'exécution détaillé

### A. Fondations auth E2E (OIDC réel)

1. Remplacer les fixtures Supabase obsolètes par des cookies OIDC signés:
   - Token d'accès JWT-like avec claims role/org/site/exp.
   - Cookie session signé HMAC pour satisfaire middleware Next.
2. Aligner les environnements Playwright web servers avec vars OIDC minimales:
   - `AUTH_OIDC_ISSUER_URL`
   - `AUTH_OIDC_CLIENT_ID`
   - `AUTH_SESSION_SECRET`
3. Mettre à jour les specs auth webapp pour refléter le flux OIDC (CTA unique, bannières d'erreur/reauth).

### B. Audit UI/UX + robustesse tests gate

1. Exécuter les specs critiques gate:
   - `testing/e2e/webapp/api-edge-cases.spec.ts`
   - `testing/e2e/webapp/sidebar-interactions.spec.ts`
   - `testing/e2e/admin/navigation.spec.ts`
2. Corriger les assertions fragiles liées à l'état UI persistant (ex: collapse sidebar).
3. Vérifier les parcours clés webapp:
   - `/login`, `/dashboard`, `/donnees`

### C. Transparence Gold et conformité data

1. Ajouter un endpoint de provenance Gold:
   - `GET /api/v1/live/gold/provenance`
2. Exposer dans ce endpoint:
   - source physique Gold,
   - révision/volumétrie,
   - statut de politique mock (`strict_data_policy_ok`),
   - listes colonnes mock forecast autorisées vs non autorisées,
   - disponibilité des rapports qualité.
3. Ajouter l'affichage provenance dans la page Gold explorer:
   - indicateurs de conformité,
   - bannière d'alerte si mock non-forecast détecté,
   - détails source/path/policy.

### D. Validation rigoureuse

1. Exécuter tests ciblés backend et frontend.
2. Corriger tout écart bloquant avant pré-commit/gate.
3. Préparer le commit avec message conventionnel.

## 4) État d'avancement (implémenté)

- [x] Migration des fixtures E2E webapp/admin vers auth OIDC signée.
- [x] Configuration Playwright des vars OIDC pour webapp/admin.
- [x] Refonte `testing/e2e/webapp/auth.spec.ts` sur flux OIDC.
- [x] Stabilisation `testing/e2e/webapp/sidebar-interactions.spec.ts`.
- [x] Endpoint API `GET /api/v1/live/gold/provenance`.
- [x] Schémas API de provenance Gold (`GoldProvenanceRead`, etc.).
- [x] Affichage provenance/policy dans `app-webapp/app/(app)/donnees/gold/page.tsx`.
- [x] Tests unitaires provenance backend ajoutés.
- [x] Exécution verte des specs gate critiques Playwright.

## 5) Résultats de validation exécutés

- `PW_REUSE_SERVER=0 pnpm playwright test testing/e2e/webapp/api-edge-cases.spec.ts --project=webapp --workers=1`
  - Résultat: **PASS**
- `PW_REUSE_SERVER=0 pnpm playwright test testing/e2e/webapp/sidebar-interactions.spec.ts --project=webapp --workers=1`
  - Résultat: **PASS**
- `PW_REUSE_SERVER=0 pnpm playwright test testing/e2e/admin/navigation.spec.ts --project=admin --workers=1`
  - Résultat: **PASS**
- `PW_REUSE_SERVER=0 pnpm playwright test testing/e2e/webapp/auth.spec.ts testing/e2e/webapp/donnees.spec.ts --project=webapp --workers=1`
  - Résultat: **PASS**
- `cd app-api && uv run pytest --no-cov tests/unit/test_gold_provenance.py`
  - Résultat: **PASS**

## 6) Risques résiduels

- Le script `gate:exhaustive` reste dépendant d'outillage local lourd (CodeQL, osv-scanner, k6, etc.).
- La preuve "no mock except forecasts" est contractuelle via endpoint provenance + naming policy; elle ne remplace pas un contrôle DataOps en CI sur chaque dataset entrant.

## 7) Prochaines étapes

1. Lancer `pnpm gate:exhaustive` en local et traiter tous les findings jusqu'au vert complet.
2. Exécuter audit Playwright complet cross-pages pour capture visuelle systématique (desktop/mobile) et log des incohérences.
3. Commit conventionnel des changements (`feat:` ou `fix:` selon lot final).
