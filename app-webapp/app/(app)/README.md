# `app/(app)/` - Routes authentifiees du webapp

Ce groupe contient les 5 pages authentifiees du workspace client. Le fichier `layout.tsx` ne fait qu'injecter `AppShell`; la majeure partie du shell vit dans `components/app-shell.tsx`.

## Routes presentes

| Route         | Fichier               | Role reel                                                    |
| ------------- | --------------------- | ------------------------------------------------------------ |
| `/dashboard`  | `dashboard/page.tsx`  | vue d'ensemble client via `WarRoomDashboard`                 |
| `/previsions` | `previsions/page.tsx` | lecture des horizons actifs, previsions et alertes ouvertes  |
| `/actions`    | `actions/page.tsx`    | traitement d'alertes et historique de decisions              |
| `/messages`   | `messages/page.tsx`   | conversations support Praedixa                               |
| `/parametres` | `parametres/page.tsx` | profil, preferences UI et lecture de la configuration active |

## Shell et patterns communs

- `layout.tsx` monte `AppShell`, pas de providers metier supplementaires dans la route elle-meme.
- `AppShell` compose la sidebar, la topbar, le menu profil, le logout, l'i18n et le `SiteScopeProvider`, avec des helpers et sous-composants locaux dans `components/app-shell-*`.
- Pour `manager` et `hr_manager`, le site est verrouille au `siteId` de la session.
- Chaque page a son `loading.tsx`; il n'y a pas de couche de fallback generique dediee a ce groupe en dehors du `RuntimeErrorShield` global.

## Fetch et etats degrades observes

- les pages utilisent surtout `useApiGet`, `useApiGetPaginated`, `useDecisionConfig` et `useLatestForecasts`
- les erreurs metier sont rendues inline dans la page, pas transformees en route error boundary specifique
- `previsions`, `actions`, `messages` et `parametres` ont chacune des etats vides ou des messages d'indisponibilite visibles dans le JSX

## Lire ensuite

- `dashboard/README.md`
- `previsions/README.md`
- `actions/README.md`
- `messages/README.md`
- `parametres/README.md`
