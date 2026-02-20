# Rapport de Posture Securite -- Praedixa

**Date**: 2026-02-08
**Version**: 2.1 (mise a jour gouvernance gate local signe)
**Equipe d'audit**: counsel (RGPD/Compliance), sentinel (Backend), watchtower (DevOps/Infra), bastion (Frontend/CSP)
**Scope**: Full-stack audit -- backend, frontend, infrastructure, compliance RGPD

## Mise a jour de gouvernance (2026-02-19)

- Les workflows GitHub generalistes de verification (`ci.yml`, `audit.yml`) ont ete retires.
- Le controle bloquant est desormais le gate local exhaustif avec rapport signe.
- Les constats historiques sur "GitHub Actions non SHA-pin" ne sont plus des blocages actuels sur le flux principal.

---

## 1. Executive Summary

Praedixa presente une **posture de securite mature pour un produit early-stage SaaS**. L'architecture applique systematiquement les principes de defense en profondeur : requetes parametrees ORM, JWT frozen payloads, validation Pydantic stricte, chiffrement per-org, masquage medical RGPD, et audit logging admin.

**Evaluation globale : MEDIUM-HIGH (7.75/10)**

Le principal risque resolu (P0-1: RLS inactive) a ete corrige pendant l'audit. Les risques residuels sont principalement des lacunes de completude (audit logging incomplet sur les endpoints erasure, champs PII non chiffres, politique de retention absente) plutot que des vulnerabilites architecturales. Le frontend presente une posture solide avec CSP nonce-based implemente et aucune XSS active.

| Severite      | Total | Fixes | Ouverts | Accepted Risk |
| ------------- | ----- | ----- | ------- | ------------- |
| P0 (Critique) | 2     | 2     | 0       | 0             |
| P1 (Haut)     | 7     | 2     | 4       | 1             |
| P2 (Moyen)    | 12    | 2     | 10      | 0             |
| P3 (Faible)   | 12    | 0     | 12      | 0             |

---

## 2. Findings consolides (tous agents)

### 2.1 P0 -- Critiques (RESOLUS)

| #    | Finding                                                         | Agent      | Statut   |
| ---- | --------------------------------------------------------------- | ---------- | -------- |
| P0-1 | RLS policies inoperatives (`SET LOCAL` manquant)                | sentinel   | **FIXE** |
| P0-2 | Configuration runtime production incomplete (historique Render) | watchtower | **FIXE** |

### 2.2 P1 -- Hauts

| #    | Finding                                                 | Agent      | Fichier                                          | OWASP        | Statut            |
| ---- | ------------------------------------------------------- | ---------- | ------------------------------------------------ | ------------ | ----------------- |
| P1-1 | Admin org update accepte `body: dict` (mass assignment) | sentinel   | `app-api/app/routers/admin_orgs.py`              | API6         | OPEN              |
| P1-2 | Rate limiting IP spoofing via X-Forwarded-For           | sentinel   | `app-api/app/core/rate_limit.py`                 | API4         | OPEN              |
| P1-3 | Endpoints erasure sans `log_admin_action()`             | counsel    | `app-api/app/routers/admin.py` (5 endpoints)     | --           | OPEN              |
| P1-4 | ~~Gate local non unifie et non signe~~                  | watchtower | `scripts/*`, `.pre-commit-config.yaml`           | Supply Chain | **FIXE**          |
| P1-5 | ~~CSP nonce-based pour les 3 frontends~~                | bastion    | `app-*/middleware.ts`                            | A05          | **FIXE**          |
| P1-6 | `recurrence_pattern` non masque (Art. 9)                | counsel    | `app-api/app/services/medical_masking.py`        | --           | OPEN              |
| P1-7 | Rate limiting landing in-memory (reset au redeploy)     | bastion    | `app-landing/app/api/pilot-application/route.ts` | API4         | **ACCEPTED RISK** |

### 2.3 P2 -- Moyens

