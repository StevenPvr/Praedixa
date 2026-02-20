# STRIDE Threat Model -- Praedixa

**Date**: 2026-02-19
**Version**: 1.1
**Auteur**: Security Audit Team (counsel agent)
**Scope**: Backend API (FastAPI), Frontend (Next.js 15), Infrastructure (Scaleway FR + DNS transitoire Cloudflare)

---

## 1. Contexte systeme

Praedixa est une plateforme SaaS multi-tenant de prevision capacitaire pour sites logistiques. L'architecture comprend :

- **Backend**: FastAPI + SQLAlchemy 2.0 async + PostgreSQL 16
- **Auth**: OIDC Keycloak self-hosted (RS256/ES256/EdDSA via JWKS)
- **Multi-tenancy**: Isolation par `organization_id` via `TenantFilter.apply()` sur chaque requete
- **Donnees sensibles**: Motifs medicaux (RGPD Art. 9), donnees RH, previsions capacitaires
- **Chiffrement**: HKDF key derivation, AES-256-GCM DEK per-org, HMAC-SHA256
- **Key Management**: LocalKeyProvider (dev) / ScalewaySecretsKeyProvider (prod)
- **Roles**: super_admin, org_admin, hr_manager, manager, employee, viewer

---

## 2. Diagramme des flux de donnees

```
[Browser] --HTTPS--> [Next.js (Scaleway Serverless Container)]
                          |
                          | Bearer JWT
                          v
                     [FastAPI API] --asyncpg--> [PostgreSQL 16]
                          |
                          | HKDF/AES-256
                          v
                     [Scaleway Secrets Manager]
```

Acteurs :

- **Utilisateur tenant** : employe, manager, hr_manager, org_admin
- **Super admin** : acces cross-tenant via admin back-office
- **API Backend** : service FastAPI verifiant JWT et appliquant TenantFilter
- **PostgreSQL** : stockage multi-tenant avec organization_id sur chaque table
- **Scaleway Secrets Manager** : stockage des cles de chiffrement per-org

---

## 3. Menaces STRIDE

### 3.1 Spoofing (Usurpation d'identite)

| #   | Menace                                                                             | Impact | Proba | Controles existants                                                                                                                                     | Recommandations                                                                                                                         |
| --- | ---------------------------------------------------------------------------------- | ------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | **Forgerie JWT** : attaquant cree un token avec un faux `sub` ou `organization_id` | 5      | 2     | Verification signature RS256/ES256/EdDSA via JWKS ; HS256 desactive en prod ; audience="authenticated" validee ; algorithme "none" bloque explicitement | CONFORME. Verifier que `LEGACY_HS256_ENABLED` est force a False en staging/prod (actuellement valide par `Settings._validate_secrets`). |
| S2  | **Vol de token JWT** : XSS extrait le token du localStorage ou des cookies         | 5      | 3     | Sessions serveur signees (cookies httpOnly) ; pas de localStorage pour les tokens                                                                       | Implementer CSP nonce-based sur tous les frontends. Ajouter `Secure; SameSite=Strict` sur tous les cookies de session.                  |
| S3  | **Session hijacking** via token vole en transit                                    | 4      | 1     | HTTPS force (edge/CDN + origin) ; tokens OIDC a duree limitee                                                                                           | CONFORME. Considerer la reduction du TTL JWT a 15-30min avec refresh token rotation.                                                    |
| S4  | **Usurpation d'admin** : attaquant modifie le claim `role` dans le JWT             | 5      | 1     | Role extrait des claims IdP (`realm_access` / `resource_access` / `app_metadata`) ; validation contre `_KNOWN_ROLES`                                    | CONFORME. Les claims privilegies sont emis cote IdP serveur, non modifiables cote client.                                               |
| S5  | **Replay attack** : reutilisation d'un ancien JWT                                  | 3      | 2     | Expiration JWT verifiee par PyJWT automatiquement                                                                                                       | Pas de mecanisme de revocation immediat (pas de blacklist). Considerer un jti-based revocation pour les comptes compromis.              |
| S6  | **Dev issuer fallback** : en dev, l'issuer est extrait du token non verifie        | 3      | 2     | Allowlist de hosts JWKS (`auth.praedixa.com`, localhost) ; verifie en `_is_allowed_jwks_host` ; desactive sauf `ALLOW_DEV_ISSUER_FALLBACK=True`         | CONFORME pour dev. Verifier que ce flag est impossible a activer en prod (actuellement protege par `_is_local_development()`).          |

### 3.2 Tampering (Falsification)

