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
- `command-palette-model.ts` porte maintenant le catalogue/filtres de navigation; `command-palette.tsx` reste concentre sur le dialogue et le clavier
- `admin-shell-sections.tsx` porte maintenant la structure `backdrop/sidebar/main`; `admin-shell.tsx` garde surtout l'etat de shell et le calcul d'acces
- `AdminShell` est responsable des etats de chargement permissions et de l'etat `Acces restreint`
- les composants de navigation ne doivent pas reconstruire leurs propres listes de routes
- les composants de navigation et de chat du dossier gardent maintenant des props `Readonly`, des guards positifs et des contenus intermediaires explicites pour eviter les faux positifs Sonar recurrents
- `onboarding-status-badge.tsx` porte maintenant la taxonomie BPM onboarding (`draft`, `blocked`, `ready_*`, `active_*`, `completed`, `cancelled`) partagee entre la supervision cross-org et le workspace client
- `theme-provider.tsx` doit forwarder le nonce CSP recu du layout a `next-themes`; le bootstrap inline du theme ne doit jamais repartir sans nonce
- `route-progress-bar.tsx`, les skeletons et les fallback UI utilisent maintenant `globalThis`, des cles stables et des props `Readonly` pour rester alignes avec les checks Sonar recurrents du repo
- `org-header.tsx` relaie maintenant aussi le flag `Client test` issu du detail org, pour rendre visible partout le statut requis avant une suppression destructive
- `admin-shell.tsx`, `admin-shell-sections.tsx`, `admin-sidebar.tsx` et `admin-topbar.tsx` utilisent maintenant des props `Readonly`, des contenus derives hors du JSX et des guards explicites plutot que des negations inline
- les composants presentiels du lot badges/toasts/providers gardent maintenant leurs props explicites en `Readonly`, avec des guards positifs quand Sonar les exige.
- les utilitaires `ui/` gardent des contrats de props explicites et immuables, sans index keys ni gardes implicites dans le rendu des petits composants partages.
- le shell admin, le topbar, les tabs client et la palette de commandes utilisent maintenant des variables intermediaires nommees pour les etats d'affichage, afin d'eviter les negations inline et les ternaires JSX imbriques les plus fragiles.
