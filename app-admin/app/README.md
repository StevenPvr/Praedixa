# `app/` - App Router de l'admin

Arborescence Next.js du back-office. Ce dossier assemble 4 surfaces distinctes:

- la console authentifiee sous `app/(admin)/`
- l'UI publique de login sous `app/(auth)/`
- les handlers auth sous `app/auth/`
- le BFF same-origin sous `app/api/`

## Fichiers racine

| Fichier       | Role reel                        |
| ------------- | -------------------------------- |
| `layout.tsx`  | root layout et providers globaux |
| `globals.css` | styles globaux admin             |
| `robots.ts`   | robots de l'admin                |

Il n'y a pas de `page.tsx` racine hors groupes: l'accueil produit du back-office vit dans `app/(admin)/page.tsx`.

## Sous-zones

| Dossier         | Role reel                                  |
| --------------- | ------------------------------------------ |
| `(admin)/`      | console authentifiee, shell, routes metier |
| `(auth)/`       | UI de `/login`                             |
| `auth/`         | handlers OIDC, session, logout             |
| `api/`          | proxy admin vers l'API backend             |
| `unauthorized/` | page de refus d'acces                      |

## Regle de verite

Pour la console authentifiee, la verite des chemins et permissions reste `lib/auth/admin-route-policies.ts`.
