# Checklist RGPD -- Praedixa

**Date**: 2026-02-08
**Version**: 1.0
**Auteur**: Security Audit Team (counsel agent)
**Scope**: Backend API + Modeles ORM + Services RGPD

---

## Synthese

| Article    | Sujet                   | Statut        | Details                                             |
| ---------- | ----------------------- | ------------- | --------------------------------------------------- |
| Art. 5     | Principes               | PARTIEL       | Minimisation OK, retention policy manquante         |
| Art. 6     | Base legale             | A DOCUMENTER  | Pas de registre explicite des bases legales         |
| Art. 9     | Donnees sensibles       | CONFORME      | Masquage medical implemente                         |
| Art. 12-14 | Information             | A DOCUMENTER  | Pas de privacy policy in-app                        |
| Art. 15    | Droit d'acces           | PARTIEL       | API tenant-scoped mais pas d'export personnel       |
| Art. 16    | Rectification           | PARTIEL       | CRUD employee existe, pas de workflow formel        |
| Art. 17    | Effacement              | CONFORME      | Erasure workflow dual-approval + crypto-shredding   |
| Art. 20    | Portabilite             | A IMPLEMENTER | Pas d'export personnel structure                    |
| Art. 25    | Privacy by design       | CONFORME      | TenantFilter, chiffrement per-org, masquage medical |
| Art. 30    | Registre traitements    | PARTIEL       | Audit log admin OK, registre formel manquant        |
| Art. 32    | Securite                | CONFORME      | AES-256, HKDF, HTTPS, RBAC                          |
| Art. 33-34 | Notification violations | A IMPLEMENTER | Pas de processus de notification                    |

---

## Detail article par article

### Article 5 -- Principes relatifs au traitement

#### 5.1(a) Licite, loyal, transparent

- **Statut**: A DOCUMENTER
- **Constat**: Le traitement est licite (contrat SaaS), mais la transparence necessite une documentation visible dans l'application (politique de confidentialite, mentions legales).
- **Recommandation**: Ajouter un lien vers la politique de confidentialite dans le footer du webapp et admin.

#### 5.1(b) Limitation des finalites

- **Statut**: CONFORME
- **Constat**: Les donnees sont utilisees exclusivement pour la prevision capacitaire et la gestion RH (finalites definies). Les modeles ORM sont strictement structures pour ces usages.

#### 5.1(c) Minimisation des donnees

- **Statut**: CONFORME
- **Constat**: Les modeles ne collectent que les champs necessaires. Exemple : `Employee` a `first_name`, `last_name`, `email`, `job_title` -- pas de donnees biometriques ou genetiques.
- **Point d'attention**: Le champ `personal_email` dans Employee pourrait etre considere comme non necessaire selon le principe de minimisation. Evaluer si ce champ est requis pour la finalite.

#### 5.1(d) Exactitude

- **Statut**: CONFORME
- **Constat**: Les donnees sont importees depuis les SIRH clients (Lucca, PayFit) avec pipeline de qualite (dedup, validation, outlier detection via `data_quality.py`).

#### 5.1(e) Limitation de la conservation

- **Statut**: GAP
- **Constat**: **Aucune politique de retention n'est implementee dans le code**. Les donnees sont conservees indefiniment. Pas de TTL sur les enregistrements, pas de job de purge automatique.
- **Impact**: Non-conformite potentielle si les donnees sont conservees au-dela de la duree necessaire.
- **Recommandation**: Definir et implementer une politique de retention :
  - Absences : conserver N+1 an apres fin de contrat
  - Donnees employees termines : anonymiser apres 2 ans
  - Logs d'audit : conserver 5 ans (obligation legale)
  - Previsions : purger apres 1 an

#### 5.1(f) Integrite et confidentialite

- **Statut**: CONFORME
- **Constat**: Chiffrement AES-256-GCM per-org ; HMAC-SHA256 pour integrite fit_parameters ; HTTPS force ; cles stockees dans Scaleway Secrets Manager (prod).

#### 5.2 Responsabilite (accountability)

- **Statut**: PARTIEL
- **Constat**: Audit log admin present. Mais pas de DPO designe dans le code/config, pas de registre des traitements formel (Art. 30).

---

### Article 6 -- Licite du traitement

