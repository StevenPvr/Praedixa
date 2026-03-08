# `app/(admin)/clients/` - Workspace organisation

Cette zone porte le parcours multi-tenant principal de l'admin. On entre par la liste des organisations, puis on bascule dans un espace par `orgId` avec header, onglets, filtre de site et vues metier.

## Entrees

| Route | Fichier | Role |
| --- | --- | --- |
| `/clients` | `page.tsx` | Liste des organisations et navigation vers un client |
| `/clients/[orgId]` | `[orgId]/page.tsx` | Redirection vers la vue par defaut du client |
| `/clients/[orgId]/layout` | `[orgId]/layout.tsx` | Monte `OrgHeader`, `ClientTabsNav`, `SiteTree` et `ClientProvider` |

## Sous-routes par organisation

| Segment | Fichier | Role |
| --- | --- | --- |
| `dashboard` | `[orgId]/dashboard/page.tsx` | Synthese admin du client |
| `vue-client` | `[orgId]/vue-client/page.tsx` | Miroir proche de la vue client |
| `donnees` | `[orgId]/donnees/page.tsx` | Datasets, ingestion, qualite |
| `previsions` | `[orgId]/previsions/page.tsx` | Monitoring des previsions |
| `actions` | `[orgId]/actions/page.tsx` | Recalculs/scenarios et decisions |
| `alertes` | `[orgId]/alertes/page.tsx` | Alertes de couverture |
| `rapports` | `[orgId]/rapports/page.tsx` | Proof packs et liens de partage |
| `config` | `[orgId]/config/page.tsx` | Decision config, couts, connecteurs |
| `equipe` | `[orgId]/equipe/page.tsx` | Utilisateurs, roles, invitations |
| `messages` | `[orgId]/messages/page.tsx` | Conversations avec le client |
| `onboarding` | `[orgId]/onboarding/page.tsx` | Etat d'avancement de l'onboarding |

## State partage

- `client-context.tsx` expose l'organisation courante, le site selectionne et la hierarchie sites/departements.
- Les pages lisent surtout `orgId` et `selectedSiteId`, puis deleguent les appels backend a `hooks/use-api.ts` et `lib/api/endpoints.ts`.

## Tests

- Plusieurs pages ont des tests colocalises dans `[orgId]/**/__tests__/page.test.tsx`.
