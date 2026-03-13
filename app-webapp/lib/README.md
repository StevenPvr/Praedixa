# `lib/` - Librairies transverses du webapp

Ce dossier concentre les modules non visuels: auth, client API, i18n, securite, helpers metier et modelisation locale.

## Sous-dossiers

| Dossier       | Role                                                  |
| ------------- | ----------------------------------------------------- |
| `api/`        | Client HTTP browser/server et catalogue d'endpoints   |
| `auth/`       | OIDC, session, middleware, cookies, roles, rate limit |
| `i18n/`       | Messages et provider de traduction                    |
| `security/`   | CSP, headers et controles same-origin                 |
| `animations/` | Tokens et presets de motion                           |

## Modules racine utiles

| Fichier                     | Role                                                 |
| --------------------------- | ---------------------------------------------------- |
| `site-scope.tsx`            | Scope de site partage dans l'app                     |
| `forecast-decomposition.ts` | Calculs de decomposition affiches dans `/previsions` |
| `scenario-utils.ts`         | Helpers de scenarios et arbitrage                    |
| `product-events.ts`         | Emission d'evenements produit vers l'API             |
| `formatters.ts`             | Formatage de dates, labels et severites              |
| `rapports-helpers.ts`       | Assemblage des donnees de rapports                   |
| `runtime-error-shield.ts`   | Classification d'erreurs runtime connues             |

## Tests

- Les tests sont repartis par domaine dans `__tests__/`, `api/__tests__/`, `auth/__tests__/`, `security/__tests__/` et `animations/__tests__/`.
