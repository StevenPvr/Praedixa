# `app/auth/` - Route handlers d'auth admin

Ce dossier contient les endpoints serveur qui pilotent le flow OIDC du back-office. Ils ressemblent a ceux du webapp, avec en plus les controles d'origine et de permissions propres a la console super-admin.

## Routes

| Route | Fichier | Role |
| --- | --- | --- |
| `/auth/login` | `login/route.ts` | Demarre le flow OIDC |
| `/auth/callback` | `callback/route.ts` | Echange le `code`, cree les cookies et valide l'acces admin |
| `/auth/session` | `session/route.ts` | Retourne la session admin courante, meme-origin + rate limit |
| `/auth/logout` | `logout/route.ts` | Nettoie la session et ferme le parcours |

## Spec admin

- Les reponses de session renvoient aussi les `permissions`.
- Les verifications same-origin utilisent `lib/security/browser-request.ts`.
- La route session applique un rate limit dedie.

## Tests

- Les tests sont colocalises dans chaque sous-dossier `__tests__/`.
