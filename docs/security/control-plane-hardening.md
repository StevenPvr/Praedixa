# Durcissement du control plane

## Portee

Le control plane couvre au minimum :

- interfaces admin et routes equivalentes cote API/BFF ;
- IAM, roles, permissions, sessions et MFA ;
- metadonnees tenant/site/utilisateur ;
- configuration des connecteurs, references de secrets et webhooks ;
- flags, allowlists, origines de confiance et operations de maintenance.

En production, toute mutation de control plane doit etre authentifiee, autorisee cote serveur, attribuable, journalisee et reversible.

## Taxonomie minimale de permissions

| Permission           | Usage autorise                                                                     | Interdits par defaut                             |
| -------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------ |
| `cp.read`            | lecture des vues et journaux admin                                                 | aucune mutation                                  |
| `cp.support`         | support borne sur un tenant, lecture renforcee, revocation de session utilisateur  | IAM global, secrets, restauration                |
| `cp.tenant.write`    | creation/suspension tenant ou site, membres, scopes d'acces                        | permissions globales, secrets                    |
| `cp.connector.write` | activer/desactiver un connecteur, changer une reference de secret, relancer un job | export de secret brut                            |
| `cp.security.write`  | roles, permissions, politique auth, reinitialisation MFA, export d'audit           | break-glass, secrets infra                       |
| `cp.ops.write`       | maintenance mode, flags critiques, operations de reprise bornees                   | IAM global, secret manager                       |
| `cp.secrets.write`   | rotation, revocation et reattribution via secret manager                           | lecture/export en clair hors procedure controlee |
| `cp.break-glass`     | usage d'urgence seulement, perimetre maximal temporaire                            | attribution permanente ou routine                |

Regles :

- deny by default ;
- pas de wildcard admin en production ;
- pas de compte humain partage ;
- `cp.break-glass` n'est jamais attribue au quotidien ;
- les bundles de roles restent separes entre support, securite, operations et secrets.

## Permissions runtime admin versionnees

Le repo versionne aussi les feuilles de permissions effectivement acceptees aujourd'hui dans `contracts/admin/permission-taxonomy.v1.json`.

Ces permissions runtime `admin:*` sont la source de verite testable pour `app-admin` et `app-api-ts` :

- `admin:console:access`
- `admin:monitoring:read`
- `admin:org:read`
- `admin:org:write`
- `admin:users:read`
- `admin:users:write`
- `admin:billing:read`
- `admin:billing:write`
- `admin:audit:read`
- `admin:onboarding:read`
- `admin:onboarding:write`
- `admin:messages:read`
- `admin:messages:write`
- `admin:support:read`
- `admin:support:write`
- `admin:integrations:read`
- `admin:integrations:write`

Regle repo:

- aucune route admin, page admin ou policy BFF sensible ne doit introduire une nouvelle permission leaf sans l'ajouter a ce contrat versionne et a ses tests de derive.

## Routes et operations sensibles

Traiter comme sensibles toute route ou operation equivalente a :

| Surface                                                                | Operations a proteger                                                                                |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `/admin/users`, `/api/admin/users/*`, `/api/admin/roles/*`             | octroi/retrait de role, reinitialisation MFA, revocation de session, changement d'etat admin         |
| `/admin/tenants`, `/api/admin/tenants/*`, `/api/admin/sites/*`         | creer, suspendre ou reactiver un tenant ou site, modifier `accessibleSiteIds`, changer proprietaires |
| `/admin/connectors`, `/api/admin/connectors/*`, `/api/connectors/*`    | reattribuer une reference de secret, rotation de token, rejeu ou synchronisation forcee, URL webhook |
| `/api/admin/config/*`, `/api/admin/origins/*`, `/api/admin/features/*` | OIDC, origines de confiance, allowlists, flags critiques, mode maintenance                           |
| `/api/admin/secrets/*` ou acces secret manager                         | creer, remplacer ou revoquer un secret, changer responsable ou politique, lever un secret de secours |
| `/api/admin/audit/*`, `/api/admin/break-glass/*`                       | export d'audit, verifier integrite, ouvrir/fermer un acces d'urgence                                 |

Controles minimaux sur ces surfaces :

- verification d'autorisation cote serveur par pathname et operation ;
- justification obligatoire pour les mutations a haut impact ;
- second regard humain pour permissions globales, rotation sensible, restauration et break-glass ;
- controles CSRF et d'origine sur les routes cookie-authentifiees ;
- `request_id` propage jusqu'au journal.
- les routes `/api/v1/admin/organizations/:orgId/users`, `/api/v1/admin/organizations/:orgId/users/:userId`, `/api/v1/admin/organizations/:orgId/users/invite` et `/api/v1/admin/organizations/:orgId/users/:userId/role` n'acceptent aucun fallback demo/no-db ; sans persistance, elles repondent explicitement `503 PERSISTENCE_UNAVAILABLE`.