- **Statut**: A DOCUMENTER
- **Base legale identifiee**: Art. 6.1(b) -- execution du contrat SaaS avec l'organisation cliente
- **Constat**: La base legale n'est pas explicitement documentee dans le code ou la configuration. Chaque tenant (organisation) a un contrat SaaS implicite (subscription plan).
- **Recommandation**: Creer un document `data-processing-agreement.md` definissant :
  - Base legale par type de traitement
  - Roles : Praedixa = sous-traitant (processor), Organisation = responsable (controller)
  - Finalites explicites

---

### Article 9 -- Donnees sensibles (categories particulieres)

- **Statut**: CONFORME
- **Donnees Art. 9 identifiees**:
  - `Absence.type` : valeurs `sick_leave`, `sick_leave_workplace`, `maternity`, `paternity` revelent l'etat de sante
  - `Absence.reason` : peut contenir des motifs medicaux en texte libre
  - `Absence.medical_certificate_required/uploaded` : metadata medicale
  - `Absence.recurrence_pattern` : pattern d'absences medicales recurrentes

- **Controles implementes**:
  1. `medical_masking.py` : `mask_medical_reasons()` remplace `reason` par `[MEDICAL]` pour les types medicaux
  2. Champs sensibles supprimes : `medical_certificate_required`, `medical_certificate_uploaded`, `diagnosis_code`, `medical_notes`
  3. Masquage applique au niveau service (pas presentation) -- aucun chemin ne peut contourner

- **Points d'attention**:
  - Le champ `recurrence_pattern` (JSONB) n'est **pas** masque par `mask_medical_reasons()`. Si un pattern de recurrence est associe a une absence medicale, il pourrait reveler des informations de sante.
  - **Recommandation**: Ajouter `recurrence_pattern` a la liste des champs masques dans `_SENSITIVE_FIELDS` pour les absences medicales.

---

### Article 12-14 -- Information des personnes

- **Statut**: A DOCUMENTER
- **Constat**: Pas de mecanisme in-app pour informer les personnes concernees (employes) du traitement de leurs donnees.
- **Recommandation**:
  - Ajouter une page "Donnees personnelles" dans le webapp accessible aux employes
  - Fournir les informations requises : finalites, base legale, duree de conservation, droits
  - Le responsable de traitement est l'organisation cliente (pas Praedixa directement)

---

### Article 15 -- Droit d'acces

- **Statut**: PARTIEL
- **Constat**: Les endpoints tenant-scoped permettent a chaque organisation d'acceder a ses propres donnees. Cependant :
  - Pas d'endpoint dedie pour qu'un **employe individuel** exporte ses propres donnees
  - L'acces est oriente "manager/admin" et non "individuel"
- **Recommandation**: Creer un endpoint `GET /api/v1/me/data` qui retourne toutes les donnees personnelles d'un employe (absences, profil, decisions le concernant).

---

### Article 16 -- Droit de rectification

- **Statut**: PARTIEL
- **Constat**: Les endpoints CRUD sur `Employee` permettent la modification des donnees. Mais :
  - Pas de workflow formel de demande de rectification
  - Pas de trace d'audit specifique "rectification RGPD"
- **Recommandation**: Ajouter un `AdminAuditAction.RECTIFICATION` pour tracer les modifications effectuees suite a une demande RGPD.

---

### Article 17 -- Droit a l'effacement

- **Statut**: CONFORME
- **Implementation**: `rgpd_erasure.py`
- **Points forts**:
  1. **Dual-approval** : `initiated_by != approved_by` -- un seul compte compromis ne peut pas effacer
  2. **Machine d'etat stricte** : `pending_approval -> approved -> executing -> completed/failed`
  3. **Crypto-shredding** : destruction des cles AVANT suppression des donnees -- les backups sont irrecuperables
  4. **Ordre d'execution securise** : cles -> schemas -> platform rows -> commit
  5. **Verification post-erasure** : `verify_erasure()` confirme zero rows restantes
  6. **Audit trail** : `audit_log` chronologique dans chaque ErasureRequest + structlog

- **Points d'attention**:
  - Stockage in-memory (`_erasure_requests` dict) -- non persistent au redemarrage
  - **Recommandation** : Migrer vers table PG avec HMAC integrity (mentionne dans le code comme TODO)

---

