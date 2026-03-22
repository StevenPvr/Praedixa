# Runbook - Backup, Restore and Evidence Baseline

## Objectif

Donner une procedure unique pour:

- verifier que les backups critiques existent;
- lancer un restore drill trace;
- produire une evidence exploitable pour le change, la securite et le build-ready.

## Cible minimale

- `RPO < 1h` pour les donnees critiques pilote
- `RTO < 4h` pour un restore drill borne
- au moins un drill de restore par trimestre

## Actifs couverts

| Actif                                                        | Support                 | Verification minimale                                | Restore drill minimum                                 | Owner             |
| ------------------------------------------------------------ | ----------------------- | ---------------------------------------------------- | ----------------------------------------------------- | ----------------- |
| `praedixa-api-staging`                                       | Scaleway RDB PostgreSQL | `scw rdb instance get` + `scw rdb backup list`       | restore vers une base temporaire sur l'instance cible | CTO               |
| `praedixa-api-prod`                                          | Scaleway RDB PostgreSQL | `scw rdb instance get` + `scw rdb backup list`       | restore vers une base temporaire sur l'instance cible | CTO               |
| `praedixa-auth-prod`                                         | Scaleway RDB PostgreSQL | `scw rdb instance get` + `scw rdb backup list`       | restore vers une base temporaire sur l'instance cible | CTO               |
| Buckets client files / exports / model artifacts / inference | Scaleway Object Storage | bucket existe, versioning actif, evidence de listage | test manuel documente sur un objet echantillon        | CTO + Ops/Product |
| Manifestes signes et gate reports                            | repo / dossier release  | presence du manifest signe et du gate report signe   | verification signature + relecture metadata           | Infra/DevOps      |

## Helpers executes depuis le repo

Le repo versionne maintenant deux wrappers standards:

```bash
./scripts/scw/scw-rdb-backup-evidence.sh --instance-id <INSTANCE_ID> --output-dir .meta/.release/<tag>/backup-api-prod
./scripts/scw/scw-rdb-restore-drill.sh --instance-id <INSTANCE_ID> --backup-id <BACKUP_ID> --database-name <DATABASE_NAME> --output-dir .meta/.release/<tag>/restore-api-prod \
  --check tenant_site_registry_restored=pass \
  --check rbac_assignments_restored=pass \
  --check accessible_site_scopes_restored=pass \
  --check auth_configuration_restored=pass \
  --check connector_secret_refs_restored=pass \
  --check critical_flags_and_origins_restored=pass
```

Ils n'enlevent pas le jugement operateur, mais ils standardisent:

- les commandes Scaleway a lancer;
- les artefacts JSON a conserver;
- le calcul borne du `RTO` sur le restore drill;
- le fail-close si aucun backup n'est trouve, si la base restauree n'apparait pas, ou si les checks semantiques de control plane requis ne sont pas declares.

Les checks semantiques requis sont versionnes dans `docs/security/control-plane-metadata-inventory.json` et reverifies ensuite par `release-manifest-verify.sh` via `scripts/validate-control-plane-restore-evidence.mjs`.

## Procedure RDB - Verification simple

Pour chaque instance critique:

```bash
./scripts/scw/scw-rdb-backup-evidence.sh \
  --instance-id <INSTANCE_ID> \
  --output-dir .meta/.release/<tag>/backup-<service>
```

Verifier au minimum:

- backup schedule actif;
- retention attendue visible;
- dernier backup recent et exploitable;
- region `fr-par`.

Avant un changement risqué, creer aussi un backup manuel nomme:

```bash
./scripts/scw/scw-rdb-backup-evidence.sh \
  --instance-id <INSTANCE_ID> \
  --database-name <DATABASE_NAME> \
  --create-manual-backup \
  --output-dir .meta/.release/<tag>/backup-<service>
```

## Procedure RDB - Restore drill

1. Choisir un backup recent `BACKUP_ID`.
2. Restaurer vers une base temporaire nommee explicitement.
3. Verifier que l'operation termine sans erreur.
4. Conserver l'evidence et planifier le nettoyage de la base temporaire.

Commande type:

```bash
./scripts/scw/scw-rdb-restore-drill.sh \
  --instance-id <INSTANCE_ID> \
  --backup-id <BACKUP_ID> \
  --database-name <DATABASE_NAME> \
  --output-dir .meta/.release/<tag>/restore-<service>
```

Verification minimale apres restore:

- l'appel Scaleway de restore n'echoue pas;
- la base temporaire apparait cote instance cible dans la fenetre d'attente;
- un controle applicatif ou SQL borne confirme chaque check de `control-plane-metadata-inventory.json` ;
- le temps total du drill est mesure.

Format des checks:

```bash
--check <check_id>=pass
--check <check_id>=fail
```

Tous les `check_id` declares dans `docs/security/control-plane-metadata-inventory.json` doivent apparaitre explicitement dans la commande ou le summary de restore sera `FAIL`.

## Procedure Object Storage - Evidence minimale

Le repo versionne aujourd'hui les buckets critiques via les preflights, mais pas encore un restore automatise objet par objet.

Evidence minimale a conserver:

```bash
scw object bucket get <BUCKET_NAME> region=fr-par
```

Verifier:

- bucket present;
- versioning actif;
- region `fr-par`;
- bucket correct pour `stg` ou `prd`.

Restore drill minimal attendu hors incident:

- choisir un objet echantillon non sensible;
- supprimer ou versionner selon la politique de test;
- restaurer la version precedente via la console ou la CLI object storage;
- conserver la preuve du before/after.

## Evidence obligatoire

Joindre au minimum:

- sortie de `scw rdb instance get`
- sortie de `scw rdb backup list`
- `summary.json` du helper backup evidence
- identifiant du `BACKUP_ID` utilise
- horodatage debut/fin du restore drill
- `RTO` et `RPO` obtenus
- `summary.json` du helper restore drill
- la version d'inventaire `control-plane-metadata-inventory.json` utilisee par les summaries
- le resultat `PASS` / `FAIL` de chaque check de restore semantique
- resultat `PASS` ou `FAIL`
- actions correctives si un gap est trouve

Templates a utiliser:

- `docs/security/compliance-pack/10-bcp-dr-test-template.md`
- `docs/security/compliance-pack/11-evidence-index-template.md`

## Politique d'echec

- pas de backup recent identifiable = `NO-GO` pour un changement critique
- restore drill en echec = gap build-ready ouvert jusqu'a preuve d'un drill vert
- evidence manquante = drill non comptabilise

## Liens utiles

- setup RDB: `docs/deployment/scaleway-setup.md`
- release et rollback: `docs/runbooks/release-and-rollback-baseline.md`
- matrice env/secrets/owners: `docs/deployment/environment-secrets-owners-matrix.md`
