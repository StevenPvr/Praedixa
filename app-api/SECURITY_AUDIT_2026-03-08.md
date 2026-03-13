# Rapport d'audit securite — Praedixa `app-api`

Date : 2026-03-08
Auditeur : Codex (`seecurity-audit` skill)

## Resume executif

`app-api` n'est plus une API HTTP exposee directement : c'est un moteur Python data/ML, avec scripts batch, DDL dynamique, ingestion de fichiers et integrations internes. Les points critiques de l'audit se situaient donc surtout sur la cryptographie locale, les appels sortants internes avec bearer token, la creation dynamique de datasets, et la resistance au DoS sur l'import de fichiers.

Les vulnerabilites les plus importantes ont ete corrigees dans cette passe. Apres correction, je n'ai pas trouve d'injection SQL exploitable dans la chaine DDL/ingestion, et `pip-audit` n'a remonte aucune CVE connue sur les dependances Python resolues localement.

## Resultats

### CRITIQUE — Corriger immediatement

Aucun finding critique confirme dans `app-api` apres revue complete des surfaces sensibles.

### HAUTE — Corriger avant mise en production

| #   | Vulnerabilite                                          | OWASP         | CWE              | Fichier:ligne                                    | Impact                                                                                                        | Fix recommande                                                                                  |
| --- | ------------------------------------------------------ | ------------- | ---------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1   | Bypass du garde-fou `LocalKeyProvider` sans `settings` | A02, A05      | CWE-16           | `app/core/key_management.py:262`                 | Une instanciation directe pouvait reutiliser des cles locales deterministes hors dev/staging/prod securise    | Corrige : lecture defensive de `ENVIRONMENT` et rejet de `staging`/`production` sans `settings` |
| 2   | URL runtime non validee avant envoi du bearer token    | A10, A02, A05 | CWE-918, CWE-319 | `app/services/integration_runtime_worker.py:170` | Un `CONNECTORS_RUNTIME_URL` mal configure pouvait exfiltrer le token vers un host arbitraire ou en HTTP clair | Corrige : validation scheme/credentials/query + localhost dev-only + allowlist requise hors dev |

### MOYENNE — A planifier

| #   | Vulnerabilite                                                     | OWASP    | CWE     | Fichier:ligne                                                                                                                                        | Impact                                                                                            | Fix recommande                                                                                                    |
| --- | ----------------------------------------------------------------- | -------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 3   | Divulgation d'erreurs internes au runtime connectors              | A09, A05 | CWE-209 | `app/services/integration_runtime_worker.py:233`, `app/services/integration_runtime_worker.py:359`                                                   | Des messages internes pouvaient fuiter vers le runtime via `mark_raw_event_failed`                | Corrige : erreurs externes normalisees (`invalid_mapping_or_payload`, etc.) et details conserves cote logs Python |
| 4   | Batch runtime non borne                                           | A04      | CWE-770 | `app/services/integration_runtime_worker.py:229`, `app/services/integration_runtime_worker.py:303`                                                   | Un lot trop grand pouvait surcharger memoire/CPU                                                  | Corrige : clamp sur `CONNECTORS_RUNTIME_MAX_BATCH_SIZE`                                                           |
| 5   | Validation locale insuffisante des mappings de dataset connectors | A04      | CWE-20  | `app/services/integration_event_ingestor.py:134`, `app/services/integration_event_ingestor.py:154`, `app/services/integration_event_ingestor.py:184` | Des noms de table/colonnes/group_by non valides pouvaient progresser trop loin dans la chaine DDL | Corrige : validation allowlist via `validate_identifier` + borne sur le nombre de champs                          |
| 6   | Risque de zip bomb XLSX                                           | A04      | CWE-409 | `app/services/file_parser.py:197`, `app/services/file_parser.py:264`                                                                                 | Une archive XLSX tres compressee pouvait provoquer un DoS a l'ouverture                           | Corrige : verification du nombre de membres et de la taille decompressee                                          |
| 7   | Nombre de colonnes non borne a l'import                           | A04      | CWE-770 | `app/services/file_parser.py:286`, `app/services/file_parser.py:405`, `app/services/file_parser.py:477`                                              | Un CSV/XLSX tres large pouvait consommer beaucoup de memoire avant echecs plus tardifs            | Corrige : application de `MAX_COLUMNS_PER_TABLE` au parsing CSV/XLSX                                              |
| 8   | Fallback DDL trop permissif sur `SET ROLE`                        | A05      | CWE-250 | `app/core/ddl_connection.py:71`                                                                                                                      | Un environnement non-dev mal configure pouvait creer des objets avec le mauvais proprietaire      | Corrige : fallback conserve seulement en `development`                                                            |

### BASSE / Informationnel

| #   | Observation                                                                                                   | OWASP | Fichier:ligne     | Recommandation                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------- | ----- | ----------------- | --------------------------------------------------------------------------------------------------------------- |
| 9   | La plupart des controles headers/CORS/CSRF/web cookies du skill sont non applicables ici                      | A05   | `README.md:1`     | Continuer a auditer ces points dans `app-api-ts`, `app-admin` et `app-webapp`, pas dans ce package Python batch |
| 10  | Le repo ne montre pas de secret historique via `git log --all --source -- '*.env' '*.key' '*.pem' '*.secret'` | A02   | Repo history scan | Conserver cette hygiene et preferer le secret manager plutot que des seeds/documents statiques                  |

## Dependances et CVE

- Commande : `uv run pip-audit`
- Resultat : `No known vulnerabilities found`
- Note : `praedixa-api` lui-meme n'est pas publie sur PyPI, donc `pip-audit` ne l'a pas audite comme package externe, seulement ses dependances resolues.

## Points positifs

- `app/core/ddl_validation.py` applique une allowlist stricte sur les identifiants PostgreSQL, utile contre CWE-89 / A03.
- `app/services/schema_manager.py` compose le SQL DDL avec `psycopg.sql.Identifier`, ce qui reduit fortement le risque d'injection sur les identifiants dynamiques.
- `app/integrations/core/webhooks.py` verifie les signatures HMAC en temps constant et valide la fraicheur temporelle, bon point pour A08 / CWE-345.
- `app/integrations/core/auth.py` masque correctement les secrets dans les structures de logs.
- `app/services/integration_event_ingestor.py` protege deja contre la traversal locale sur `object_store_key`.

## Score global

8.6 / 10

Justification : la base securite du moteur Python est bonne (validation DDL, HMAC, isolation multi-tenant, secret manager, tests ciblant le hardening). Le score etait tire vers le bas par quelques gaps de defense-in-depth et de configuration sur les integrations internes et les imports de fichiers, mais ils ont ete corriges dans cette passe.

## Prochaines etapes

1. Propager le meme niveau de validation d'URL sortante aux autres appels HTTP internes/externe du repo, surtout dans `app-api-ts` et `app-connectors`.
2. Ajouter un test unitaire dedie au fallback `ddl_connection()` pour eviter toute regression sur le role owner en prod.
3. Si le runtime connectors existe en prod, renseigner `CONNECTORS_RUNTIME_ALLOWED_HOSTS` dans les environnements `staging` et `production`.
4. Garder `uv run pip-audit` dans la routine CI/CD Python.
