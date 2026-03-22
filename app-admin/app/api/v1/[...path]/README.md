# Path

## Rôle

Ce dossier matérialise un segment de route Next.js. Les fichiers `route.ts` définissent le rendu, le layout ou le handler HTTP de ce segment.

## Contenu immédiat

Sous-dossiers :

- `__tests__`

Fichiers :

- `route.ts`

## Intégration

Ce dossier est consommé par l'application `app-admin` et s'insère dans son flux runtime, build ou test.

## Garde-fous

- Le proxy same-origin rejoue la verification CSRF/origin avant toute requete authentifiee et echoue ferme si l'origine publique admin n'est pas configuree.
- Les chemins `/api/v1/admin/**` passent ensuite par une policy explicite issue de `lib/auth/admin-route-policies.ts`.
- Les bodies non `GET`/`HEAD` sont bornes par `API_PROXY_MAX_BODY_BYTES` avec une limite par defaut a `50 MiB` et un plafond de securite a `100 MiB`; un depassement renvoie `413 payload_too_large` avant l'appel upstream.
- Si la session n'a pas la permission requise, ou si aucun chemin proxy n'est declare, le handler repond en fail-close avant l'appel upstream.
- La normalisation de `NEXT_PUBLIC_API_URL` doit rester compatible avec le runtime Node/Next: retirer les slashs terminaux via `replace(...)`, pas via `replaceAll(...)` avec une regex non globale, sinon le proxy tombe en `502` avant meme de joindre l'API.
- En cas d'echec upstream, le handler emet un log JSON structure `proxy.upstream_failed` avec `request_id`, `status_code`, `duration_ms` et l'URL cible.
