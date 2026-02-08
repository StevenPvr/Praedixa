# Classification PII -- Praedixa

**Date**: 2026-02-08
**Version**: 1.0
**Auteur**: Security Audit Team (counsel agent)
**Scope**: Tous les modeles ORM (`apps/api/app/models/*.py`) -- 16 modeles, 14+ tables

---

## 1. Methodologie de classification

Chaque champ est classe selon trois niveaux :

| Niveau                       | Definition                                  | Exemples                  | Exigences RGPD                                |
| ---------------------------- | ------------------------------------------- | ------------------------- | --------------------------------------------- |
| **PII Directe**              | Identifie directement une personne physique | Nom, email, telephone     | Chiffrement, minimisation, acces restreint    |
| **PII Indirecte**            | Identifie une personne par recoupement      | ID employe, site + poste  | Pseudonymisation recommandee                  |
| **Donnee Sensible (Art. 9)** | Categorie particuliere de donnees           | Motif medical, handicap   | Base legale specifique + masquage obligatoire |
| **Donnee Operationnelle**    | Pas de PII                                  | Previsions, couts, config | Protection standard                           |

---

## 2. Classification par modele

### 2.1 User (`users`)

| Champ              | Type DB     | Classification  | Chiffrement au repos | Masquage | Retention                  |
| ------------------ | ----------- | --------------- | -------------------- | -------- | -------------------------- |
| `id`               | UUID PK     | PII Indirecte   | Non                  | Non      | Duree du compte            |
| `organization_id`  | UUID FK     | Operationnelle  | Non                  | Non      | Duree du compte            |
| `supabase_user_id` | String(255) | PII Indirecte   | Non                  | Non      | Duree du compte            |
| `email`            | String(320) | **PII Directe** | Non (index unique)   | Non      | **GAP** : pas de retention |
| `email_verified`   | Boolean     | Operationnelle  | Non                  | Non      | Duree du compte            |
| `role`             | Enum        | Operationnelle  | Non                  | Non      | Duree du compte            |
| `status`           | Enum        | Operationnelle  | Non                  | Non      | Duree du compte            |
| `employee_id`      | UUID        | PII Indirecte   | Non                  | Non      | Duree du compte            |
| `last_login_at`    | DateTime    | PII Indirecte   | Non                  | Non      | **GAP** : comportemental   |
| `mfa_enabled`      | Boolean     | Securite        | Non                  | Non      | Duree du compte            |
| `locale`           | String(10)  | Operationnelle  | Non                  | Non      | Duree du compte            |
| `timezone`         | String(50)  | Operationnelle  | Non                  | Non      | Duree du compte            |

**Risques** :

- `email` est PII directe non chiffree. L'index unique empeche le chiffrement deterministe standard.
- `last_login_at` est une donnee comportementale qui pourrait reveler des patterns d'activite.

---

### 2.2 Employee (`employees`)

