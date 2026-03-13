# contracts/admin

Ce dossier reserve la place des contrats admin internes.

## Frontiere

- `contracts/openapi/public.yaml` reste le seul contrat HTTP public versionne.
- `contracts/admin/` couvre les interfaces reservees aux surfaces d'administration, aux jobs internes et aux integrations d'operateur.
- Rien ici ne doit elargir implicitement la surface publique.

## Quand utiliser ce dossier

- extraire un payload admin stable hors du code applicatif;
- versionner une interface reservee au control plane, a la supervision ou a l'outillage interne;
- partager un schema admin entre `app-admin`, `app-api-ts`, jobs et tests.
- garder une source de verite machine-readable pour les permissions admin versionnees.

## Principes

- versionner les payloads avec un `kind` et un `schema_version`;
- documenter les hypotheses de compatibilite ascendante et deprecation;
- garder les contrats admin distincts des evenements metier et des primitives DecisionOps.
- toute nouvelle permission admin doit etre ajoutee dans `permission-taxonomy.v1.json` avant d'etre utilisee dans `app-admin` ou `app-api-ts`.