| #   | Menace                                                                          | Impact | Proba | Controles existants                                                                                                                 | Recommandations                                                                                                                                                                                |
| --- | ------------------------------------------------------------------------------- | ------ | ----- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1  | **Injection SQL** via parametres de requete                                     | 5      | 1     | SQLAlchemy ORM avec requetes parametrees ; pas de SQL brut dans les services ; `extra="forbid"` sur les schemas Pydantic            | CONFORME. L'ORM SQLAlchemy 2.0 utilise des requetes parametrees par defaut.                                                                                                                    |
| T2  | **Modification de donnees en transit**                                          | 4      | 1     | HTTPS force (DNS/edge + origin) ; pas de HTTP en prod                                                                               | CONFORME.                                                                                                                                                                                      |
| T3  | **Tampering des donnees au repos**                                              | 4      | 2     | AES-256-GCM DEK per-org pour PII ; HMAC-SHA256 pour integrite des fit_parameters ; cles stockees hors DB (Scaleway Secrets Manager) | CONFORME. Le HMAC sur `fit_parameters` detecterait toute modification.                                                                                                                         |
| T4  | **Mass assignment** : injection de champs non attendus dans le body             | 3      | 2     | `CamelModel(extra="forbid")` rejette tout champ non declare ; validation Pydantic stricte                                           | CONFORME. Le `extra="forbid"` est systematique.                                                                                                                                                |
| T5  | **Tampering audit log** : modification des entries AdminAuditLog                | 5      | 2     | Design append-only (pas d'UPDATE/DELETE expose) ; commentaire mentionne DB trigger en prod                                          | **GAP MINEUR** : Le trigger DB d'immutabilite n'est pas encore en place (mentionne comme TODO pour prod). Ajouter un trigger `BEFORE UPDATE OR DELETE ON admin_audit_log` qui RAISE EXCEPTION. |
| T6  | **Tampering erasure workflow** : manipulation du statut d'une demande d'erasure | 5      | 2     | Machine d'etat stricte (`_VALID_TRANSITIONS`) ; stockage in-memory avec lock ; dual-approval                                        | **GAP** : Stockage in-memory (non persistent) -- une requete en cours est perdue au redemarrage. Migrer vers table persistante avec HMAC integrity checks (mentionne dans le code comme TODO). |

### 3.3 Repudiation (Non-repudiation)

| #   | Menace                                                                                 | Impact | Proba | Controles existants                                                                                                                                          | Recommandations                                                                                                                                        |
| --- | -------------------------------------------------------------------------------------- | ------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | **Admin nie une action** : super_admin effectue une action sensible et nie             | 4      | 2     | `AdminAuditLog` append-only avec who (admin_user_id from JWT), what (action enum), when (created_at server-side), where (ip_address, user_agent, request_id) | CONFORME. L'audit log capture : identite, action, timestamp serveur, IP, User-Agent.                                                                   |
| R2  | **Actions non logguees** : certains endpoints admin n'appellent pas `log_admin_action` | 4      | 2     | Tests de securite verifient la presence de `log_admin_action` dans chaque router admin                                                                       | Verifier la completude : il y a 21 `AdminAuditAction` enum values et 32+ endpoints admin. S'assurer que chaque endpoint a un appel `log_admin_action`. |
| R3  | **Erasure sans trace** : une erasure RGPD est executee sans audit trail                | 5      | 1     | `ErasureRequest.audit_log` maintient une timeline chronologique ; structlog avec correlation context                                                         | CONFORME pour les erasures. Le `audit_log` interne a ErasureRequest + structlog fournissent une double trace.                                          |
| R4  | **Pipeline config changes** : modifications de pipeline non tracees                    | 3      | 2     | `PipelineConfigHistory` model avec config_snapshot, columns_snapshot, changed_by, change_reason                                                              | CONFORME. Chaque changement de config est enregistre avec l'historique complet.                                                                        |

### 3.4 Information Disclosure (Fuite d'information)

| #   | Menace                                                                      | Impact | Proba | Controles existants                                                                                                                                                                  | Recommandations                                                                                                                                                                            |
| --- | --------------------------------------------------------------------------- | ------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I1  | **Fuite cross-tenant** : utilisateur accede aux donnees d'un autre tenant   | 5      | 2     | `TenantFilter.apply()` sur chaque requete ; `organization_id` NOT NULL + indexed sur chaque table tenant                                                                             | **RISQUE RESIDUEL** : La protection repose sur l'application systematique de `TenantFilter` par les developpeurs. Un oubli = fuite. Considerer PostgreSQL RLS comme defense en profondeur. |
| I2  | **Fuite de donnees medicales** (Art. 9 RGPD)                                | 5      | 2     | `mask_medical_reasons()` remplace les motifs medicaux par "[MEDICAL]" et supprime les champs sensibles (`medical_certificate_*`, `diagnosis_code`, `medical_notes`)                  | CONFORME pour les vues admin. Verifier que le masquage est aussi applique pour les exports CSV/XLSX et les APIs de recherche.                                                              |
| I3  | **Error messages revelant des internes**                                    | 3      | 2     | Exception handler global : `str(exc) if settings.DEBUG else "An unexpected error occurred"` ; DEBUG force a False en staging/prod ; `NotFoundError` ne reflecte que les UUID valides | CONFORME. Les stack traces sont masquees en production.                                                                                                                                    |
| I4  | **Information leakage via log** : donnees sensibles dans les logs           | 3      | 2     | Key material NEVER logged (commentaire explicite dans key_management.py) ; structlog avec identifiants opaques                                                                       | CONFORME. Verifier que les emails et noms ne sont pas logges en clair dans les requetes HTTP.                                                                                              |
| I5  | **X-Request-ID reflection** : injection via header reflecte dans la reponse | 2      | 2     | Validation stricte : max 64 chars, ASCII, printable uniquement (`_safe_request_id`)                                                                                                  | CONFORME. La validation empechee la reflection de contenu malveillant.                                                                                                                     |
| I6  | **CORS misconfiguration** : origins trop permissifs                         | 4      | 1     | Allowlist explicite ; HTTPS force en staging/prod ; localhost interdit en prod ; validation dans `Settings._validate_secrets`                                                        | CONFORME. Pas de wildcard `*`.                                                                                                                                                             |

### 3.5 Denial of Service (Deni de service)

| #   | Menace                                | Impact | Proba | Controles existants                                                                                  | Recommandations                                                                                                                                                          |
| --- | ------------------------------------- | ------ | ----- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | **Rate limiting bypass**              | 3      | 3     | slowapi avec Redis backend optionnel ; `limiter.enabled = False` en tests                            | Verifier que le rate limiting est effectivement active en production. S'assurer que les limites sont suffisamment strictes pour les endpoints sensibles (auth, erasure). |
| D2  | **Resource exhaustion via upload**    | 3      | 3     | `MAX_UPLOAD_SIZE_BYTES = 50MB` ; `MAX_ROWS_PER_INGESTION = 500,000` ; `UPLOAD_COOLDOWN_SECONDS = 10` | CONFORME. Les limites sont configurables et raisonnables.                                                                                                                |
| D3  | **Erasure store exhaustion**          | 2      | 1     | `_MAX_ERASURE_REQUESTS = 1000` avec eviction des terminaux                                           | CONFORME. Capacite bornee avec eviction automatique.                                                                                                                     |
| D4  | **Slowloris / connection exhaustion** | 3      | 2     | Protection edge + reverse proxy + timeouts applicatifs                                               | Verifier les timeouts sur les connexions asyncpg vers PostgreSQL et les limites de concurrency containers.                                                               |
| D5  | **Scaleway API timeout**              | 2      | 2     | Timeouts separes connect=10s, read=30s dans `ScalewaySecretsKeyProvider`                             | CONFORME. Les timeouts empechent les connexions pendantes.                                                                                                               |
| D6  | **Dataset/column limits bypass**      | 2      | 2     | `MAX_DATASETS_PER_ORG = 50` ; `MAX_COLUMNS_PER_TABLE = 200` ; `MAX_WINDOWS_PER_DATASET = 10`         | CONFORME. Verifier que ces limites sont effectivement appliquees dans les routers d'ingestion.                                                                           |

### 3.6 Elevation of Privilege (Escalade de privileges)

| #   | Menace                                                                                  | Impact | Proba | Controles existants                                                                                                                                  | Recommandations                                                                                                                                                               |
| --- | --------------------------------------------------------------------------------------- | ------ | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | **Escalade de role** : utilisateur modifie son role dans le JWT                         | 5      | 1     | Role extrait des claims IdP (`realm_access` / `resource_access` / `app_metadata`) ; `_KNOWN_ROLES` validation ; role inconnu -> downgrade a "viewer" | CONFORME. Les claims privilegies sont geres cote IdP serveur.                                                                                                                 |
| E2  | **BOLA (Broken Object Level Authorization)** : acces a des ressources d'un autre tenant | 5      | 2     | `TenantFilter.apply()` sur chaque requete tenant-scoped ; `get_admin_tenant_filter` reserve aux super_admin                                          | **RISQUE** : Protection applicative uniquement. Un oubli de `TenantFilter` dans un nouveau service = BOLA. Recommander PostgreSQL RLS comme filet de securite supplementaire. |
| E3  | **Acces admin cross-tenant non autorise**                                               | 5      | 1     | `get_admin_tenant_filter` exige `require_role("super_admin")` ; UUID validee par FastAPI path parameter                                              | CONFORME. Le guard `require_role` est une dependance FastAPI incontournable.                                                                                                  |
| E4  | **Vertical privilege escalation** : viewer essaie d'executer des actions admin          | 4      | 2     | `require_role()` comme dependance FastAPI sur chaque router admin ; super_admin rejete du webapp                                                     | CONFORME. La verification de role est systematique.                                                                                                                           |
| E5  | **Self-approval erasure** : meme admin initie et approuve une erasure                   | 5      | 1     | Dual-approval enforcement : `initiated_by != approved_by` verifie dans `approve_erasure`                                                             | CONFORME. Un seul compte admin compromis ne peut pas effacer de donnees unilateralement.                                                                                      |

---

## 4. Matrice de risque

| Niveau           | Definition                   | Couleur |
| ---------------- | ---------------------------- | ------- |
| Critique (20-25) | Correction immediate requise | Rouge   |
| Haut (12-19)     | Correction dans le sprint    | Orange  |
| Moyen (6-11)     | Planifier dans le backlog    | Jaune   |
| Faible (1-5)     | Accepter ou surveiller       | Vert    |

### Top risques par score (Impact x Probabilite)

| Rang | ID  | Menace                                  | Score | Statut                               |
| ---- | --- | --------------------------------------- | ----- | ------------------------------------ |
| 1    | S2  | Vol de token JWT via XSS                | 15    | CSP nonce-based en cours (task #4)   |
| 2    | I1  | Fuite cross-tenant (oubli TenantFilter) | 10    | RLS PostgreSQL recommandee (task #1) |
| 3    | E2  | BOLA (oubli TenantFilter)               | 10    | Meme remediation que I1              |
| 4    | T5  | Tampering audit log (pas de trigger DB) | 10    | Ajouter trigger immutabilite         |
| 5    | T6  | Erasure store non persistent            | 10    | Migrer vers table persistante + HMAC |
| 6    | D1  | Rate limiting bypass                    | 9     | Verifier config prod                 |
| 7    | S5  | Replay attack JWT                       | 6     | Considerer jti-based revocation      |
| 8    | R2  | Actions admin non logguees              | 8     | Audit completude endpoints           |

---

## 5. Recommandations prioritaires

### P0 -- Critique

1. **PostgreSQL RLS** : Ajouter `SET LOCAL app.current_organization_id` dans la session DB et des policies RLS sur toutes les tables tenant-scoped. Defense en profondeur contre les oublis de TenantFilter. (En cours -- task #1)

### P1 -- Haut

2. **CSP nonce-based** : Implementer Content-Security-Policy avec nonces sur les 3 frontends (landing, webapp, admin). (En cours -- task #4)
3. **Trigger immutabilite audit log** : `CREATE TRIGGER audit_log_immutable BEFORE UPDATE OR DELETE ON admin_audit_log FOR EACH ROW EXECUTE FUNCTION raise_readonly_exception();`
4. **Persistance erasure requests** : Migrer de `_erasure_requests` in-memory vers une table `erasure_requests` avec HMAC integrity sur chaque transition.

### P2 -- Moyen

5. **JWT revocation** : Implementer une blacklist Redis des `jti` pour les comptes compromis (avec TTL = JWT max lifetime).
6. **Rate limiting audit** : Verifier les limites par endpoint en production, en particulier : `/api/v1/admin/erasure/*`, `/auth/*`, `/api/v1/datasets/upload`.
7. **Medical masking completude** : Verifier que `mask_medical_reasons()` est appliquee dans tous les chemins d'export (CSV, XLSX, API search).

### P3 -- Faible

8. **JWT TTL reduction** : Considerer 15-30min au lieu de 1h par defaut, avec refresh token rotation.
9. **Structured logging audit** : Verifier qu'aucun PII (email, nom) n'apparait en clair dans les logs applicatifs.

---

## 6. Perimetre hors scope

- Securite physique de l'infrastructure Scaleway (et Cloudflare tant que DNS transitoire)
- Vulnerabilites dans les dependances tierces (couvert par le gate local exhaustif: audits deps + scans securite)
- Ingenierie sociale
- DDoS reseau (couvert par la couche edge active)
