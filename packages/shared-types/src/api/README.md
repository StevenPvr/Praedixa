# Api

## Rôle

Ce dossier regroupe les contrats, clients ou helpers liés aux échanges HTTP/API du périmètre.

## Contenu immédiat

Sous-dossiers :

- Aucun élément versionné direct.

Fichiers :

- `requests.ts`
- `responses.ts`
- `public-contract.ts`
- `public-contract/`

## Intégration

Ce dossier appartient au package partagé `packages/shared-types` et peut être importé par plusieurs apps du monorepo.
`public-contract.ts` reste l'entree publique du manifeste type des operations non-admin. Le detail est decoupe dans `public-contract/` (`common`, `types`, `operations-*`) pour garder la parite spec/runtime/types sans reintroduire de fichier monolithique hors guardrails.
Les payloads d'ecriture exposes publiquement vivent dans `requests.ts` et sont references 1:1 par les composants schemas de `contracts/openapi/public.yaml`.
Le helper `public-contract/openapi-node.ts` sert uniquement aux tests et audits Node pour parser `public.yaml` de maniere structurelle; il n'est pas re-exporte dans l'API browser-friendly du package.
