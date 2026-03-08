# `lib/security/` - Protections HTTP et navigateur

Ce dossier regroupe les protections transverses du webapp hors auth OIDC stricte.

## Fichiers

| Fichier | Role |
| --- | --- |
| `csp.ts` | Generation du nonce CSP et de l'en-tete CSP |
| `headers.ts` | Headers de securite statiques pour `next.config.ts` |
| `same-origin.ts` | Verification des requetes browser same-origin sur les routes JSON sensibles |

## Usage

- `proxy.ts` s'appuie sur `csp.ts` pour injecter le nonce.
- Les route handlers `app/auth/*` et `app/api/v1/*` utilisent `same-origin.ts`.
- `next.config.ts` importe `headers.ts` pour les headers generaux.

## Tests

- `__tests__/csp.test.ts` couvre la construction de la CSP.