| Champ              | Type DB       | Classification    | Chiffrement au repos | Masquage | Retention                    |
| ------------------ | ------------- | ----------------- | -------------------- | -------- | ---------------------------- |
| `id`               | UUID PK       | PII Indirecte     | Non                  | Non      | Duree du contrat + N         |
| `organization_id`  | UUID FK       | Operationnelle    | Non                  | Non      | -                            |
| `department_id`    | UUID FK       | PII Indirecte     | Non                  | Non      | Duree du contrat + N         |
| `site_id`          | UUID FK       | PII Indirecte     | Non                  | Non      | Duree du contrat + N         |
| `user_id`          | UUID FK       | PII Indirecte     | Non                  | Non      | Duree du contrat + N         |
| `manager_id`       | UUID FK       | PII Indirecte     | Non                  | Non      | Duree du contrat + N         |
| `employee_number`  | String(50)    | **PII Directe**   | Non                  | Non      | **GAP** : identifiant unique |
| `first_name`       | String(100)   | **PII Directe**   | Non                  | Non      | **GAP** : non chiffre        |
| `last_name`        | String(100)   | **PII Directe**   | Non                  | Non      | **GAP** : non chiffre        |
| `display_name`     | String(200)   | **PII Directe**   | Non                  | Non      | **GAP** : non chiffre        |
| `email`            | String(320)   | **PII Directe**   | Non                  | Non      | **GAP** : non chiffre        |
| `personal_email`   | String(320)   | **PII Directe**   | Non                  | Non      | **GAP** : minimisation?      |
| `phone`            | String(30)    | **PII Directe**   | Non                  | Non      | **GAP** : non chiffre        |
| `job_title`        | String(200)   | PII Indirecte     | Non                  | Non      | Duree du contrat + N         |
| `job_category`     | String(100)   | PII Indirecte     | Non                  | Non      | Duree du contrat + N         |
| `employment_type`  | Enum          | Operationnelle    | Non                  | Non      | -                            |
| `contract_type`    | Enum          | PII Indirecte     | Non                  | Non      | Duree du contrat + N         |
| `fte`              | Numeric       | Operationnelle    | Non                  | Non      | -                            |
| `hire_date`        | Date          | PII Indirecte     | Non                  | Non      | Duree du contrat + N         |
| `end_date`         | Date          | PII Indirecte     | Non                  | Non      | Duree du contrat + N         |
| `is_critical_role` | Boolean       | Operationnelle    | Non                  | Non      | -                            |
| `skills`           | ARRAY(String) | PII Indirecte     | Non                  | Non      | Duree du contrat + N         |
| `daily_cost`       | Numeric       | **PII Indirecte** | Non                  | Non      | **SENSIBLE** : remuneration  |
| `absence_balance`  | JSONB         | PII Indirecte     | Non                  | Non      | Duree du contrat + N         |
| `status`           | Enum          | Operationnelle    | Non                  | Non      | -                            |

**Risques critiques** :

- `first_name`, `last_name`, `display_name`, `email`, `phone` sont **PII directes non chiffrees** en base
- `personal_email` pourrait violer le principe de minimisation (Art. 5.1c) si non necessaire a la finalite
- `daily_cost` est une donnee de remuneration -- sensible meme si pas Art. 9
- Le modele Employee est le modele le plus riche en PII de toute la codebase

**Recommandations** :

1. Chiffrer `first_name`, `last_name`, `personal_email`, `phone` avec le DEK per-org (AES-256-GCM)
2. Evaluer si `personal_email` est necessaire a la finalite
3. Implementer un pseudonyme deterministe (`pseudonym_hmac_key`) pour les references dans les tables agregees

---

### 2.3 Absence (`absences`)