| #     | Finding                                                   | Agent            | Notes                                                                         |
| ----- | --------------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------- |
| P2-1  | Admin cross-org endpoints et contexte RLS                 | sentinel         | Verifier super_admin bypass RLS                                               |
| P2-2  | Erasure store in-memory (non persistent)                  | sentinel/counsel | Migrer vers table PG + HMAC                                                   |
| P2-3  | `text("1")` positional references                         | sentinel         | Fragile, risque copy-paste                                                    |
| P2-4  | Admin data RLS/TenantFilter desaligne                     | sentinel         | `_admin_tenant()` sans `set_rls_org_id`                                       |
| P2-5  | PII Employee non chiffrees                                | counsel          | first_name, last_name, email, phone                                           |
| P2-6  | Politique de retention absente                            | counsel          | Art. 5.1(e) RGPD non conforme                                                 |
| P2-7  | Processus notification violations absent                  | counsel          | Art. 33-34 RGPD                                                               |
| P2-8  | Pas d'endpoint export donnees personnelles                | counsel          | Art. 15/20 RGPD                                                               |
| P2-9  | Trigger immutabilite audit log absent                     | sentinel/counsel | DB trigger manquant                                                           |
| P2-10 | Dependabot absent pour images Docker                      | watchtower       | Supply chain                                                                  |
| P2-11 | Messages d'erreur login exposent details Supabase         | bastion          | `app-webapp/app/(auth)/login/page.tsx`, `app-admin/app/(auth)/login/page.tsx` |
| P2-12 | CSP Violation Reporting absent (`report-uri`/`report-to`) | bastion          | `app-*/lib/security/csp.ts`                                                   |

### 2.4 P3 -- Faibles

| #     | Finding                                                    | Agent      | Notes                                                         |
| ----- | ---------------------------------------------------------- | ---------- | ------------------------------------------------------------- |
| P3-1  | CORS allow_headers potentiel wildcard                      | sentinel   | Actuellement safe                                             |
| P3-2  | Health endpoint expose environment                         | sentinel   | Reconaissance                                                 |
| P3-3  | Erasure audit log contient user_ids                        | sentinel   | Acces super_admin only                                        |
| P3-4  | `_KNOWN_ROLES` pas enum (fallback viewer)                  | sentinel   | Defense en profondeur                                         |
| P3-5  | Pas de CSRF (Bearer-only auth)                             | sentinel   | Non exploitable                                               |
| P3-6  | Base legale non documentee                                 | counsel    | Art. 6 RGPD                                                   |
| P3-7  | Registre traitements formel manquant                       | counsel    | Art. 30 RGPD                                                  |
| P3-8  | Alignement severite outils a maintenir dans gate local     | watchtower | policy toolchain locale                                       |
| P3-9  | Branch protection distante non imposee (hors gate local)   | watchtower | Gouvernance remote optionnelle                                |
| P3-10 | `encodeURIComponent` manquant dans API_ENDPOINTS constants | bastion    | `app-webapp/lib/api/endpoints.ts`                             |
| P3-11 | Client API propage `error.details` au DOM                  | bastion    | `app-webapp/lib/api/client.ts`, `app-admin/lib/api/client.ts` |
| P3-12 | Email templates HTML inline (pas de lib templating)        | bastion    | `app-landing/app/api/pilot-application/route.ts`              |

---

## 3. Mapping OWASP Top 10

### 3.1 OWASP Web Application Top 10 (2021)

| #   | Categorie                 | Statut       | Notes                                                                                                                                                                                           |
| --- | ------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A01 | Broken Access Control     | **CONFORME** | TenantFilter + RLS (fixe) + require_role + UUID validation. Open redirect protege (`startsWith("/") && !startsWith("//")`)                                                                      |
| A02 | Cryptographic Failures    | **CONFORME** | AES-256-GCM, HKDF-SHA256, Scaleway KMS, HTTPS force. Tokens Supabase geres par SDK (httpOnly, secure)                                                                                           |
| A03 | Injection (XSS)           | **CONFORME** | ORM parametrees, DDL validation, Pydantic extra="forbid". CSP nonce-based implemente (P1-5 fixe). Aucun `dangerouslySetInnerHTML` avec donnees utilisateur. `escapeHtml()` dans email templates |
| A04 | Insecure Design           | **CONFORME** | Privacy by design, defense en profondeur, dual-approval. Separation webapp/admin, super_admin enforcement dans middleware                                                                       |
| A05 | Security Misconfiguration | **FIXE**     | DEBUG off en prod, CSP nonce-based deploye, HSTS + X-Frame-Options + CORP + COOP via middleware. Gate local signe en place                                                                      |
| A06 | Vulnerable Components     | **CONFORME** | pip-audit, pnpm audit, Dependabot, frozen lockfiles                                                                                                                                             |
| A07 | Auth & Session Management | **PARTIEL**  | PyJWT RS256/ES256, audience validation, frozen payloads. Messages login pourraient leaker details (P2-11)                                                                                       |
| A08 | Software & Data Integrity | **PARTIEL**  | HMAC sur fit_parameters, `strict-dynamic` CSP. Renforcer provenance/SBOM reste prioritaire                                                                                                      |
| A09 | Logging & Monitoring      | **PARTIEL**  | Audit log admin (57 appels, 12 routers), X-Request-ID pour tracabilite. Gaps : erasure non logguee (P1-3), pas de CSP violation reporting (P2-12)                                               |
| A10 | SSRF                      | **N/A**      | Pas de fetching base sur input utilisateur                                                                                                                                                      |

