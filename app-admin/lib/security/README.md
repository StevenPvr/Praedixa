# `lib/security/` - Protections HTTP de l'admin

Ce dossier regroupe les protections techniques complementaires a l'auth OIDC: CSP, headers, verification de l'origine browser, sanitation de liens et rate limiting.

## Fichiers

| Fichier              | Role                                                                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `browser-request.ts` | Resolution d'origine attendue et verifications same-origin fail-closed, avec priorite au signal `Sec-Fetch-Site` quand il contredit une requete browser JSON  |
| `csv.ts`             | Neutralisation des cellules CSV dangereuses (`=`, `+`, `-`, `@`, caracteres de controle`) pour les exports operateur                                          |
| `csp.ts`             | Construction de la Content Security Policy                                                                                                                    |
| `headers.ts`         | Headers de securite pour `next.config.ts`                                                                                                                     |
| `navigation.ts`      | Sanitize des liens externes et `mailto:`                                                                                                                      |
| `rate-limit.ts`      | Rate limiting des routes JSON auth/admin, fail-close hors developpement si le store distribue ou son salt manquent, avec `mode` explicite sur chaque resultat |

## Usage

- `proxy.ts` utilise `csp.ts`.
- Les ecrans proteges sous `app/(admin)` restent en rendu dynamique (`dynamic = "force-dynamic"`) pour que la CSP a nonce reste compatible avec l'hydratation Next.js et les flux streames.
- `csp.ts` garde maintenant ses branches dev/prod dans des variables explicites (`isDev`, `scriptSrc`, `styleSrc`) pour stabiliser la lecture Sonar sans changer la politique nonce.
- `csv.ts` serialize maintenant explicitement les valeurs non-string (`Date`, objets JSON, symboles) avant neutralisation, au lieu de s'appuyer sur une stringification implicite potentiellement opaque.
- `rate-limit.ts` garde maintenant ses parseurs RESP, la lecture d'URL Redis et la resolution d'IP client en helpers courts pour limiter la complexite cognitive sans diluer les garde-fous fail-close.
- `app/layout.tsx` consomme `x-nonce` et le propage aux providers client qui emettent un bootstrap inline.
- `app/auth/session/route.ts`, `app/auth/logout/route.ts` et `app/api/v1/[...path]/route.ts` utilisent `browser-request.ts`.
- Les exports CSV browser-facing reutilisent `csv.ts` pour neutraliser les cellules interpretees comme formules par Excel/LibreOffice.
- Les pages admin reutilisent `navigation.ts` pour ouvrir des liens ou emails sans prendre de raccourci.
- Les routes JSON admin refusent toute requete dont `Sec-Fetch-Site` annonce `cross-site` ou `same-site`, meme si un header `Origin` parait legitime.

## Tests

- `__tests__/csp.test.ts`
- `__tests__/csv.test.ts`
- `__tests__/navigation.test.ts`
- `__tests__/browser-request.test.ts`
- `__tests__/rate-limit.test.ts`
