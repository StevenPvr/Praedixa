# ADR-003 - Isolation multi-tenant en profondeur

- Statut: accepted
- Date: 2026-03-12

## Contexte

Praedixa expose des surfaces client, admin et data sur un meme socle multi-tenant.
Une seule couche de filtrage ne suffit pas: une erreur de route, de SQL ou de scope ne doit pas ouvrir un acces cross-tenant.

## Decision

Praedixa applique l'isolation multi-tenant en profondeur, avec plusieurs couches cumulatives:

- contexte auth et claims `organization_id` / `site_id`;
- verification du scope cote TypeScript, avec refus explicite si un `site_id` demande depasse `accessibleSiteIds`;
- `TenantFilter` et `SiteFilter` cote Python pour les lectures applicatives;
- `TenantMixin` sur les tables tenant-scoped;
- Row-Level Security PostgreSQL activee par `SET LOCAL app.current_organization_id`.

Les exceptions cross-org restent explicites, bornees et reservees aux chemins admin dedies.

## Regles d'application

- Un parametre `site_id` ne doit jamais elargir le scope d'un utilisateur.
- Toute table tenant-aware porte `organization_id` non nullable via `TenantMixin`.
- Toute lecture/criture Python tenant-scoped passe par les primitives de filtrage et la session DB standard.
- Le bypass cross-org n'est acceptable que pour des endpoints admin dedies et en lecture seule.

## Preuves repo

- `app-api-ts/src/README.md` fixe la regle: un `site_id` demande ne doit jamais elargir le scope.
- `app-api-ts/src/services/operational-data.ts` retourne `AND FALSE` quand le `requestedSiteId` n'appartient pas a `accessibleSiteIds`.
- `app-api/app/core/README.md` impose `TenantFilter` pour toute lecture/criture tenant-scoped.
- `app-api/app/core/security.py` contient `TenantFilter` et `SiteFilter`.
- `app-api/app/models/base.py` impose `TenantMixin` avec `organization_id` non nullable.
- `app-api/app/core/database.py` propage le contexte tenant via `SET LOCAL app.current_organization_id`.
- `docs/DATABASE.md` documente RLS comme filet de securite complementaire.

## Consequences

- Une erreur de filtrage applicatif ne supprime pas la derniere barriere de securite.
- Les evolutions de routes et de jobs doivent conserver les memes invariants de scope.
- Les exceptions admin cross-tenant deviennent visibles, discutables et auditables.
