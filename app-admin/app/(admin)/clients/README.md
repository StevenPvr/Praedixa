# `app/(admin)/clients/` - Workspace organisation

Zone multi-tenant principale du back-office.

## Entrees reelles

| Chemin             | Fichier              | Role reel                                                             |
| ------------------ | -------------------- | --------------------------------------------------------------------- |
| `/clients`         | `page.tsx`           | liste des organisations                                               |
| `/clients/[orgId]` | `[orgId]/page.tsx`   | redirection vers une vue par defaut du workspace                      |
| `layout interne`   | `[orgId]/layout.tsx` | monte `OrgHeader`, `ClientTabsNav`, `SiteTree` et le contexte partage |

## Routes workspace par organisation

| Route                         | Fichier                       |
| ----------------------------- | ----------------------------- |
| `/clients/[orgId]/dashboard`  | `[orgId]/dashboard/page.tsx`  |
| `/clients/[orgId]/vue-client` | `[orgId]/vue-client/page.tsx` |
| `/clients/[orgId]/donnees`    | `[orgId]/donnees/page.tsx`    |
| `/clients/[orgId]/previsions` | `[orgId]/previsions/page.tsx` |
| `/clients/[orgId]/actions`    | `[orgId]/actions/page.tsx`    |
| `/clients/[orgId]/alertes`    | `[orgId]/alertes/page.tsx`    |
| `/clients/[orgId]/rapports`   | `[orgId]/rapports/page.tsx`   |
| `/clients/[orgId]/contrats`   | `[orgId]/contrats/page.tsx`   |
| `/clients/[orgId]/config`     | `[orgId]/config/page.tsx`     |
| `/clients/[orgId]/equipe`     | `[orgId]/equipe/page.tsx`     |
| `/clients/[orgId]/messages`   | `[orgId]/messages/page.tsx`   |
| `/clients/[orgId]/onboarding` | `[orgId]/onboarding/page.tsx` |

## Patterns reels

- les onglets visibles viennent de `lib/auth/admin-route-policies.ts`
- `client-context.tsx` expose surtout `orgId`, `selectedSiteId` et la hierarchie site/departements
- le `SiteTree` et les pages lisent ce contexte plutot que de reconstruire localement le scope
