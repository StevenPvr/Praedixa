# `lib/` - Modules transverses de l'admin

Ce dossier concentre la logique non visuelle du back-office: auth, permissions, client API, securite et helpers metier d'inbox/monitoring.

## Sous-dossiers

| Dossier | Role |
| --- | --- |
| `api/` | Client HTTP admin et catalogue d'endpoints |
| `auth/` | OIDC, session, permissions, garde de routes |
| `security/` | CSP, headers, same-origin et rate limit |

## Modules racine utiles

| Fichier | Role |
| --- | --- |
| `chat-config.ts` | Intervalles de polling pour la messagerie |
| `inbox-helpers.ts` | Types et derivees pour les cartes d'accueil admin |

## Tests

- Les tests sont repartis dans `api/__tests__/`, `auth/__tests__/` et `security/__tests__/`.
