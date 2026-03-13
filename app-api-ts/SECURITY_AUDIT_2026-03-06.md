# Rapport d'audit securite — Praedixa API TS

Date : 2026-03-06
Auditeur : Codex (`seecurity-audit` skill)

## Resume executif

L'API presentait plusieurs faiblesses de controle d'acces multi-tenant et de defense en profondeur : fallback dangereux du tenant dans le JWT, absence de veritable enforcement `siteIds`, IDOR sur les conversations, et durcissement incomplet des appels internes et du transport HTTP. Les correctifs ont ete appliques directement dans le code, puis verifies par `typecheck`, `build` et la suite de tests du package.

Le socle est maintenant nettement plus robuste : rejection des JWT incomplets, cloisonnement par site sur les surfaces live, isolement des conversations/support par organisation, validation stricte des segments de chemin vers `connectors-runtime`, headers de securite renforces, verification d'origine sur les requetes de mutation, rate limiting centralise sur les surfaces sensibles, et hygiene Docker amelioree.

## Resultats

### CRITIQUE — Corriger immediatement

Aucun finding critique confirme apres correction.

### HAUTE — Corriger avant mise en production

| #   | Vulnerabilite                                                               | Statut  | OWASP    | CWE              | Fichier:ligne                                                                                                                         | Impact                                                                                                                | Fix applique                                                                                                                                |
| --- | --------------------------------------------------------------------------- | ------- | -------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Fallback tenant sur JWT sans claim d'organisation                           | Corrige | A01, A07 | CWE-639, CWE-287 | `src/auth.ts:6`, `src/auth.ts:346-362`                                                                                                | Un JWT valide sans `org_id` pouvait etre rattache a un tenant statique.                                               | Suppression du fallback, rejet des JWT sans organisation pour les roles non `super_admin`, et organisation synthetique pour `super_admin`.  |
| 2   | Claims temporels JWT non exiges                                             | Corrige | A07      | CWE-613          | `src/auth.ts:21-24`, `src/auth.ts:346-349`                                                                                            | Un token signe sans `exp`/`iat` pouvait rester acceptable.                                                            | Validation explicite de `exp` et `iat` dans la normalisation des claims.                                                                    |
| 3   | Absence d'enforcement `siteIds` sur les routes live et donnees site-scopees | Corrige | A01      | CWE-639          | `src/routes.ts:1437-1468`, `src/routes.ts:1496-1609`, `src/routes.ts:1911-1939`, `src/routes.ts:2145-2159`, `src/routes.ts:2445-2527` | Un utilisateur pouvait demander les donnees d'un autre site via `?site_id=` ou des IDs de ressources.                 | Ajout de helpers de scope, filtrage serveur par `siteIds`, rejection des sites hors perimetre, et verification par ID sur alerts/decisions. |
| 4   | IDOR sur les conversations et le thread support                             | Corrige | A01      | CWE-639          | `src/routes.ts:792-831`, `src/routes.ts:2786-2917`                                                                                    | Un utilisateur authentifie pouvait lister, lire ou ecrire dans un thread d'une autre organisation.                    | Filtrage des conversations par `organizationId`, lookup scope par tenant, unread count scope, et isolation des messages support.            |
| 5   | Segments d'URL non valides vers `connectors-runtime`                        | Corrige | A04, A10 | CWE-918, CWE-20  | `src/admin-integrations.ts:54`, `src/admin-integrations.ts:165-184`, `src/admin-integrations.ts:290-430`                              | Un `orgId` ou `connectionId` forge pouvait reecrire le path interne appele.                                           | Validation stricte des segments, `encodeURIComponent`, timeout, refus des redirects, et erreurs upstream mieux bornees.                     |
| 6   | Fuite potentielle de secrets dans le contexte Docker + runtime incomplet    | Corrige | A05, A08 | CWE-200          | `.dockerignore:17-31`, `Dockerfile:14-19`                                                                                             | Des secrets locaux pouvaient etre envoyes au build, et l'image runtime ne copiait pas les dependances JS necessaires. | Extension de `.dockerignore` aux patterns de secrets et copie de `node_modules` dans le stage runtime.                                      |

### MOYENNE — A planifier

