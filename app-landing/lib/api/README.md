# `lib/api/`

Services serveur pour les endpoints du landing.

## Organisation

- `form-route.ts`: pipeline HTTP commun aux formulaires
- `resend-client.ts`: singleton Resend
- `contact/`: validation, persistence, envoi emails contact
- `deployment-request/`: constantes, rate limit IP, validation, envoi emails pilote
- `scoping-call/`: validation et envoi du call de cadrage

## Mode d'emploi

Une route `app/api/*` devrait:

1. faire le strict minimum d'orchestration HTTP
2. deleguer la validation metier a `validation.ts`
3. deleguer l'envoi email a `email.ts`
4. reutiliser `form-route.ts` pour taille, origine, honeypot et rate limit

## Conventions

- garder les messages d'erreur utilisateur ici quand ils sont specifiques au transport
- les verifications d'origine et de stockage de securite passent toujours par `lib/security/*`
- la persistence optionnelle doit echouer de facon tolerante si le parcours principal est l'email
- utiliser `maxBodyLength` comme nom unique pour les limites de corps JSON dans `form-route.ts`

## Tests associes

- `deployment-request/__tests__/rate-limit.test.ts`
- tests de routes dans `app/api/**/__tests__/`
