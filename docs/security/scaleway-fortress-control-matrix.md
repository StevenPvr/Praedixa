# Programme "porte blindee" - matrice d'execution Scaleway

**Source de verite cible**: `docs/prd/scaleway-fortress-security-prd.md`
**Usage**: transformer le PRD securite en chantiers fermables avec preuves repo et infra
**Portee**: `infra/`, `app-admin`, `app-webapp`, `app-api-ts`, `app-api`, `app-connectors`, `scripts/`, `docs/security/`

## Comment utiliser cette matrice

1. Lire le PRD pour le **target state**.
2. Utiliser la matrice ci-dessous pour ouvrir les streams de mise en oeuvre.
3. Fermer un controle uniquement avec une preuve verifiable dans le repo et/ou dans la plateforme cible.
4. Rattacher les preuves transverses aux templates deja versionnes dans `docs/security/compliance-pack/`.

## Hypothese de travail retenue

La version la plus exploitable pour Praedixa est:

- le PRD sert de reference produit et securite;
- cette matrice sert d'ordonnancement execution / preuves;
- les docs existantes `control-plane-hardening`, `stride-threat-model`, `invariants`, `runbooks` et `compliance-pack` restent les points d'ancrage evidentielles;
- les changements futurs devront fermer les deltas identifies ici au lieu de repartir d'un audit blanc.

## Matrice des controles

| ID      | Stream                   | Controle cible                                                                                                  | Surfaces repo / infra                                                                                                                                                                                  | Preuves deja presentes                                                              | Preuves a produire pour fermeture                                                                                                                                             | Phase |
| ------- | ------------------------ | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| FORT-01 | Residency / segregation  | Production, staging et dev restent separes; donnees clients en `fr-par` uniquement                              | `infra/`, `docs/security/compliance-pack/policies/data-residency-france-only-policy.md`, `docs/security/compliance-pack/04-control-matrix-minimum.md`                                                  | policy de residency France-only et control matrix minimum                           | diagramme infra cible, captures/config Scaleway `fr-par`, matrice projects/environnements, revue mensuelle de residency                                                       | 0     |
| FORT-02 | Network perimeter        | WAF + LB publics seulement; backends, DB, workers et storage critiques en reseau prive                          | `infra/`, `docs/security/control-plane-hardening.md`, `docs/security/stride-threat-model.md`                                                                                                           | threat model Scaleway + control plane hardening                                     | schema VPC/Private Network versionne, regles host firewall, verification "0 DB publique", export WAF mode log puis block                                                      | 0-2   |
| FORT-03 | IAM humain               | Comptes nominatifs, MFA global, passkeys admins, API keys et sessions bornes dans le temps                      | `docs/security/break-glass-admin-governance.md`, `docs/security/control-plane-hardening.md`, `docs/security/compliance-pack/07-access-review-log-template.md`                                          | baseline MFA admin, gouvernance break-glass, template access review                 | politique IAM Scaleway, evidence MFA 100 %, revue mensuelle des privileges, TTL max session/API key, runbook offboarding                                                      | 0-1   |
| FORT-04 | Authentification client  | OIDC par defaut; mots de passe locaux durcis; reset/session solides                                             | `app-admin/lib/auth/**`, `app-webapp/lib/auth/**`, `app-api-ts/src/**`, `docs/security/control-plane-hardening.md`                                                                                     | docs auth/admin existantes et exigences MFA admin                                   | preuve OIDC canonique, Argon2id si local auth subsiste, tests reset usage unique, session inventory / revocation, rate limiting auth                                          | 0-1   |
| FORT-05 | Secrets / crypto         | Tous les secrets centralises et rotates; aucune valeur live dans le repo ou les logs                            | `docs/runbooks/security-secret-rotation.md`, `docs/security/control-plane-hardening.md`, `scripts/`, `infra/`                                                                                          | runbook rotation, baseline secret manager dans doc securite                         | matrice secret->owner->expiry, branchement Secret Manager/KMS par env, rotation automatisee des secrets longs, preuves d'audit de consultation/rotation                       | 0-1   |
| FORT-06 | Multi-tenant DB          | Contexte tenant derive de la session; defense en profondeur DB avec RLS; alerting cross-tenant                  | `app-api`, `app-api-ts`, `packages/shared-types`, `docs/security/invariants/security-invariants.yaml`, `docs/security/stride-threat-model.md`                                                          | invariants tenant, threat model, ADR multi-tenant                                   | policies PostgreSQL RLS, tests cross-tenant a chaque release, prefixage cache/object storage par tenant, procedure offboarding avec purge                                     | 0-1   |
| FORT-07 | SFTP gateway             | Passerelle SFTP dediee, mono-usage, cle SSH seule, chroot, drop zone write-only, pas de pivot                   | `infra/`, `app-connectors`, `app-api`, `docs/prd/connector-activation-and-dataset-trust-spec.md`                                                                                                       | spec trust dataset et readiness medallion partielle dans le repo                    | design/infra SFTP versionnes, compte par client, allowlist IP quand possible, buckets `quarantine`/`clean`/`rejected`, evidence d'absence d'acces DB direct                   | 0-1   |
| FORT-08 | File quarantine pipeline | Tout upload passe par checksum, scan, validation schema, parsing isole, sanitation et promotion controlee       | `app-api/app/services/file_parser.py`, `app-api/scripts/`, `app-connectors`, `docs/prd/connector-activation-and-dataset-trust-spec.md`                                                                 | parser fichiers et docs ingestion deja presentes                                    | worker isole sans internet sortant, antivirus/malware scan, validation MIME + magic bytes, neutralisation CSV injection, traces versionnees de promotion/rejet                | 0-1   |
| FORT-09 | Logging / audit          | Logs centralises sans secrets; Audit Trail exporte avec object lock; alerting exploitable                       | `docs/security/README.md`, `docs/security/control-plane-hardening.md`, `docs/security/compliance-pack/11-evidence-index-template.md`, `docs/security/compliance-pack/09-incident-register-template.md` | baseline "pas de secret dans les logs", audit append-only cible, evidence templates | bucket logs immuable, export Audit Trail Scaleway, dictionnaire d'evenements securite, detection login/MFA/admin/upload/cross-tenant, verification de non-fuite de tokens/PII | 0-1   |
| FORT-10 | Backup / restore         | Backups quotidiens, chiffrements, restores mensuels, drills trimestriels, suppression prod a double approbation | `docs/runbooks/backup-restore-evidence-baseline.md`, `docs/security/control-plane-hardening.md`, `docs/security/compliance-pack/10-bcp-dr-test-template.md`                                            | baseline restore et template BCP/DR                                                 | configuration Managed DB backup + HA si retenu, export chiffre des sauvegardes, preuves restore mensuelles, politique 2-person delete prod                                    | 0-2   |
| FORT-11 | DevSecOps / supply chain | Branches protegees, commits signes, scans SAST/SCA/secret/IaC, DAST, SBOM, artefacts signes                     | `docs/runbooks/security-gate-hardening.md`, `scripts/`, `docs/security/invariants/owasp-control-coverage.yaml`                                                                                         | gate hardening 3 couches, coverage OWASP, security policy existante                 | enforcement commit signing, DAST staging, SBOM par release, signature images, blocage CI sur critical non acceptes, inventaire des exceptions restantes a fermer              | 0-1   |
| FORT-12 | Incident / RGPD          | Runbooks incident et violation de donnees prets avant crise, avec SLA, evidences et notification 72h            | `docs/security/compliance-pack/policies/incident-response-policy.md`, `docs/security/rgpd-checklist.md`, `docs/security/compliance-pack/13-residual-risk-acceptance-log.md`                            | policy incident, checklist RGPD, registre de risque residuel                        | runbook breach notification, exercice tabletop, matrice communication, journal des incidents, procedure de qualification 72h CNIL                                             | 0-2   |