### 3.2 OWASP API Security Top 10 (2023)

| #     | Categorie                         | Statut       | Notes                                                  |
| ----- | --------------------------------- | ------------ | ------------------------------------------------------ |
| API1  | BOLA                              | **CONFORME** | TenantFilter + RLS + UUID path params                  |
| API2  | Broken Authentication             | **CONFORME** | PyJWT asymetrique, HS256 dev-only, audience validation |
| API3  | Broken Object Property Level Auth | **PARTIEL**  | P1-1: raw dict body dans admin org update              |
| API4  | Unrestricted Resource Consumption | **PARTIEL**  | Rate limiting present mais bypassable (P1-2)           |
| API5  | Broken Function Level Auth        | **CONFORME** | require_role() sur chaque endpoint admin               |
| API6  | Mass Assignment                   | **PARTIEL**  | extra="forbid" partout sauf P1-1                       |
| API7  | SSRF                              | **N/A**      | JWKS URL validee, pas d'URL user-controlled            |
| API8  | Security Misconfiguration         | **CONFORME** | Config validation stricte au demarrage                 |
| API9  | Improper Inventory Management     | **CONFORME** | Docs desactivees en prod, pas de shadow endpoints      |
| API10 | Unsafe API Consumption            | **CONFORME** | Timeouts Scaleway, paths valides                       |

---

## 4. Bilan RGPD

| Domaine                              | Maturite      | Details                                                                    |
| ------------------------------------ | ------------- | -------------------------------------------------------------------------- |
| Privacy by design (Art. 25)          | Haute         | TenantFilter, chiffrement per-org, masquage medical, extra="forbid"        |
| Droit a l'effacement (Art. 17)       | Haute         | Dual-approval, crypto-shredding, verification post-erasure                 |
| Securite (Art. 32)                   | Haute         | AES-256-GCM, HKDF, HTTPS, RBAC 6 niveaux                                   |
| Donnees sensibles (Art. 9)           | Haute (1 gap) | Masquage medical implemente, gap sur `recurrence_pattern`                  |
| Audit trail (Art. 30)                | Moyenne       | 21 action types tracees, mais erasure non logguee + registre formel absent |
| Retention (Art. 5.1e)                | **Faible**    | Aucune politique implementee                                               |
| Droits personnes (Art. 15/20)        | **Faible**    | Pas d'export personnel, pas de portabilite                                 |
| Notification violations (Art. 33-34) | **Absente**   | Pas de processus automatise                                                |

---

## 5. Crypto Review

| Element              | Implementation                        | Evaluation           |
| -------------------- | ------------------------------------- | -------------------- |
| DEK                  | AES-256-GCM per-org                   | NIST recommended     |
| KDF                  | HKDF-SHA256 (RFC 5869)                | SP 800-56C compliant |
| HMAC                 | SHA-256 pour fit_parameters           | Standard             |
| Key storage          | Scaleway Secrets Manager (prod)       | Externe au DB        |
| Crypto-shredding     | destroy_all_keys() irreversible       | Correct              |
| Key rotation         | Version envelope 1-byte (0-255)       | Acceptable           |
| Local provider guard | Bloque en production                  | Correct              |
| Salt                 | UUID bytes (16 bytes, unique per org) | Acceptable           |

**Aucune faiblesse cryptographique detectee.**

---

## 6. Roadmap de remediation

### Phase 1 -- Avant mise en production (P0/P1)

