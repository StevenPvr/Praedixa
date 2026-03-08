# `app/` - App Router du webapp

Ce dossier porte l'arborescence Next.js du produit client. Il assemble les layouts globaux, les pages publiques, les pages authentifiees et les route handlers qui servent d'interface entre le navigateur et le backend Praedixa.

## Sous-zones

| Dossier | Role |
| --- | --- |
| `(app)/` | Pages authentifiees du tableau de bord client |
| `(auth)/` | Ecrans publics de connexion |
| `auth/` | Route handlers OIDC et session |
| `api/` | BFF same-origin vers `NEXT_PUBLIC_API_URL` |
| `__tests__/` | Tests des layouts et pages racine |

## Fichiers racine

| Fichier | Role |
| --- | --- |
| `layout.tsx` | Layout global de l'application, styles et garde-fou runtime |
| `page.tsx` | Point d'entree `/`, redirigé vers l'experience principale |
| `not-found.tsx` | 404 globale |
| `globals.css` | Tokens CSS et styles globaux |
| `robots.ts` | Robots de l'app |

## Routage

- Les pages metier vivent dans `app/(app)/README.md`.
- Le login UI vit dans `app/(auth)/README.md`.
- Les callbacks OIDC, la session et la deconnexion vivent dans `app/auth/README.md`.
- Les appels browser vers le backend passent par `app/api/README.md`.

## Tests

- `app/__tests__/layout.test.tsx`, `page.test.tsx`, `not-found.test.tsx` couvrent les points d'entree et les garde-fous de rendu.
- Les tests de pages plus metier sont colocalises dans les sous-dossiers `(app)` et `(auth)`.
