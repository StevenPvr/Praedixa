# contracts/openapi

Definition OpenAPI versionnee des endpoints publics exposes par la couche TypeScript.

## Fichier principal

- `public.yaml` decrit la surface publique de l'API.

## Quand le modifier

- ajout ou suppression de route publique;
- changement de payload, parametre, schema ou code de retour;
- mise a jour des exigences de securite declarees.

## Conventions

- Garder les `operationId` stables autant que possible.
- Faire correspondre les schemas documentes avec les shapes reelles attendues par `app-webapp`, `app-admin` et les tests.
- Si une route est reservee a l'admin, le signaler clairement dans le path ou la description.

## Verification recommandee

```bash
pnpm --filter @praedixa/api-ts typecheck
pnpm test
pnpm test:e2e:webapp
pnpm test:e2e:admin
```
