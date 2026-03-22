# OrgId

## Rôle

Ce dossier matérialise un segment de route Next.js. Les fichiers `layout.tsx`, `page.tsx` définissent le rendu, le layout ou le handler HTTP de ce segment.

## Contenu immédiat

Sous-dossiers :

- `__tests__`
- `actions`
- `alertes`
- `config`
- `contrats`
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
- `equipe/` est maintenant la voie normale de creation des comptes client: l'admin y provisionne l'identite Keycloak et ne depend plus d'un seed `ops.*` ou d'un utilisateur fake documente.
- Le layout workspace depend du endpoint partage `GET /api/v1/admin/organizations/[orgId]`; toute surface qui monte sous ce layout, y compris `messages/`, doit donc rester couverte par la policy de cet endpoint.
- `client-context.tsx` et `layout.tsx` exposent maintenant des contrats de props dedies en `Readonly` pour garder les composants du segment `[orgId]` alignes avec Sonar.
- `read-only-detail.tsx` suit la meme convention: ses composants de header et de carte read-only utilisent des props `Readonly`.
