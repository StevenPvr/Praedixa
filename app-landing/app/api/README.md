# `app/api/`

APIs locales exposees par le site marketing.

## Objectif

Servir les formulaires publics, les checks de sante et un endpoint d'ingest public controle. La logique HTTP reste mince: validation du protocole, rate limit, verification d'origine, parsing JSON, puis delegation vers `lib/api/*` et `lib/security/*`.

## Routes presentes

- `GET /api/health`: sante simple pour probes et diagnostic local
- `GET /api/contact/challenge`: challenge anti-spam signe et non cache
- `POST /api/contact`: formulaire contact
- `POST /api/pilot-application`: formulaire candidature pilote
- `POST /api/scoping-call`: demande de call de cadrage
- `POST /api/v1/public/contact-requests`: ingest public securise par token

## Pipeline commun des formulaires

Presque toutes les routes formulaire appliquent, dans cet ordre:

1. limite de taille (`rejectIfBodyTooLarge` / `readJsonBody`)
2. rate limiting partage via `lib/security/security-store.ts`
3. verification d'origine (`Origin`, `Referer`, `Sec-Fetch-Site`)
4. verification `Content-Type`
5. honeypot `website`
6. validation metier
7. envoi email via Resend
8. audit / persistence optionnelle

## Dependances internes clefs

- `lib/api/form-route.ts`
- `lib/api/contact/*`
- `lib/api/pilot-application/*`
- `lib/api/scoping-call/*`
- `lib/api/resend-client.ts`
- `lib/security/*`

## Tests associes

- `contact/__tests__/route.test.ts`
- `contact/challenge/__tests__/route.test.ts`
- `health/__tests__/route.test.ts`
- `pilot-application/__tests__/route-*.test.ts`
- `scoping-call/__tests__/route.test.ts`
- `v1/public/contact-requests/__tests__/route.test.ts`
