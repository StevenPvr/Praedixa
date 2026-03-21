# `lib/security/`

Socle securite du landing.

## Responsabilites

- CSP et nonce (`csp.ts`)
- audit securite local (`audit-log.ts`)
- verification d'origine et de requete JSON (`request-origin.ts`, `json-request.ts`, `request-body.ts`)
- challenge anti-spam contact (`contact-challenge.ts`)
- validation semantique partagee des emails marketing (`email-address.ts`)
- rate limit et tokens one-shot via store partage (`security-store.ts`, `redis-security-store.ts`, `security-store.types.ts`)
- classification/exposition anti-scraping (`exposure-policy.ts`)
- signature courte des assets teaser (`signed-resource-asset.ts`)
- sanitation d'URL / JSON script (`outbound-url.ts`, `json-script.ts`)
- headers additionnels (`headers.ts`)

## Points a connaitre

- `security-store.ts` bascule vers Redis si configure, sinon memoire hors production
- `security-store.types.ts` porte les contrats partages pour eviter une dependance circulaire entre orchestrateur et backend Redis
- les formulaires publics reutilisent ce dossier via `lib/api/form-route.ts`
- `contact-challenge.ts` protege le formulaire contact contre rejeu et automatisation
- `exposure-policy.ts` est la source de verite du landing pour la classification P0/P1/P2/P3, l'indexabilite, la politique IA et les budgets de surface; toute nouvelle route publique doit y etre couverte
- la politique IA distingue le corpus public volontairement ouvert aux bots de search/training conformes et les surfaces techniques qui restent bloquees au runtime
- `signed-resource-asset.ts` sert les assets SEO via une redirection meme-origine puis une URL signee courte; ne jamais republier un telechargement utile sur une URL stable
- `email-address.ts` est la source de verite partagee pour les emails saisis sur `/contact`, le parcours de demande de deploiement et le call de cadrage; ne pas reintroduire de regex locale divergente dans les composants ou routes.
- `proxy.ts` consomme la CSP issue de ce dossier a chaque requete

## Tests

- `__tests__/contact-challenge.test.ts`
- `__tests__/csp.test.ts`
- `__tests__/email-address.test.ts`
- `__tests__/exposure-policy.test.ts`
- `__tests__/outbound-url.test.ts`
- `__tests__/security-store.test.ts`

## Convention

Toute nouvelle route JSON authentifiee par navigateur doit verifier l'origine et refuser le cross-site par defaut.
La CSP du landing garde `script-src` strict avec nonce, mais doit tolerer `style-src 'unsafe-inline'` tant que les sections marketing animees reposent sur les styles inline de Framer Motion; verifier la homepage reelle avant de resserrer cette directive.
Toute sortie serveur vers une URL configurable (`fetch` interne, webhook, ingest) doit exiger une allowlist d'hotes en production; le simple HTTPS ne suffit pas.
