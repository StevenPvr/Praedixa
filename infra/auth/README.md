# infra/auth

Artefacts d'authentification et de federation utilises autour de Keycloak.

## Fichiers

- `realm-praedixa.json` definit le realm importe pour Praedixa.
- `user-profile-praedixa.json` decrit le contrat de profil utilisateur attendu par Keycloak.
- `Dockerfile.scaleway` construit l'image Keycloak ciblee pour Scaleway.

## Integration avec le repo

- Les scripts `scripts/scw-bootstrap-auth.sh`, `scripts/scw-deploy-auth.sh` et `scripts/scw-configure-auth-env.sh` manipulent ou deploient ces artefacts.
- Les scripts `scripts/keycloak-ensure-*.sh` verifient les contrats d'audience, de roles et d'admin autour de ce realm.
- `scripts/keycloak-ensure-super-admin.sh` force aussi `CONFIGURE_TOTP` par defaut sur les comptes `super_admin` provisionnes, sauf override explicite `SUPER_ADMIN_REQUIRE_TOTP=false`.
- `infra/auth/admin-mfa-browser-flow-policy.json` versionne la politique MFA admin attendue pour le browser flow Keycloak.
- `node scripts/verify-admin-mfa-readiness.mjs` verifie que le realm export versionne garde le socle MFA admin attendu pour la prod (`browserFlow` cible, `CONFIGURE_TOTP` actif, politique OTP explicite).
- `scripts/keycloak-verify-admin-mfa-flow.sh` compare un realm Keycloak live a la policy versionnee via `kcadm`, sans supposer que le seul export de realm suffit.

## Conventions

- Declarer les attributs utilisateur dans le profil du realm avant de compter sur des token mappers.
- Le contrat canonique versionne pour les access tokens applicatifs est `sub`, `email`, `role`, `organization_id`, `site_id`, avec `permissions` seulement pour `praedixa-admin`.
- `role` et `permissions` doivent etre des attributs utilisateur explicites mappes en top-level; on ne depend plus des derives `groups`, `realm_access` ou `resource_access` pour le role metier applicatif.
- Ne pas stocker de secrets vivants ici; documenter seulement les chemins de secret manager dans les scripts ou docs adequats.
- Valider l'impact sur `app-webapp`, `app-admin` et leurs tests d'auth quand le realm change.
- Le realm export versionne porte maintenant une baseline TOTP explicite et epingle `browserFlow=browser`; en prod, l'acces `super_admin` ne doit etre accorde qu'a des comptes ayant effectivement termine `CONFIGURE_TOTP`.
- La preuve MFA admin ne repose plus seulement sur `requiredActions` et le callback app: la policy du browser flow est versionnee separement, et doit etre reverifiee apres tout changement IAM ou flow Keycloak.
