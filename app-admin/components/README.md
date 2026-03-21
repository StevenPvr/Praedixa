# `components/` - Composants locaux de la console admin

Composants propres au back-office. Ici vivent le shell admin, la navigation pilotee par policies, les vues de supervision et les composants de workspace client.

## Inventaire reel

| Zone                  | Contenu reel                                                                                                    |
| --------------------- | --------------------------------------------------------------------------------------------------------------- |
| shell                 | `admin-shell.tsx`, `admin-sidebar.tsx`, `admin-topbar.tsx`, `route-progress-bar.tsx`                            |
| navigation workspace  | `client-tabs-nav.tsx`, `site-tree.tsx`, `command-palette.tsx`                                                   |
| supervision           | `activity-feed.tsx`, `system-health-bar.tsx`, `unread-messages-card.tsx`, `inbox-item-card.tsx`                 |
| identite/statut       | `org-header.tsx`, `plan-badge.tsx`, `org-status-badge.tsx`, `onboarding-status-badge.tsx`, `severity-badge.tsx` |
| messagerie            | `chat/`                                                                                                         |
| skeletons             | `skeletons/`                                                                                                    |
| utilitaires UI locaux | `ui/`, `toast*.tsx`, `theme-*.tsx`, `error-fallback.tsx`, `praedixa-logo.tsx`                                   |

## Patterns a conserver

- sidebar, topbar, palette et tabs de workspace lisent la meme source de verite de permissions/routes
- `AdminShell` est responsable des etats de chargement permissions et de l'etat `Acces restreint`
- les composants de navigation ne doivent pas reconstruire leurs propres listes de routes
- `onboarding-status-badge.tsx` porte maintenant la taxonomie BPM onboarding (`draft`, `blocked`, `ready_*`, `active_*`, `completed`, `cancelled`) partagee entre la supervision cross-org et le workspace client
- `theme-provider.tsx` doit forwarder le nonce CSP recu du layout a `next-themes`; le bootstrap inline du theme ne doit jamais repartir sans nonce
- `org-header.tsx` relaie maintenant aussi le flag `Client test` issu du detail org, pour rendre visible partout le statut requis avant une suppression destructive
