# Path

## Rôle

Ce dossier matérialise un segment de route Next.js. Les fichiers `route.ts` définissent le rendu, le layout ou le handler HTTP de ce segment.

## Contenu immédiat

Sous-dossiers :

- `__tests__`

Fichiers :

- `route.ts`

## Intégration

Ce dossier est consommé par l'application `app-webapp` et s'insère dans son flux runtime, build ou test.

## Garde-fous

- Le proxy same-origin propage un `X-Request-ID` stable vers l'API amont.
- Le proxy reste strict sur les requetes browser JSON: `Sec-Fetch-Site:none` n'est pas autorise sur cette surface et une requete sans metadata d'origine est rejetee.
- En cas d'echec upstream, le handler emet un log JSON structure `proxy.upstream_failed` avec `request_id`, `status_code`, `duration_ms` et l'URL cible.
