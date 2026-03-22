# `components/` - Composants locaux du webapp

Ce dossier contient les composants propres au workspace client. Il ne faut pas y documenter des zones qui n'existent plus: pas de dossier `previsions/`, pas de `charts/` generique et pas de systeme toast local versionne ici.

## Inventaire reel

| Zone                                      | Contenu reel                                                                              |
| ----------------------------------------- | ----------------------------------------------------------------------------------------- |
| `app-shell.tsx`                           | shell authentifie et composition layout principale                                        |
| `app-shell-*.tsx` / `app-shell-model.tsx` | topbar, menu profil et helpers du shell webapp                                            |
| `sidebar.tsx`                             | navigation locale du webapp                                                               |
| `dashboard/`                              | `WarRoomDashboard`                                                                        |
| `chat/`                                   | `ConversationList`, `MessageThread`, `MessageInput`                                       |
| `ui/`                                     | primitives locales de presentation (`button`, `card`, `detail-card`, charts ciblés, etc.) |
| racine                                    | `PraedixaLogo`, `RuntimeErrorShield`                                                      |

## Frontiere avec `@praedixa/ui`

- ici: shell, navigation, composants metier ou primitives specifiques a ce webapp
- dans `@praedixa/ui`: primitives partagees entre apps et tokens communs

## Patterns a conserver

- `AppShell` et `Sidebar` n'inventent pas de permissions: ils s'appuient sur l'etat utilisateur et le routage reel du webapp
- les etats degrades visibles restent dans les pages et composants metier, pas dans une couche magique de fallback globale
- le shell est maintenant decoupe entre layout, topbar/menu profil et helpers de scope/breadcrumbs pour garder chaque fichier lisible
- la date du topbar est hydratee uniquement cote client via `useHeaderDate`, puis replanifiee au prochain passage de minuit pour eviter les mismatches SSR/hydration
- les charts locaux comme `pareto-chart.tsx` et `waterfall-chart.tsx` gardent leur calcul de geometrie dans de petits helpers purs plutot que d'alourdir le JSX principal
