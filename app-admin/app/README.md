# `app/` - App Router de l'admin

Arborescence Next.js du back-office. Ce dossier assemble 4 surfaces distinctes:

- la console authentifiee sous `app/(admin)/`
- l'UI publique de login sous `app/(auth)/`
- les handlers auth sous `app/auth/`
- le BFF same-origin sous `app/api/`

## Fichiers racine

| Fichier       | Role reel                                                                            |
| ------------- | ------------------------------------------------------------------------------------ |
| `layout.tsx`  | root layout, providers globaux et propagation du nonce CSP vers les providers client |
| `globals.css` | styles globaux admin                                                                 |
| `robots.ts`   | robots de l'admin                                                                    |

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

## CSP et providers

- `app/layout.tsx` lit `x-nonce` via `next/headers` et le transmet aux providers client qui injectent des scripts inline.
- `components/theme-provider.tsx` doit continuer a forwarder ce nonce a `next-themes`, sinon `/login` et les shells admin retombent en violation `script-src`.
