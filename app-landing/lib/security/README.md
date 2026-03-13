# `lib/security/`

Socle securite du landing.

## Responsabilites

- CSP et nonce (`csp.ts`)
- audit securite local (`audit-log.ts`)
- verification d'origine et de requete JSON (`request-origin.ts`, `json-request.ts`, `request-body.ts`)
- challenge anti-spam contact (`contact-challenge.ts`)
- rate limit et tokens one-shot via store partage (`security-store.ts`, `redis-security-store.ts`, `security-store.types.ts`)
- sanitation d'URL / JSON script (`outbound-url.ts`, `json-script.ts`)
- headers additionnels (`headers.ts`)

## Points a connaitre

- `security-store.ts` bascule vers Redis si configure, sinon memoire hors production
- `security-store.types.ts` porte les contrats partages pour eviter une dependance circulaire entre orchestrateur et backend Redis
- les formulaires publics reutilisent ce dossier via `lib/api/form-route.ts`
- `contact-challenge.ts` protege le formulaire contact contre rejeu et automatisation
- `proxy.ts` consomme la CSP issue de ce dossier a chaque requete

## Tests

- `__tests__/contact-challenge.test.ts`
- `__tests__/csp.test.ts`
- `__tests__/outbound-url.test.ts`
- `__tests__/security-store.test.ts`

## Convention

Toute nouvelle route JSON authentifiee par navigateur doit verifier l'origine et refuser le cross-site par defaut.
