# `app/(admin)/` - Console super-admin

Ce groupe contient les routes protegees du back-office Praedixa. Le layout monte `AdminShell`, applique la navigation laterale et centralise l'acces a la console reservee aux utilisateurs autorises.

## Routes presentes

| Route | Fichier | Role |
| --- | --- | --- |
| `/` | `page.tsx` | Accueil admin, KPIs plateforme, inbox et signaux globaux |
| `/clients` | `clients/page.tsx` | Liste multi-tenant des organisations |
| `/clients/[orgId]/*` | `clients/[orgId]/...` | Workspace detaille par organisation |
| `/demandes-contact` | `demandes-contact/page.tsx` | Traitement des demandes entrantes |
| `/journal` | `journal/page.tsx` | Journal d'audit |
| `/parametres` | `parametres/page.tsx` | Parametrage plateforme |
| `/coverage-harness` | `coverage-harness/page.tsx` | Route interne de QA/couverture, non produit |

## Fichiers structurants

| Fichier | Role |
| --- | --- |
| `layout.tsx` | Monte le shell admin, la topbar et la sidebar |
| `page.tsx` | Dashboard global admin |
| `__tests__/page.test.tsx` | Couvre le dashboard |
| `__tests__/uncovered-pages.test.tsx` | Balaye des pages moins couvertes pour eviter les regressions |

## Workspace client

- Le detail du workspace client est documente dans [`clients/README.md`](./clients/README.md).
- Le contexte partage org/site vit dans `clients/[orgId]/client-context.tsx`.