## Streams repo recommandes

### Stream A - Infra et frontiere reseau

- `infra/`: VPC, Private Network, LB, WAF, projects, Object Storage, Audit Trail, Managed DB.
- `scripts/`: verification CLI de non-exposition publique, restore drills, export evidences.
- `docs/security/`: diagrammes, policies, preuves de revues.

### Stream B - Auth, IAM et administration

- `app-admin`, `app-webapp`, `app-api-ts`: auth OIDC, MFA admin, session hardening, controles CSRF/origin, audit admin.
- `docs/security/control-plane-hardening.md`: point d'ancrage des exigences admin.

### Stream C - Ingestion et traitement fichiers

- `app-connectors`, `app-api`: SFTP gateway, quarantaine, scan, promotion `clean`, rejet `rejected`, traces d'ingestion.
- `docs/prd/connector-activation-and-dataset-trust-spec.md`: spec metier a garder alignee avec la fermeture securite.

### Stream D - Detection, resilience et gouvernance

- `docs/security/compliance-pack/`: instanciation des logs de revue, incident register, DR evidence, risk register.
- `docs/runbooks/`: runbooks de rotation, restore, incident, threat response.

## Evidence pack minimum a instancier

Pour rendre ce programme reellement exploitable, ouvrir puis maintenir:

- `03-risk-register-template.md` -> registre de risques vivant pour `FORT-01` a `FORT-12`;
- `07-access-review-log-template.md` -> revues IAM mensuelles;
- `09-incident-register-template.md` -> timeline des incidents et quasi-incidents;
- `10-bcp-dr-test-template.md` -> restores mensuels et drills trimestriels;
- `11-evidence-index-template.md` -> index des preuves de fermeture;
- `13-residual-risk-acceptance-log.md` -> risques acceptes explicitement, jamais implicitement.

## Definition de "done"

Un controle de cette matrice n'est ferme que si:

- le comportement cible existe reellement dans le code ou l'infra;
- la documentation de proximite est mise a jour dans la meme passe;
- une preuve repo ou runtime est referencee;
- le test, le smoke, le drill ou la revue requis a bien ete execute;
- l'ecart precedent n'est plus masque par une exception tacite ou un fallback legacy.
