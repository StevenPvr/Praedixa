# infra/auth

Artefacts d'authentification et de federation utilises autour de Keycloak.

## Fichiers

- `realm-praedixa.json` definit le realm importe pour Praedixa.
- `user-profile-praedixa.json` decrit le contrat de profil utilisateur attendu par Keycloak.
- `Dockerfile.scaleway` construit l'image Keycloak ciblee pour Scaleway.

## Integration avec le repo

- Les scripts `scripts/scw-bootstrap-auth.sh`, `scripts/scw-deploy-auth.sh` et `scripts/scw-configure-auth-env.sh` manipulent ou deploient ces artefacts.
- Les scripts `scripts/keycloak-ensure-*.sh` verifient les contrats d'audience, de roles et d'admin autour de ce realm.

## Conventions

- Declarer les attributs utilisateur dans le profil du realm avant de compter sur des token mappers.
- Ne pas stocker de secrets vivants ici; documenter seulement les chemins de secret manager dans les scripts ou docs adequats.
- Valider l'impact sur `app-webapp`, `app-admin` et leurs tests d'auth quand le realm change.
