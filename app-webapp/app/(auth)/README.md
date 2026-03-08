# `app/(auth)/` - Ecrans publics de connexion

Ce groupe contient l'UI publique accessible sans session. Il ne porte pas la logique OIDC elle-meme: cette logique vit dans les route handlers de [`../auth/`](../auth/README.md).

## Contenu

| Fichier | Role |
| --- | --- |
| `layout.tsx` | Layout minimal pour les ecrans publics |
| `login/page.tsx` | Ecran `/login`, messages d'erreur de reauth et CTA OIDC |
| `__tests__/layout.test.tsx` | Verification du layout public |
| `login/__tests__/page.test.tsx` | Verification du rendu de la page de login |

## Frontiere avec `app/auth/`

- Ici: rendu React, branding, message utilisateur.
- Dans `app/auth/`: initiation du flow PKCE, callback, refresh, logout.