| Champ                          | Type DB     | Classification               | Chiffrement au repos | Masquage                        | Retention                                     |
| ------------------------------ | ----------- | ---------------------------- | -------------------- | ------------------------------- | --------------------------------------------- |
| `id`                           | UUID PK     | Operationnelle               | Non                  | Non                             | -                                             |
| `organization_id`              | UUID FK     | Operationnelle               | Non                  | Non                             | -                                             |
| `employee_id`                  | UUID FK     | PII Indirecte                | Non                  | Non                             | Lie a Employee                                |
| `type`                         | Enum        | **DONNEE SENSIBLE (Art. 9)** | Non                  | **OUI** (masquage medical)      | **GAP** : pas de retention                    |
| `category`                     | Enum        | PII Indirecte                | Non                  | Non                             | -                                             |
| `start_date`                   | Date        | PII Indirecte                | Non                  | Non                             | Combinee avec type = sensible                 |
| `end_date`                     | Date        | PII Indirecte                | Non                  | Non                             | Combinee avec type = sensible                 |
| `start_portion`                | Enum        | Operationnelle               | Non                  | Non                             | -                                             |
| `end_portion`                  | Enum        | Operationnelle               | Non                  | Non                             | -                                             |
| `duration`                     | JSONB       | Operationnelle               | Non                  | Non                             | -                                             |
| `business_days`                | Integer     | Operationnelle               | Non                  | Non                             | -                                             |
| `status`                       | Enum        | Operationnelle               | Non                  | Non                             | -                                             |
| `reason`                       | Text        | **DONNEE SENSIBLE (Art. 9)** | Non                  | **OUI** (masque -> "[MEDICAL]") | **GAP** : texte libre potentiellement medical |
| `manager_comment`              | Text        | PII Indirecte                | Non                  | Non                             | Peut contenir PII                             |
| `rejection_reason`             | Text        | Operationnelle               | Non                  | Non                             | -                                             |
| `approver_id`                  | UUID FK     | PII Indirecte                | Non                  | Non                             | -                                             |
| `decision_at`                  | DateTime    | Operationnelle               | Non                  | Non                             | -                                             |
| `medical_certificate_required` | Boolean     | **DONNEE SENSIBLE (Art. 9)** | Non                  | **OUI** (supprime par masquage) | -                                             |
| `medical_certificate_uploaded` | Boolean     | **DONNEE SENSIBLE (Art. 9)** | Non                  | **OUI** (supprime par masquage) | -                                             |
| `replacement_employee_id`      | UUID FK     | PII Indirecte                | Non                  | Non                             | -                                             |
| `source_system`                | String(100) | Operationnelle               | Non                  | Non                             | -                                             |
| `external_id`                  | String(255) | PII Indirecte                | Non                  | Non                             | Identifiant SIRH externe                      |
| `recurrence_pattern`           | JSONB       | **DONNEE SENSIBLE (Art. 9)** | Non                  | **NON**                         | **GAP CRITIQUE**                              |

**Risques critiques** :

- `recurrence_pattern` n'est **PAS masque** par `mask_medical_reasons()` -- un pattern de recurrence d'absences medicales revele des informations de sante (frequence des arretes maladie, patterns saisonniers de maladies chroniques)
- `reason` est un champ texte libre qui pourrait contenir des details medicaux meme pour des types non-medicaux
- `manager_comment` pourrait contenir des references a l'etat de sante

**Recommandation** : Ajouter `recurrence_pattern` a `_SENSITIVE_FIELDS` dans `medical_masking.py`

---

### 2.4 Organization (`organizations`)

| Champ           | Type DB     | Classification                    | Chiffrement au repos | Masquage | Retention                  |
| --------------- | ----------- | --------------------------------- | -------------------- | -------- | -------------------------- |
| `id`            | UUID PK     | Operationnelle                    | Non                  | Non      | -                          |
| `name`          | String(255) | PII Morale                        | Non                  | Non      | Duree du contrat           |
| `slug`          | String(100) | Operationnelle                    | Non                  | Non      | -                          |
| `legal_name`    | String(255) | PII Morale                        | Non                  | Non      | Duree du contrat           |
| `siret`         | String(14)  | **PII Directe (personne morale)** | Non                  | Non      | Identifiant legal          |
| `sector`        | Enum        | Operationnelle                    | Non                  | Non      | -                          |
| `size`          | Enum        | Operationnelle                    | Non                  | Non      | -                          |
| `headcount`     | Integer     | Operationnelle                    | Non                  | Non      | -                          |
| `status`        | Enum        | Operationnelle                    | Non                  | Non      | -                          |
| `plan`          | Enum        | Operationnelle                    | Non                  | Non      | -                          |
| `timezone`      | String(50)  | Operationnelle                    | Non                  | Non      | -                          |
| `locale`        | String(10)  | Operationnelle                    | Non                  | Non      | -                          |
| `currency`      | String(3)   | Operationnelle                    | Non                  | Non      | -                          |
| `contact_email` | String(320) | **PII Directe**                   | Non                  | Non      | Email du contact principal |
| `logo_url`      | Text        | Operationnelle                    | Non                  | Non      | -                          |
| `settings`      | JSONB       | Operationnelle                    | Non                  | Non      | -                          |

