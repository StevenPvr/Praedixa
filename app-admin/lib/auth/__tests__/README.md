# Tests

## Rôle

Ce dossier regroupe les tests associés au dossier parent `app-admin/lib/auth`. Il documente et vérifie le comportement attendu de cette zone du code.

## Contenu immédiat

Sous-dossiers :

- Aucun élément versionné direct.

Fichiers :

- `client.test.ts`
- `admin-route-policies.test.ts`
- `middleware.test.ts`
- `oidc.test.ts`
- `permissions.test.ts`
- `route-access.test.ts`
- `server.test.ts`

`admin-route-policies.test.ts` resolve maintenant la taxonomie de permissions admin via plusieurs chemins candidats (`cwd` workspace puis fallback `file://`), afin de rester stable quand Vitest lance le projet avec `cwd=app-admin`.

## Intégration

Ce dossier est consommé par l'application `app-admin` et s'insère dans son flux runtime, build ou test.