### Article 20 -- Droit a la portabilite

- **Statut**: A IMPLEMENTER
- **Constat**: Pas d'endpoint d'export de donnees personnelles en format structure (JSON, CSV).
- **Recommandation**: Implementer `GET /api/v1/me/export` retournant un ZIP contenant :
  - Profil employe (JSON)
  - Historique absences (CSV)
  - Decisions le concernant (CSV)
  - Format machine-readable requis par l'article 20

---

### Article 25 -- Privacy by design et by default

- **Statut**: CONFORME
- **Evidence**:
  1. **By design** : TenantFilter sur chaque requete, chiffrement per-org, masquage medical au niveau service
  2. **By default** : Role par defaut = "viewer" (acces minimal) ; DEBUG force OFF en prod ; HS256 desactive en prod
  3. **Minimisation** : Schemas Pydantic avec `extra="forbid"` ; seuls les champs declares sont acceptes
  4. **Pseudo-anonymisation** : HMAC-SHA256 `pseudonym_hmac_key` prevu dans le key management (pas encore utilise dans les modeles)

---

### Article 30 -- Registre des activites de traitement

- **Statut**: PARTIEL
- **Controles existants**:
  1. `AdminAuditLog` : 21 types d'actions tracees (view_org, update_org, create_org, etc.)
  2. `PipelineConfigHistory` : historique de chaque modification de configuration de pipeline
  3. `IngestionLog` : trace de chaque ingestion de donnees
  4. structlog pour le tracing applicatif

- **Manquant**:
  - Pas de registre formel des activites de traitement (document Art. 30)
  - **Recommandation**: Creer un document `registre-traitements.md` listant :
    - Nom du traitement, finalite, base legale
    - Categories de donnees et de personnes
    - Destinataires
    - Transferts hors UE (Cloudflare = check, Scaleway = France)
    - Durees de conservation
    - Mesures de securite

---

### Article 32 -- Securite du traitement

- **Statut**: CONFORME
- **Mesures techniques**:
  1. **Chiffrement en transit** : HTTPS force (Cloudflare)
  2. **Chiffrement au repos** : AES-256-GCM DEK per-org via HKDF (key_management.py)
  3. **Gestion des cles** : Scaleway Secrets Manager en prod, cles separees par org
  4. **Controle d'acces** : RBAC 6 niveaux, JWT verifie par signature
  5. **Isolation** : TenantFilter multi-tenant, schemas PG separes per-org pour raw data
  6. **Integrite** : HMAC-SHA256 sur fit_parameters
  7. **Audit** : AdminAuditLog avec IP, User-Agent, Request-ID
  8. **Validation entree** : Pydantic strict, extra="forbid", UUID validation

- **Mesures organisationnelles** (a verifier) :
  - Formation securite des developpeurs
  - Revue de code securite
  - Tests de penetration reguliers

---

### Article 33-34 -- Notification de violations

- **Statut**: A IMPLEMENTER
- **Constat**: Pas de processus automatise de detection et notification de violations de donnees.
- **Recommandation**:
  - Implementer un mecanisme d'alerte sur les patterns suspects :
    - Tentatives d'acces cross-tenant
    - Nombre anormal de requetes echouees (401/403)
    - Acces admin hors heures normales
  - Documenter le processus de notification CNIL (72h)
  - Creer un template de notification aux personnes concernees

---

## Synthese des gaps et priorites

| Priorite | Article     | Gap                                         | Effort |
| -------- | ----------- | ------------------------------------------- | ------ |
| P1       | Art. 5.1(e) | Politique de retention non implementee      | M      |
| P1       | Art. 17     | Erasure store non persistent                | M      |
| P1       | Art. 33-34  | Processus notification violations absent    | M      |
| P2       | Art. 6      | Base legale non documentee                  | S      |
| P2       | Art. 9      | `recurrence_pattern` non masque             | XS     |
| P2       | Art. 15/20  | Endpoint export donnees personnelles absent | M      |
| P2       | Art. 30     | Registre des traitements formel manquant    | S      |
| P3       | Art. 12-14  | Information des personnes in-app            | S      |
| P3       | Art. 16     | Workflow rectification formel               | S      |

Legende effort : XS = quelques lignes, S = 1-2 jours, M = 3-5 jours, L = 1-2 semaines
