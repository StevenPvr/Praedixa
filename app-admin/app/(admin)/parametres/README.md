# Parametres

## Rôle

Ce dossier matérialise un segment de route Next.js. Les fichiers `page.tsx` définissent le rendu, le layout ou le handler HTTP de ce segment.

## Contenu immédiat

Sous-dossiers :

- Aucun élément versionné direct.

Fichiers :

- `page.tsx`

## Intégration

Ce dossier est consommé par l'application `app-admin` et s'insère dans son flux runtime, build ou test.

## Contrat runtime

- La section onboarding est maintenant une supervision cross-org des `onboarding_cases`.
- Le point d'entree `Creer un client` est maintenant affiche en tete de page des qu'un utilisateur a `admin:org:write`, meme sans acces `admin:onboarding:*` ni `admin:monitoring:read`; le formulaire appelle `POST /api/v1/admin/organizations`, cree l'organisation persistante, provisionne automatiquement un premier compte client `org_admin` sur `contactEmail` via Keycloak, puis redirige vers `/clients/[orgId]/onboarding`.
- Si la creation echoue, la page remonte maintenant le message backend exact dans un toast au lieu d'un simple echec generique.
- Le lancement d'un case onboarding lui-meme ne se fait toujours pas ici: la source de verite du case BPM reste le workspace client `/clients/[orgId]/onboarding`.
