# `components/` - UI specifique au webapp

Ce dossier regroupe les composants React propres au tableau de bord client. Il complete `@praedixa/ui` avec des composants d'orchestration, de navigation et des vues metier.

## Zones principales

| Dossier/fichier | Role |
| --- | --- |
| `app-shell.tsx` | Shell principal des routes authentifiees |
| `sidebar.tsx` | Navigation laterale client |
| `dashboard/` | Widgets et graphiques du dashboard |
| `previsions/` | Visualisations liees aux previsions |
| `actions/` | Composants d'arbitrage et d'optimisation |
| `chat/` | Liste de conversations, thread et saisie de message |
| `charts/` | Charts D3 locaux reutilises par plusieurs pages |
| `ui/` | Primitives locales complementaires au package partage |
| `runtime-error-shield.tsx` | Garde-fou client contre erreurs runtime externes |

## Frontiere avec `@praedixa/ui`

- Ici: composants lies au routing, a la metrique Praedixa et au state local.
- Dans `@praedixa/ui`: primitives partagees entre apps, logo, badges, cartes et utilitaires visuels communs.

## Tests

- Les tests unitaires sont colocalises dans `__tests__/` ou `*/__tests__/`.
- Les pages de `app/(app)` s'appuient majoritairement sur ces composants plutot que sur de la logique inline.
