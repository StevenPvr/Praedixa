# Rapport d'audit securite — Praedixa Landing (`app-landing`)
Date : 2026-03-01
Auditeur : Codex (skill `seecurity-audit`)

## Resume executif
L'audit OWASP Top 10 de la landing a identifie plusieurs faiblesses exploitables autour de l'anti-automation et des controles d'origine sur les endpoints de formulaires, ainsi qu'un risque d'injection script via JSON-LD. Les points ont ete corriges dans ce lot avec tests associes et durcissement des controles operationnels.

Etat global apres remediation : plus de finding CRITIQUE/HAUTE non corrige dans le scope `app-landing`.

## Resultats

### CRITIQUE — Corriger immediatement
Aucun finding critique dans le scope audite.

### HAUTE — Corriger avant mise en production
| # | Vulnerabilite | OWASP | CWE | Fichier:ligne | Impact | Fix recommande | Etat |
|---|---|---|---|---|---|---|---|
| 1 | Verification anti-spam basee sur valeurs client (captcha/temps) | A04 Insecure Design | CWE-602 | [app-landing/app/api/contact/route.ts:209](/Users/steven/Programmation/praedixa/app-landing/app/api/contact/route.ts:209), [app-landing/lib/security/contact-challenge.ts:119](/Users/steven/Programmation/praedixa/app-landing/lib/security/contact-challenge.ts:119) | Un bot pouvait forger facilement un payload coherent pour bypasser le controle anti-spam | Remplacer par un challenge signe HMAC cote serveur, token horodate, verification de signature + fenetre temporelle | Corrige |
| 2 | Requetes sans `origin`/`referer` acceptees sur POST sensibles | A01 Broken Access Control / CSRF | CWE-352 | [app-landing/lib/security/request-origin.ts:90](/Users/steven/Programmation/praedixa/app-landing/lib/security/request-origin.ts:90), [app-landing/app/api/contact/route.ts:503](/Users/steven/Programmation/praedixa/app-landing/app/api/contact/route.ts:503), [app-landing/app/api/pilot-application/route.ts:56](/Users/steven/Programmation/praedixa/app-landing/app/api/pilot-application/route.ts:56) | Acceptance trop permissive de clients non-browser/sans preuve d'origine | Exiger une source explicite (`origin` ou `referer`) de confiance pour les endpoints de mutation | Corrige |

### MOYENNE — A planifier
| # | Vulnerabilite | OWASP | CWE | Fichier:ligne | Impact | Fix recommande | Etat |
|---|---|---|---|---|---|---|---|
| 3 | Injection possible dans balises `<script type="application/ld+json">` via contenu non fiabilise | A03 Injection | CWE-79 | [app-landing/components/seo/JsonLd.tsx:122](/Users/steven/Programmation/praedixa/app-landing/components/seo/JsonLd.tsx:122), [app-landing/components/pages/SerpResourcePage.tsx:78](/Users/steven/Programmation/praedixa/app-landing/components/pages/SerpResourcePage.tsx:78), [app-landing/lib/security/json-script.ts:1](/Users/steven/Programmation/praedixa/app-landing/lib/security/json-script.ts:1) | Un contenu non maitrise pouvait casser le contexte script (`</script>`) | Utiliser une serialisation JSON securisee pour script tags (`<`, `>`, `&`, U+2028/2029`) | Corrige |
| 4 | Journalisation securite insuffisante sur rejets d'abus | A09 Logging & Monitoring Failures | CWE-778 | [app-landing/lib/security/audit-log.ts:34](/Users/steven/Programmation/praedixa/app-landing/lib/security/audit-log.ts:34), [app-landing/app/api/contact/route.ts:491](/Users/steven/Programmation/praedixa/app-landing/app/api/contact/route.ts:491), [app-landing/app/api/pilot-application/route.ts:44](/Users/steven/Programmation/praedixa/app-landing/app/api/pilot-application/route.ts:44) | Detection plus difficile des patterns malveillants en prod | Logger les rejets rate-limit/origin/challenge + erreurs serveur en mode structure | Corrige |

### BASSE / Informationnel
| # | Observation | OWASP | Fichier:ligne | Recommandation | Etat |
|---|---|---|---|---|---|
| 5 | Endpoint ingest acceptait tout `content-type` et pouvait etre cache | A05 Security Misconfiguration | [app-landing/app/api/v1/public/contact-requests/route.ts:22](/Users/steven/Programmation/praedixa/app-landing/app/api/v1/public/contact-requests/route.ts:22) | Forcer `application/json` et `Cache-Control: no-store` | Corrige |
| 6 | Secret challenge en fallback local hors production (dev/test) | A05 Security Misconfiguration | [app-landing/lib/security/contact-challenge.ts:34](/Users/steven/Programmation/praedixa/app-landing/lib/security/contact-challenge.ts:34) | Conserver fallback dev, mais definir `CONTACT_FORM_CHALLENGE_SECRET` explicite en staging/prod | Accepte (dev only) |

## Dependances et CVE
- `./scripts/run-npm-audit.sh` : PASS (aucune vulnerabilite MEDIUM+ non resolue selon politique en vigueur).
- Exception active constatee : `SEC-EXC-2026-0001` (npm-audit, Ajv transitive low, expiration 2026-03-22).
- `python3 scripts/check-prod-security-config.py --mode full` : PASS.

## Points positifs
- Headers securite robustes (`CSP`, `HSTS`, `X-Frame-Options`, `Permissions-Policy`) deja en place.
- Validation stricte des payloads de formulaires (taille, formats, allowlists).
- Protection anti-abus deja presente (honeypot, rate-limit, filtrage d'origine), desormais renforcee.
- Comparaison de secrets en temps constant sur endpoint ingest (`timingSafeEqual`).

## Score global
8.7 / 10

Justification : bonne base defensive deja en place, avec un gap principal corrige sur l'anti-automation et la robustesse des controles d'origine. Le risque residuel principal est operationnel (gestion des secrets et suivi continu des exceptions de vulnerabilites transitive toolchain).

## Prochaines etapes
1. Ajouter des tests E2E contact (parcours complet challenge -> submit) pour couvrir le flux navigateur reel.
2. Mettre `CONTACT_FORM_CHALLENGE_SECRET` en secret dedie sur tous les environnements non-dev.
3. Re-auditer les exceptions npm-audit avant `2026-03-22` et supprimer l'exception si upstream est corrige.
4. Activer alerting centralise sur les evenements `contact.*` et `pilot.*` de securite.
