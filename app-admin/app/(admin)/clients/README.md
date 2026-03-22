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
- `page.tsx` pour `/clients` reste presentational; l'etat de filtres, la pagination, la selection et les actions CSV/navigation vivent maintenant dans `use-clients-page-model.ts`
- `/clients` depend maintenant d'une vraie pagination persistante sur `GET /api/v1/admin/organizations`, avec filtres `search`, `status` et `plan`; le layout `/clients/[orgId]` depend aussi du detail persistant `GET /api/v1/admin/organizations/:orgId` pour monter `OrgHeader` et `SiteTree`, et le dashboard consomme le payload composite `GET /api/v1/admin/organizations/:orgId/overview`.
- Le CTA `Nouveau client` n'est visible que pour `admin:org:write`; il ouvre `/parametres`, ou un formulaire cree l'organisation persistante via `POST /api/v1/admin/organizations` avant de basculer automatiquement sur `/clients/[orgId]/onboarding`.
- Le flag `isTest` voyage maintenant du formulaire de creation jusqu'aux lectures `/clients` et `/clients/[orgId]`; les clients tests sont badgés et seuls eux exposent une suppression definitive multi-confirmations dans `/clients/[orgId]/dashboard`.
- l'export CSV de la selection `/clients` passe par `lib/security/csv.ts` pour neutraliser les cellules dangereuses pour Excel/LibreOffice.
- `use-clients-page-model.ts` construit maintenant le suffixe de query (`querySuffix`) hors template literal final pour eviter les templates imbriques autour de `queryString`.