## Audit append-only cible

Etat cible build-ready :

- toute mutation de control plane ecrit un evenement d'audit immuable ;
- le role applicatif peut `insert` mais jamais `update` ni `delete` sur le journal ;
- le stockage est separe des tables metier et exportable avec checksum ;
- retention minimum 400 jours et export regulier pour investigation et restauration.

Champs minimaux :

- `event_id`, `occurred_at_utc`, `request_id` ;
- `actor_id`, `actor_type`, `authn_strength`, `source_ip` ;
- `permission_used`, `route`, `operation`, `target_type`, `target_id` ;
- `justification`, `approval_ref`, `outcome` ;
- `before_hash`, `after_hash` ou diff equivalent ;
- `break_glass` a `true/false`.

Pour les mutations IAM de workspace admin deja implementees aujourd'hui, notamment `/api/v1/admin/organizations/:orgId/users/invite` et `/api/v1/admin/organizations/:orgId/users/:userId/role`, le `metadata_json` doit au minimum porter :

- `permissionUsed` ;
- `routeTemplate` ;
- `operation` ;
- `targetUserId` ;
- `email` ou cible equivalente ;
- `beforeRole` / `afterRole` ou `targetStatus` selon l'operation ;
- `outcome=success` pour confirmer qu'un insert append-only a bien ete ecrit dans la meme transaction que la mutation.

Sans journal append-only, une mutation critique n'est pas conforme.

## MFA admin en production

- MFA obligatoire pour tout compte admin prod.
- Facteur resistant au phishing prefere ; TOTP acceptable si passkey/WebAuthn indisponible.
- Email et SMS ne servent pas de facteur principal admin prod.
- Re-authentification MFA obligatoire pour l'octroi de permission, la rotation de secret, la restauration de metadonnees critiques et le break-glass.
- Aucun bypass permanent ; seule la procedure break-glass documentee peut servir d'exception tracee.
- Le repo doit rendre cette exigence verifiable: `admin-prod` porte un `AUTH_ADMIN_REQUIRED_AMR` explicite, le callback admin refuse tout access token sans `amr` compatible, le client OIDC `praedixa-admin` expose explicitement `claim-amr` sur l'access token, et la policy Keycloak du browser flow admin MFA reste versionnee dans `infra/auth/admin-mfa-browser-flow-policy.json`.
- Le validateur repo `node scripts/verify-admin-mfa-readiness.mjs` et le verifier live `scripts/keycloak-verify-admin-mfa-flow.sh` doivent rester verts avant une release auth/admin.

## Rotation des secrets

- Le secret manager est la source de verite ; aucune valeur live dans le repo ou la doc.
- Chaque secret a un responsable, une date d'expiration et un service consommateur identifies.
- Preferer les identifiants courts et geres ; sinon, secret statique prod avec rotation au plus tous les 90 jours.
- Rotation immediate apres suspicion de fuite, depart d'un collaborateur, changement de responsable ou usage break-glass.
- Toute rotation revoque l'ancienne version des que le cutover est confirme et produit un evenement d'audit.

## Restauration des metadonnees critiques

Metadonnees critiques minimales :

- registre tenant/site ;
- liens utilisateur-role-permission ;
- `accessibleSiteIds` et scopes d'acces ;
- configuration OIDC et MFA ;
- references de secrets des connecteurs ;
- flags critiques, webhooks, allowlists et origines de confiance.

Garde-fous :

- sauvegarde versionnee au moins quotidienne et avant changement admin majeur ;
- chiffrement, controle d'acces strict et verification d'integrite ;
- test de restauration periodique avec preuve ;
- ecriture gelee pendant une restauration.

Procedure cible :

1. Declarer l'incident et ouvrir une fenetre de changement.
2. Identifier le dernier snapshot sain et l'etendue des objets touches.
3. Obtenir la validation du responsable de service et d'un relecteur securite.
4. Restaurer le snapshot puis rejouer, si besoin, les evenements d'audit append-only valides.
5. Verifier le diff final, rouvrir les ecritures et journaliser la cloture.

Le repo doit garder une source de verite machine-readable des verifications semantiques attendues dans `docs/security/control-plane-metadata-inventory.json`, et les summaries `backup` / `restore` attaches au manifest doivent declarer `summary_type`, `schema_version`, `inventory_version` et les `checks[]` associes.