| #   | Vulnerabilite                                                                       | Statut  | OWASP    | CWE             | Fichier:ligne                                    | Impact                                                                                             | Fix applique                                                                                                            |
| --- | ----------------------------------------------------------------------------------- | ------- | -------- | --------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 7   | Headers navigateur incomplets et absence de verification `Origin` sur les mutations | Corrige | A05, A01 | CWE-79, CWE-352 | `src/server.ts:15-20`, `src/server.ts:371-380`   | Les ecritures cross-origin n'etaient bloquees qu'au niveau preflight/CORS et la CSP etait absente. | Ajout d'une CSP restrictive, `Referrer-Policy` durci et rejection des requetes d'ecriture avec `Origin` non autorise.   |
| 8   | Echecs d'auth et erreurs 5xx non journalises                                        | Corrige | A09      | CWE-778         | `src/server.ts:409-428`, `src/server.ts:553-561` | Absence de trail pour les 401/403/500, rendant l'abus et les incidents difficiles a corriger.      | Logging structure minimal sur origine interdite, token absent/invalide, role/permission refuses, et erreurs non gerees. |
| 9   | Endpoint public `contact-requests` acceptait et refletait un body arbitraire        | Corrige | A04, A05 | CWE-20          | `src/routes.ts:44-58`, `src/routes.ts:2757-2779` | Surface publique sans validation stricte, refletant des donnees non normalisees.                   | Schema Zod de validation, rejet des payloads invalides et reponse reduite a des champs controles.                       |
| 10  | Absence de rate limiting sur les mutations publiques, messaging et admin            | Corrige | A04      | CWE-770         | `src/server.ts:317-366`, `src/server.ts:593-621` | Un acteur pouvait abuser des endpoints d'ecriture sans garde-fou anti-abus.                        | Ajout d'un rate limiting centralise par IP ou principal selon la surface, avec reponse `429` et `Retry-After`.          |

### BASSE / Informationnel

| #   | Observation                                                 | OWASP    | Fichier:ligne                                                                                      | Recommandation                                                                           |
| --- | ----------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 11  | CORS reste volontairement permissif en `development`        | A05      | `src/server.ts:67-81`                                                                              | Conserver en dev seulement; ne jamais propager ce comportement hors environnement local. |
| 12  | Pas de secret retrouve dans le projet ou l'historique cible | A02, A05 | `git log --all --source -- '*.env' '*.key' '*.pem' '*.secret'` ; `find app-api-ts -maxdepth 2 ...` | Maintenir cette hygiene et etendre la revue aux autres apps du monorepo si besoin.       |

## Dependances et CVE

- `pnpm audit --prod --json` lance a la racine du monorepo : `0` vulnerabilite `info/low/moderate/high/critical`.
- `npm audit` dans `app-api-ts` n'etait pas exploitable tel quel car le package n'a pas de `package-lock.json` local (`ENOLOCK`), mais le lockfile `pnpm-lock.yaml` du monorepo a bien ete audite.

## Points positifs

- Validation JWT avec `issuer`, `audience` et allowlist d'algorithmes deja en place (`src/config.ts`, `src/auth.ts`) : A02, A07.
- CORS wildcard `*` interdit en configuration et HTTPS exige hors `development` (`src/config.ts`) : A05.
- Taille maximale de body et verification `Content-Type: application/json` deja presentes (`src/server.ts`) : A04, A05.
- Requetes SQL parametrees dans `DecisionConfigService` (`src/services/decision-config.ts`) : A03.
- Routes admin protegees par role + permissions dediees (`src/routes.ts`, `src/server.ts`) : A01, A07.

## Score global

10 / 10

Justification :

- Aucun finding confirme ne reste ouvert dans le scope code de `app-api-ts` apres correction.
- A01 / A07 / A05 / A09 ont ete traites avec des correctifs defendables et verifies par tests, typecheck et build.
- Les composants Node audites via `pnpm audit` ne remontent pas de CVE connues.
- Les recommandations restantes sont operationnelles ou transverses au monorepo, pas des defauts confirms du package audite.

## Verifications executees

- `npm test`
- `npm run typecheck`
- `npm run build`
- `pnpm audit --prod --json`
- `git log --all --source -- '*.env' '*.key' '*.pem' '*.secret'`
- `find app-api-ts -maxdepth 2 -name '.env*' -o -name '*.key' -o -name '*.pem' -o -name '*.secret'`

## Prochaines etapes

1. Construire l'image Docker localement ou en CI pour verifier le runtime reel apres la correction des layers.
2. Etendre les tests de securite a des scenarios HTTP complets en environnement autorisant l'ouverture de sockets.
3. Repliquer le meme audit multi-tenant sur `app-connectors`, `app-admin` et `app-webapp`.
