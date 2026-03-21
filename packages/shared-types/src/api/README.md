# Api

## Rôle

Ce dossier regroupe les contrats, clients ou helpers liés aux échanges HTTP/API du périmètre.

## Contenu immédiat

Sous-dossiers :

- Aucun élément versionné direct.

Fichiers :

- `admin-organizations.ts`
- `admin-onboarding.ts`
- `requests.ts`
- `responses.ts`
- `public-contract.ts`
- `public-contract/`

## Intégration

Ce dossier appartient au package partagé `packages/shared-types` et peut être importé par plusieurs apps du monorepo.
`public-contract.ts` reste l'entree publique du manifeste type des operations non-admin. Le detail est decoupe dans `public-contract/` (`common`, `types`, `operations-*`) pour garder la parite spec/runtime/types sans reintroduire de fichier monolithique hors guardrails.
Les payloads d'ecriture exposes publiquement vivent dans `requests.ts` et sont references 1:1 par les composants schemas de `contracts/openapi/public.yaml`.
`admin-organizations.ts` porte maintenant le contrat partage des mutations lifecycle admin sur les organisations (`CreateAdminOrganizationRequest`, `DeleteAdminOrganizationRequest`, `AdminOrganizationSummary`) avec le flag persistant `isTest`, afin que `/clients`, `/parametres`, `/clients/[orgId]/dashboard` et `app-api-ts` restent alignes sur la meme source de verite.
`admin-onboarding.ts` porte maintenant les DTO admin partages du nouveau domaine onboarding BPM (`case`, `task`, `blocker`, payloads de creation, de sauvegarde de brouillon, de completion de tache et d'actions lifecycle`) pour eviter un drift front/API pendant la fondation du control plane.
Le meme contrat decrit aussi maintenant l'evidence d'invitation securisee de l'etape `access-model` (`OnboardingAccessInviteRecipient`) afin que l'onboarding front et la validation backend restent alignes sur le flux `activation link + client sets password`.
Le helper `public-contract/openapi-node.ts`sert uniquement aux tests et audits Node pour parser`public.yaml` de maniere structurelle; il n'est pas re-exporte dans l'API browser-friendly du package.
Comme il est appele par plusieurs assertions de contrat dans la meme execution, il doit mutualiser le parse YAML au niveau processus au lieu de reparcourir la spec a chaque helper.
