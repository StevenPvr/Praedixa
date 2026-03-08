# `components/` - UI specifique a la console admin

Ce dossier regroupe les composants React propres au back-office. On y trouve le shell d'administration, les composants de navigation par organisation, la messagerie admin-client et plusieurs badges ou vues de supervision.

## Zones principales

| Dossier/fichier | Role |
| --- | --- |
| `admin-shell.tsx` | Shell principal de la console |
| `admin-sidebar.tsx` | Navigation laterale globale |
| `admin-topbar.tsx` | Topbar, titre et actions hautes |
| `client-tabs-nav.tsx` | Onglets du workspace client |
| `site-tree.tsx` | Filtre de site et hierarchie |
| `chat/` | Messagerie admin-client |
| `skeletons/` | Etats de chargement admin |
| `ui/` | Petites primitives locales (`StatusBadge`, `DataTableToolbar`) |
| `toast*.tsx` | Systeme de notifications |
| `command-palette.tsx` | Palette de commandes de navigation rapide |

## Composants metier utiles

- `OrgHeader`, `PlanBadge`, `OrgStatusBadge`, `OnboardingStatusBadge`
- `InboxItemCard`, `UnreadMessagesCard`, `ActivityFeed`, `SystemHealthBar`
- `ErrorFallback`, `RouteProgressBar`, `ThemeToggle`

## Tests

- Les tests sont colocalises dans `__tests__/`, `chat/__tests__/` et `skeletons/__tests__/`.
