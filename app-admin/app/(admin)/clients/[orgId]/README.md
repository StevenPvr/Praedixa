# OrgId

## Rôle

Ce dossier matérialise un segment de route Next.js. Les fichiers `layout.tsx`, `page.tsx` définissent le rendu, le layout ou le handler HTTP de ce segment.

## Contenu immédiat

Sous-dossiers :

- `__tests__`
- `actions`
- `alertes`
- `config`
- `dashboard`
- `donnees`
- `equipe`
- `messages`
- `onboarding`
- `previsions`
- `rapports`
- `vue-client`

Fichiers :

- `client-context.tsx`
- `layout.tsx`
- `page.tsx`
- `read-only-detail.tsx`

## Intégration

Ce dossier est consommé par l'application `app-admin` et s'insère dans son flux runtime, build ou test.

## Notes locales

- `read-only-detail.tsx` harmonise les headers et les cartes d'etat `empty / degraded` des vues read-only branchees sous `actions/` et `rapports/`.