| #   | Action                                                           | Effort         | Agent      |
| --- | ---------------------------------------------------------------- | -------------- | ---------- |
| 1   | ~~P0-1: Activer RLS via SET LOCAL~~                              | ~~Done~~       | sentinel   |
| 2   | ~~P0-2: durcissement config runtime production~~                 | ~~Done~~       | watchtower |
| 3   | P1-1: Remplacer `body: dict` par Pydantic schema dans admin_orgs | S              | sentinel   |
| 4   | P1-2: Valider proxy CIDR avant trust X-Forwarded-For             | M              | sentinel   |
| 5   | P1-3: Ajouter `log_admin_action` aux 5 endpoints erasure         | S              | counsel    |
| 6   | ~~P1-4: Durcir et figer la politique du gate local signe~~       | ~~Done~~       | watchtower |
| 7   | P1-5: Deployer CSP nonce-based                                   | Done (task #4) | bastion    |
| 8   | P1-6: Masquer `recurrence_pattern` dans medical_masking          | XS             | counsel    |

### Phase 2 -- Premier mois post-launch (P2)

| #   | Action                                                                      | Effort | Agent      |
| --- | --------------------------------------------------------------------------- | ------ | ---------- |
| 9   | P2-1/P2-4: Aligner contexte RLS super_admin cross-org                       | M      | sentinel   |
| 10  | P2-2: Persister erasure store en table PG + HMAC                            | M      | counsel    |
| 11  | P2-5: Chiffrer PII Employee (first_name, last_name, phone) avec DEK per-org | L      | sentinel   |
| 12  | P2-6: Implementer politique de retention par modele                         | M      | counsel    |
| 13  | P2-7: Processus notification violations (alerting + template CNIL)          | M      | counsel    |
| 14  | P2-8: Endpoint `GET /api/v1/me/data` + `GET /api/v1/me/export`              | M      | sentinel   |
| 15  | P2-9: Trigger DB immutabilite audit log                                     | S      | sentinel   |
| 16  | P2-10: Dependabot pour Docker images                                        | XS     | watchtower |
| 17  | P2-11: Wrapper erreurs login avec message generique francais                | XS     | bastion    |
| 18  | P2-12: Ajouter `report-uri`/`report-to` dans CSP pour monitoring violations | S      | bastion    |

### Phase 3 -- Trimestre 1 (P3)

| #   | Action                                                                | Effort | Agent      |
| --- | --------------------------------------------------------------------- | ------ | ---------- |
| 19  | P3-6: Documenter base legale par traitement                           | S      | counsel    |
| 20  | P3-7: Creer registre formel des traitements (Art. 30)                 | S      | counsel    |
| 21  | P3-9: Configurer branch protection distante (si applicable)           | S      | watchtower |
| 22  | P3-8: Aligner severites/outils de scan au sein du gate local          | XS     | watchtower |
| 23  | P3-10: Ajouter `encodeURIComponent` dans API_ENDPOINTS constants      | XS     | bastion    |
| 24  | P3-11: Filtrer `error.details` avant affichage DOM dans use-api hooks | XS     | bastion    |
| 25  | P3-12: Considerer react-email pour templates HTML (landing)           | S      | bastion    |
| 26  | Setup Sentry, structured logging, centralized logs                    | M      | watchtower |
| 27  | WAF rules Cloudflare + HSTS + security headers                        | M      | watchtower |
| 28  | Database SSL + backup strategy + PITR                                 | M      | watchtower |
| 29  | SBOM generation + license compliance                                  | S      | watchtower |
| 30  | CSP Report-Only mode avant enforcement complet                        | S      | bastion    |
| 31  | Subresource Integrity (SRI) pour scripts tiers futurs                 | S      | bastion    |

Legende effort : XS = 1h, S = 1-2 jours, M = 3-5 jours, L = 1-2 semaines

---

## 7. Evaluation de posture par domaine

| Domaine          | Score  | Justification                                                                                                                                                      |
| ---------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Authentification | 9/10   | PyJWT multi-algo, HS256 dev-only, audience validation, frozen payloads. Supabase SSR cookies httpOnly                                                              |
| Autorisation     | 8/10   | TenantFilter + RLS + require_role. -1 pour raw dict admin, -1 pour cross-org RLS. Super_admin enforcement frontend correct                                         |
| Chiffrement      | 8/10   | AES-256/HKDF/Scaleway KMS. -1 pour PII Employee non chiffrees, -1 salt non random                                                                                  |
| Injection (XSS)  | 9/10   | ORM parametrees, DDL validation, Pydantic strict. CSP nonce-based. 0 dangerouslySetInnerHTML avec user data. -1 pour error.details expose                          |
| RGPD             | 6/10   | Erasure + masquage medical excellents. -2 retention, -1 portabilite, -1 notifications                                                                              |
| Audit & Logging  | 7/10   | 57 appels audit dans 12 routers, X-Request-ID. -2 erasure non logguee, -1 trigger immutabilite, -0.5 pas de CSP reporting                                          |
| Infrastructure   | 7.5/10 | Docker harden, gate local signe, frozen lockfiles. -1 branch protection distante, -1 monitoring                                                                    |
| Supply Chain     | 7.5/10 | Dependabot, frozen locks, audits integraux locaux. -1 Docker Dependabot, -1 provenance/SBOM                                                                        |
| Frontend         | 8.5/10 | CSP nonce-based (fixe), open redirect protege, encodeURIComponent systematique, escapeHtml email. -0.5 messages login, -0.5 error.details, -0.5 rate limit landing |

**Score global : 7.75/10 -- Posture solide pour un early-stage SaaS, avec axes d'amelioration documentes.**

### Decomposition par couche

| Couche             | Maturite | Points forts                                                              | Points faibles                                             |
| ------------------ | -------- | ------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **Frontend**       | Haute    | CSP nonce, open redirect protected, 0 XSS active, super_admin enforcement | Messages erreur login, CSP reporting absent                |
| **Backend API**    | Haute    | Pydantic strict, TenantFilter, frozen JWT, HMAC integrity                 | Mass assignment admin, rate limit spoofing                 |
| **Crypto**         | Haute    | AES-256-GCM, HKDF, per-org keys, Scaleway KMS                             | PII Employee clair, salt UUID (non random)                 |
| **RGPD**           | Moyenne  | Erasure dual-approval, masquage medical, crypto-shredding                 | Retention absente, portabilite absente, recurrence_pattern |
| **Infrastructure** | Moyenne+ | Docker hardened, gate local signe, frozen lockfiles                       | Branch protection distante, monitoring                     |

---

## 8. Annexes

### Documents produits pendant cet audit

| Document                  | Auteur     | Chemin                                       |
| ------------------------- | ---------- | -------------------------------------------- |
| STRIDE Threat Model       | counsel    | `docs/security/stride-threat-model.md`       |
| Checklist RGPD            | counsel    | `docs/security/rgpd-checklist.md`            |
| Classification PII        | counsel    | `docs/security/pii-classification.md`        |
| Backend Audit Report      | sentinel   | `docs/security/backend-audit.md`             |
| Frontend Audit Report     | bastion    | `docs/security/frontend-audit.md`            |
| DevOps Audit Report       | watchtower | `docs/security/devops-audit.md`              |
| Infra Hardening Checklist | watchtower | `docs/security/infra-hardening-checklist.md` |
| Security Posture Report   | counsel    | `docs/security/security-posture-report.md`   |

### Fixes appliques pendant l'audit

| Fix                                          | Agent      | Fichiers modifies                                |
| -------------------------------------------- | ---------- | ------------------------------------------------ |
| RLS SET LOCAL                                | sentinel   | `database.py`, `dependencies.py`, + tests        |
| Runtime config hardening (historique Render) | watchtower | fichiers de config runtime (historique)          |
| Dockerfile hardening                         | watchtower | `app-api/Dockerfile`, `infra/docker-compose.yml` |
| .gitignore secrets                           | watchtower | `.gitignore`                                     |
| CSP nonce-based                              | bastion    | `middleware.ts` (3 apps)                         |

### Methodologie

- Revue statique de code de tous les fichiers dans `app-api/app/` (core, models, services, routers)
- Revue statique frontend : `app-webapp`, `app-admin`, `app-landing`, `packages/ui` (XSS, CSP, auth, redirections)
- Mapping OWASP API Security Top 10 2023 + OWASP Web Top 10 2021
- Threat model STRIDE complet (25 menaces identifiees)
- Classification PII de 16 modeles ORM
- Checklist RGPD article par article (Art. 5 a 34)
- Audit gate local, Docker, supply chain, secrets scanning
- Audit frontend : CSP, open redirect, dangerouslySetInnerHTML, cookies, CSRF, composants UI
- Tests de regression securite : ~3025 tests (Vitest + Pytest) tous verts
- 4 agents specialises : sentinel (backend), bastion (frontend/CSP), watchtower (DevOps/infra), counsel (RGPD/compliance)
