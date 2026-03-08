# `app/` - App Router de l'admin

Ce dossier contient l'interface Next.js du back-office Praedixa. Il assemble la console super-admin, les pages publiques de login, les route handlers d'auth et le BFF admin vers l'API backend.

## Sous-zones

| Dossier | Role |
| --- | --- |
| `(admin)/` | Console authentifiee super-admin |
| `(auth)/` | Ecran de connexion |
| `auth/` | Route handlers OIDC, session, logout |
| `api/` | Proxy same-origin vers `/api/v1/*` backend |
| `unauthorized/` | Ecran de refus d'acces |
| `__tests__/` | Tests des layouts/pages racine |

## Fichiers racine

| Fichier | Role |
| --- | --- |
| `layout.tsx` | Layout global, providers de theme et toasts |
| `globals.css` | Styles globaux admin |
| `robots.ts` | Robots de l'admin |

## Navigation

- La console metier vit dans `app/(admin)/README.md`.
- Le login UI vit dans `app/(auth)/README.md`.
- Les handlers serveur d'auth vivent dans `app/auth/README.md`.
- Le BFF admin vit dans `app/api/README.md`.
