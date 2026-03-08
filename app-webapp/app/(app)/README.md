# `app/(app)/` - Routes authentifiees

Ce groupe contient l'experience principale du client une fois la session OIDC validee. Le layout de ce dossier monte l'`AppShell`, la navigation, le scope de site et les providers transverses.

## Routes presentes

| Route | Fichier | Role |
| --- | --- | --- |
| `/dashboard` | `dashboard/page.tsx` | Vue d'ensemble operationnelle |
| `/previsions` | `previsions/page.tsx` | Lecture des previsions et decomposition |
| `/actions` | `actions/page.tsx` | Arbitrage des alertes et scenarios |
| `/messages` | `messages/page.tsx` | Messagerie client <> Praedixa |
| `/parametres` | `parametres/page.tsx` | Reglages et configuration visible client |

## Fichiers structurants

| Fichier | Role |
| --- | --- |
| `layout.tsx` | Shell authentifie, sidebar/topbar, providers et navigation |
| `not-found.tsx` | 404 interne a la zone authentifiee |
| `*/loading.tsx` | Etats de chargement par route |
| `messages/use-messages-page-model.ts` | Modele de page compose les appels API et le state de messagerie |

## Dependances principales

- `@/components/app-shell` structure le layout.
- `@/hooks/use-api` alimente les pages en donnees backend.
- `@/hooks/use-decision-config` et `@/hooks/use-latest-forecasts` concentrent des besoins metier recurrents.
- `@/lib/site-scope` garde le filtre de site partage entre pages.

## Tests

- `__tests__/layout.test.tsx` et `not-found.test.tsx` valident l'encapsulation du groupe.
- Les composants riches ont leurs tests dans `components/**/__tests__`.
