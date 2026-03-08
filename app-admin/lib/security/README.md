# `lib/security/` - Protections HTTP de l'admin

Ce dossier regroupe les protections techniques complementaires a l'auth OIDC: CSP, headers, verification de l'origine browser, sanitation de liens et rate limiting.

## Fichiers

| Fichier | Role |
| --- | --- |
| `browser-request.ts` | Resolution d'origine attendue et verifications same-origin |
| `csp.ts` | Construction de la Content Security Policy |
| `headers.ts` | Headers de securite pour `next.config.ts` |
| `navigation.ts` | Sanitize des liens externes et `mailto:` |
| `rate-limit.ts` | Rate limiting des routes JSON auth/admin |

## Usage

- `proxy.ts` utilise `csp.ts`.
- `app/auth/session/route.ts`, `app/auth/logout/route.ts` et `app/api/v1/[...path]/route.ts` utilisent `browser-request.ts`.
- Les pages admin reutilisent `navigation.ts` pour ouvrir des liens ou emails sans prendre de raccourci.

## Tests

- `__tests__/csp.test.ts`
- `__tests__/navigation.test.ts`
