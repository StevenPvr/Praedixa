# Rapport d'audit securite — Praedixa (full monorepo)
Date : 2026-03-04
Auditeur : Codex (skill `seecurity-audit`)

## Resume executif
La passe securite complete a couvre `app-api-ts`, `app-connectors`, `app-webapp`, `app-admin`, `app-landing`, `infra` et les scripts de gate. Le lot corrige les faiblesses critiques de gouvernance RBAC admin, durcit la surface transport/payload des APIs Node et renforce l'hygiene Docker/scan.

Etat global apres remediation : aucun finding CRITIQUE/HAUTE ouvert dans le scope du lot. Risque residuel principal : couverture CVE dependante de la fraicheur des bases scanner locales (Trivy/Grype en environnement reseau restreint).

## Resultats

### CRITIQUE — Corriger immediatement
Aucun finding critique ouvert.

### HAUTE — Corriger avant mise en production
| # | Vulnerabilite | OWASP | CWE | Fichier:ligne | Impact | Fix recommande | Etat |
|---|---|---|---|---|---|---|---|
| 1 | RBAC admin non strict (tolerance `org_admin` hors prod) | A01 / A07 | CWE-269 | `app-api-ts/src/routes.ts:955` | Possibilite d'exposition de routes admin en environnement non-prod | Forcer `super_admin` sur toute la surface `/api/v1/admin/*` | Corrige |

### MOYENNE — A planifier
| # | Vulnerabilite | OWASP | CWE | Fichier:ligne | Impact | Fix recommande | Etat |
|---|---|---|---|---|---|---|---|
| 2 | Absence de validation stricte du `Content-Type` sur routes mutatrices API TS | A05 / A03 | CWE-16 | `app-api-ts/src/server.ts:324` | Payload ambigus et validation frontiere inconstante | Imposer `application/json` et rejeter sinon (415) | Corrige |
| 3 | Absence de limite de taille body sur API TS | A04 | CWE-770 | `app-api-ts/src/server.ts:405` | Risque DoS memoire sur payload volumineux | Limite 1 MiB + reponse 413 | Corrige |
| 4 | Comparaison token connecteurs non constante dans le temps | A02 | CWE-208 | `app-connectors/src/security.ts:61`, `app-connectors/src/server.ts:291` | Canal auxiliaire timing sur auth interne | Comparaison temps constant (`timingSafeEqual`) | Corrige |
| 5 | Durcissement config connecteurs incomplet (token court / origins hors https) | A05 / A07 | CWE-16 | `app-connectors/src/config.ts:47`, `app-connectors/src/config.ts:83` | Surface de config permissive en staging/prod | Secret interne >= 32 chars + CORS https strict hors dev | Corrige |

### BASSE / Informationnel
| # | Observation | OWASP | Fichier:ligne | Recommandation | Etat |
|---|---|---|---|---|---|
| 6 | Regle Semgrep admin trop bruyante (faux positifs massifs) | A09 | `scripts/semgrep/custom-critical-rules.yml:81` | Matcher explicitement les options RBAC admin (`admin*`) | Corrige |
| 7 | Docker auth sans `HEALTHCHECK` explicite ni `USER` explicite | A05 | `infra/auth/Dockerfile.scaleway:24`, `infra/auth/Dockerfile.scaleway:26` | Ajouter healthcheck et execution non-root explicite | Corrige |

## Dependances et CVE
- `./scripts/run-npm-audit.sh` : PASS.
- `cd app-api && uv run pip-audit --skip-editable` : PASS.
- `./scripts/run-osv-scan.sh` : PASS (warning ignore obsolete a nettoyer).
- `./scripts/run-supply-chain-audit.sh` : PASS (DB Grype non rafraichie en contexte reseau restreint).
- `trivy fs --scanners secret` : PASS.
- `trivy fs --scanners vuln` : non concluant en local (telechargement DB impossible).

## Points positifs
- Headers transport securite actifs et verifies par tests (`X-Frame-Options`, `nosniff`, `HSTS`, `Permissions-Policy`).
- JWT cote serveur avec issuer/audience/algorithmes allowlist.
- CORS sans wildcard, bornage des origins et refus localhost hors dev.
- Invariants securite versionnes et etendus au runtime connecteurs.
- Gate local multi-couches deja en place avec policy de severite bloquante.

## Score global
9.0 / 10

Justification : la passe corrige les faiblesses de controle d'acces admin et de frontieres d'entree API (auth + payload + config). Le risque residuel tient surtout a la qualite des sources CVE offline et a la necessite d'un rerun complet des scanners avec DB fraiche.

## Prochaines etapes
1. Relancer `trivy vuln` et `grype` avec DB fraiche des que l'acces reseau scanner est retabli.
2. Ajouter des tests d'integration HTTP (413/415/400) pour API TS et connecteurs.
3. Etendre le pattern de journalisation securite (auth failed, abuse, 5xx) vers les autres services Node.
4. Maintenir la rotation secrets via runbook dedie et preuve d'execution mensuelle.