**Risques** :

- `contact_email` est PII directe (personne physique)
- `siret` est un identifiant legal unique de l'entreprise

---

### 2.5 Site (`sites`)

| Champ     | Type DB | Classification | Chiffrement au repos | Masquage | Retention                |
| --------- | ------- | -------------- | -------------------- | -------- | ------------------------ |
| `address` | JSONB   | PII Indirecte  | Non                  | Non      | Adresse physique du site |

**Note** : L'adresse du site est une donnee d'entreprise, pas PII de personne physique (sauf si domicile utilise comme site).

---

### 2.6 Department (`departments`)

| Champ         | Type DB    | Classification | Notes                           |
| ------------- | ---------- | -------------- | ------------------------------- |
| `manager_id`  | UUID       | PII Indirecte  | Reference vers un user/employee |
| `cost_center` | String(50) | Operationnelle | Donnee financiere interne       |

**Risque faible** : Pas de PII directe.

---

### 2.7 AdminAuditLog (`admin_audit_log`)

| Champ           | Type DB     | Classification  | Chiffrement au repos | Masquage | Retention                 |
| --------------- | ----------- | --------------- | -------------------- | -------- | ------------------------- |
| `admin_user_id` | UUID FK     | PII Indirecte   | Non                  | Non      | 5 ans (obligation legale) |
| `ip_address`    | String(45)  | **PII Directe** | Non                  | Non      | **GAP** : IP = PII (CJUE) |
| `user_agent`    | String(200) | PII Indirecte   | Non                  | Non      | Fingerprinting potentiel  |
| `metadata_json` | JSONB       | Variable        | Non                  | Non      | Peut contenir PII         |

**Risques** :

- L'adresse IP est consideree comme PII par la CJUE (arret Breyer, C-582/14)
- Le User-Agent peut contribuer au fingerprinting
- `metadata_json` est un champ libre qui pourrait contenir n'importe quelle PII

**Recommandation** : Definir une retention max de 5 ans pour les logs d'audit avec purge automatique.

---

### 2.8 Decision (`decisions`)

| Champ                      | Type DB | Classification | Notes                       |
| -------------------------- | ------- | -------------- | --------------------------- |
| `related_employee_id`      | UUID FK | PII Indirecte  | Lie a un employe specifique |
| `suggested_replacement_id` | UUID FK | PII Indirecte  | Identifie un remplacant     |
| `manager_notes`            | Text    | PII Indirecte  | Peut contenir des noms      |

---

### 2.9 OperationalDecision (`operational_decisions`)

| Champ        | Type DB      | Classification | Notes                  |
| ------------ | ------------ | -------------- | ---------------------- |
| `decided_by` | UUID         | PII Indirecte  | Identifie le decideur  |
| `comment`    | String(1000) | PII Indirecte  | Peut contenir des noms |

---

### 2.10 Modeles sans PII

Les modeles suivants ne contiennent **aucune PII de personne physique** :

| Modele                  | Table                   | Justification                             |
| ----------------------- | ----------------------- | ----------------------------------------- |
| `DailyForecast`         | daily_forecasts         | Donnees agregees par departement          |
| `ForecastRun`           | forecast_runs           | Metadata ML                               |
| `ActionPlan`            | action_plans            | Groupement de decisions (references UUID) |
| `DashboardAlert`        | dashboard_alerts        | Alertes systeme                           |
| `ClientDataset`         | client_datasets         | Metadata de dataset                       |
| `DatasetColumn`         | dataset_columns         | Schema de colonnes                        |
| `FitParameter`          | fit_parameters          | Parametres de transformation              |
| `IngestionLog`          | ingestion_log           | Trace d'ingestion                         |
| `QualityReport`         | quality_reports         | Rapport qualite donnees                   |
| `PipelineConfigHistory` | pipeline_config_history | Historique config pipeline                |
| `PlanChangeHistory`     | plan_change_history     | Historique changement plan                |
| `OnboardingState`       | onboarding_states       | Etat onboarding                           |
| `CanonicalRecord`       | canonical_records       | Donnees charge/capacite agregees          |
| `CostParameter`         | cost_parameters         | Coefficients de cout                      |
| `CoverageAlert`         | coverage_alerts         | Alertes de couverture                     |
| `ScenarioOption`        | scenario_options        | Options de remediation                    |
| `ProofRecord`           | proof_records           | ROI proof-of-value                        |

