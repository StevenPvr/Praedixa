# `app/` - App Router du webapp

Arborescence Next.js du workspace client. Ce dossier se limite a 3 surfaces:

- un shell authentifie sous `app/(app)/`
- une UI publique de login sous `app/(auth)/`
- des route handlers sous `app/auth/` et `app/api/`

## Fichiers racine

| Fichier         | Role reel                                      |
| --------------- | ---------------------------------------------- |
| `layout.tsx`    | root layout, skip-link et `RuntimeErrorShield` |
| `page.tsx`      | redirect serveur de `/` vers `/dashboard`      |
| `not-found.tsx` | 404 globale de l'app                           |
| `globals.css`   | styles globaux du webapp                       |
| `robots.ts`     | robots de l'app                                |

## Sous-zones

| Dossier      | Role reel                                              |
| ------------ | ------------------------------------------------------ |
| `(app)/`     | pages authentifiees du workspace client                |
| `(auth)/`    | layout et page `/login`                                |
| `auth/`      | handlers OIDC, session et logout                       |
| `api/`       | proxy same-origin vers l'API Praedixa                  |
| `__tests__/` | tests du root layout, de la page `/` et du `not-found` |

## Regles de routage

- Le middleware s'aligne sur `lib/auth/route-policy.ts`.
- Tout nouveau chemin supporte doit etre ajoute a cette registry.
- Les groupes `(auth)` et `(app)` ne remplacent pas les handlers `app/auth/*`: l'UI login et les endpoints auth sont deux surfaces distinctes.
