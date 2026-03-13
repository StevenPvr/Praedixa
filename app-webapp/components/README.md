# `components/` - Composants locaux du webapp

Ce dossier contient les composants propres au workspace client. Il ne faut pas y documenter des zones qui n'existent plus: pas de dossier `previsions/`, pas de `charts/` generique et pas de systeme toast local versionne ici.

## Inventaire reel

| Zone            | Contenu reel                                                                              |
| --------------- | ----------------------------------------------------------------------------------------- |
| `app-shell.tsx` | shell authentifie, i18n client, site scope, profil/logout                                 |
| `sidebar.tsx`   | navigation locale du webapp                                                               |
| `dashboard/`    | `WarRoomDashboard`, `ForecastTimelineChart`, `ChartInsight`                               |
| `actions/`      | `OptimizationPanel`                                                                       |
| `chat/`         | `ConversationList`, `MessageThread`, `MessageInput`                                       |
| `ui/`           | primitives locales de presentation (`button`, `card`, `detail-card`, charts ciblés, etc.) |
| racine          | `PraedixaLogo`, `RuntimeErrorShield`                                                      |

## Frontiere avec `@praedixa/ui`

- ici: shell, navigation, composants metier ou primitives specifiques a ce webapp
- dans `@praedixa/ui`: primitives partagees entre apps et tokens communs

## Patterns a conserver

- `AppShell` et `Sidebar` n'inventent pas de permissions: ils s'appuient sur l'etat utilisateur et le routage reel du webapp
- les etats degrades visibles restent dans les pages et composants metier, pas dans une couche magique de fallback globale