**Note** : `PipelineConfigHistory.changed_by` et `ActionPlan.created_by/approved_by` sont des UUID FK vers users -- PII indirecte par reference.

---

## 3. Synthese des champs PII par categorie

### PII Directe (identifie directement une personne)

| Modele        | Champ           | Type        | Chiffre? | Note                                  |
| ------------- | --------------- | ----------- | -------- | ------------------------------------- |
| User          | email           | String(320) | Non      | Index unique empechant chiffrement    |
| Employee      | first_name      | String(100) | **Non**  | **A chiffrer**                        |
| Employee      | last_name       | String(100) | **Non**  | **A chiffrer**                        |
| Employee      | display_name    | String(200) | **Non**  | **A chiffrer**                        |
| Employee      | email           | String(320) | **Non**  | **A chiffrer**                        |
| Employee      | personal_email  | String(320) | **Non**  | **A chiffrer + evaluer minimisation** |
| Employee      | phone           | String(30)  | **Non**  | **A chiffrer**                        |
| Employee      | employee_number | String(50)  | Non      | Pseudonyme employeur                  |
| Organization  | contact_email   | String(320) | Non      | Contact principal                     |
| Organization  | siret           | String(14)  | Non      | Identifiant legal                     |
| AdminAuditLog | ip_address      | String(45)  | Non      | PII per CJUE                          |

### Donnees Sensibles (Art. 9 RGPD)

| Modele  | Champ                        | Type                               | Masque? | Note                         |
| ------- | ---------------------------- | ---------------------------------- | ------- | ---------------------------- |
| Absence | type                         | Enum (sick_leave, maternity, etc.) | **OUI** | Via `mask_medical_reasons()` |
| Absence | reason                       | Text                               | **OUI** | Remplace par "[MEDICAL]"     |
| Absence | medical_certificate_required | Boolean                            | **OUI** | Supprime par masquage        |
| Absence | medical_certificate_uploaded | Boolean                            | **OUI** | Supprime par masquage        |
| Absence | recurrence_pattern           | JSONB                              | **NON** | **GAP CRITIQUE**             |

---

## 4. Recommandations

### P0 -- Immediate

1. **Masquer `recurrence_pattern`** pour les absences medicales dans `medical_masking.py`

### P1 -- Sprint prochain

2. **Chiffrer les PII directes Employee** : `first_name`, `last_name`, `personal_email`, `phone` avec le DEK per-org (AES-256-GCM). Le key management est deja en place (`key_management.py`).
3. **Evaluer `personal_email`** : est-il necessaire pour la finalite de prevision capacitaire? Si non, le supprimer (minimisation Art. 5.1c).
4. **Definir la politique de retention** par modele (voir tableau ci-dessus colonne "Retention")

### P2 -- Backlog

5. **Pseudonymisation** : Utiliser `pseudonym_hmac_key` pour les references dans les tables agregees (canonical_records, forecasts). La cle existe deja dans le KeyProvider mais n'est pas utilisee.
6. **Chiffrement `daily_cost`** : Donnee de remuneration sensible, meme si pas Art. 9.
7. **Retention IP dans audit logs** : Hasher les IPs apres la periode d'investigation (ex: 90 jours) pour conserver la tracabilite sans PII.
