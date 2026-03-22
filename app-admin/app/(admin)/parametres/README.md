# Parametres

## Rôle

Ce dossier matérialise un segment de route Next.js. Les fichiers `page.tsx` définissent le rendu, le layout ou le handler HTTP de ce segment.

## Contenu immédiat

Sous-dossiers :

- Aucun élément versionné direct.

Fichiers :

- `page.tsx`
- `parametres-page-model.tsx`
- `parametres-sections.tsx`

## Intégration

Ce dossier est consommé par l'application `app-admin` et s'insère dans son flux runtime, build ou test.

## Contrat runtime

- La section onboarding est maintenant une supervision cross-org des `onboarding_cases`.
- `page.tsx` est maintenant surtout une page de composition; le state, les permissions, la creation client et les derives de section vivent dans `parametres-page-model.tsx`, et les panneaux dans `parametres-sections.tsx`.
- L'onglet initial ne doit plus etre choisi avant l'hydratation des permissions: `parametres-page-model.tsx` attend des droits resolves avant de fixer la section par defaut, afin qu'un profil onboarding-only n'atterrisse plus sur `config`.
- Le point d'entree `Creer un client` est maintenant affiche en tete de page des qu'un utilisateur a `admin:org:write`, meme sans acces `admin:onboarding:*` ni `admin:monitoring:read`; le formulaire appelle `POST /api/v1/admin/organizations`, cree l'organisation persistante, provisionne automatiquement un premier compte client `org_admin` sur `contactEmail` via Keycloak, declenche l'invitation d'activation, puis redirige vers `/clients/[orgId]/onboarding`.
- Le toast de creation ne pretend plus que l'email est deja livre: il annonce maintenant une invitation d'activation initialisee, avec preuve provider encore en attente tant que le webhook Resend n'a pas confirme l'issue.
- Si la creation echoue, la page remonte maintenant le message backend exact dans un toast au lieu d'un simple echec generique.
- Le lancement d'un case onboarding lui-meme ne se fait toujours pas ici: la source de verite du case BPM reste le workspace client `/clients/[orgId]/onboarding`.
- `create-client-card.tsx` et `parametres-sections.tsx` exposent maintenant des contrats de props dedies en `Readonly`, avec guards et contenus derives hors JSX pour rester alignes avec Sonar.
