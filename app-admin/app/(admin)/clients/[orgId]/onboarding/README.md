# Onboarding

## Rôle

Ce dossier matérialise un segment de route Next.js. Les fichiers `page.tsx` définissent le rendu, le layout ou le handler HTTP de ce segment.

## Contenu immédiat

Sous-dossiers :

- `__tests__/`

Fichiers :

- `access-model-task-fields.tsx`
- `access-model-task-sections.tsx`
- `case-list-card.tsx`
- `case-workspace-card.tsx`
- `case-workspace-aside.tsx`
- `case-workspace-header.tsx`
- `case-workspace-sections.tsx`
- `create-case-card.tsx`
- `onboarding-case-actions.shared.ts`
- `onboarding-page-model-helpers.ts`
- `onboarding-step-shell.tsx`
- `page.tsx`
- `page-model.ts`
- `source-activation-task-fields.tsx`
- `task-action-editors.tsx`
- `task-action-card.tsx`
- `task-action-form-fields.tsx`
- `task-action-payload.ts`
- `use-onboarding-case-actions.ts`
- `use-onboarding-case-invite-actions.ts`
- `use-onboarding-case-lifecycle-actions.ts`
- `use-onboarding-case-task-actions.ts`
- `use-onboarding-page-model.ts`
- `__tests__/page.test.tsx`

## Intégration

Ce dossier est consommé par l'application `app-admin` et s'insère dans son flux runtime, build ou test.

## Contrat runtime

- `page.tsx` lit maintenant le domaine persistant `onboarding_cases` au lieu du vieux suivi thin-slice `onboarding_states`.
- `page.tsx` est maintenant surtout presentational; l'orchestration des fetchs, permissions, mutations lifecycle et invitations securisees vit dans `use-onboarding-page-model.ts`.
- La page suit maintenant un assistant multi-etapes en plein ecran: `Dossier`, `Acces`, `Sources`, `Parametrage`, `Activation`.
- `use-onboarding-page-model.ts` orchestre surtout la lecture, la selection de case, le formulaire de creation et les derivations de page; le bloc mutations runtime du workspace est maintenant compose de trois modules specialises: taches (`use-onboarding-case-task-actions.ts`), invitations (`use-onboarding-case-invite-actions.ts`) et lifecycle (`use-onboarding-case-lifecycle-actions.ts`).
- Le hook garde maintenant ses derives locales dans de petits helpers purs pour la selection de dossier, l'etat des utilisateurs, le payload de creation et les options d'integration, sans changer le contrat retourne.
- `task-action-card.tsx` ne porte plus une presentation "back-office cockpit"; il sert maintenant des cartes de tache simples, tres lisibles, affichees uniquement dans l'etape courante.
- `create-case-card.tsx` sert maintenant d'ecran de demarrage du dossier, avec resume compact des sources/modules/packs choisis.
- `case-list-card.tsx` sert d'ecran de choix du dossier actif, avant d'entrer dans les etapes de l'assistant.
- `source-activation-task-fields.tsx` porte les champs brouillon et le resume d'evidence pour les activations API et les imports CSV/TSV/XLSX relies au medallion.
- `access-model-task-fields.tsx` garde maintenant surtout les helpers de payload/evidence et la gestion locale des destinataires; les gros blocs de rendu securite/invitations vivent dans `access-model-task-sections.tsx`.
- `case-workspace-card.tsx` et `case-workspace-sections.tsx` filtrent maintenant les taches par etape et n'affichent qu'un seul sous-ensemble du workflow a la fois, avec un panneau lateral de contexte, blocages et historique.
- `onboarding-step-shell.tsx` porte maintenant la navigation de l'assistant, le resume de l'etape courante et les actions `precedente / suivante`, pour garder `page.tsx` centree sur l'orchestration.
- `case-workspace-header.tsx` et `case-workspace-aside.tsx` isolent respectivement le resume du dossier et les panneaux de blocages / historique, pour eviter de reconcentrer tout le wizard dans un seul fichier.
- L'assistant appelle toujours `GET/POST /api/v1/admin/organizations/:orgId/onboarding/cases`, `GET /api/v1/admin/organizations/:orgId/onboarding/cases/:caseId`, `POST /api/v1/admin/organizations/:orgId/onboarding/cases/:caseId/readiness/recompute`, `POST /api/v1/admin/organizations/:orgId/onboarding/cases/:caseId/cancel`, `POST /api/v1/admin/organizations/:orgId/onboarding/cases/:caseId/reopen`, `POST /api/v1/admin/organizations/:orgId/onboarding/cases/:caseId/tasks/:taskId/save` puis `POST /api/v1/admin/organizations/:orgId/onboarding/cases/:caseId/tasks/:taskId/complete`.
- Les taches `activate-api-sources` et `configure-file-sources` pilotent maintenant aussi des actions runtime reelles: `POST /api/v1/admin/organizations/:orgId/onboarding/cases/:caseId/tasks/:taskId/api-sources/activate` pour tester une connexion existante et declencher la premiere sync, puis `POST /api/v1/admin/organizations/:orgId/onboarding/cases/:caseId/tasks/:taskId/file-sources/upload` pour deposer un CSV/TSV/XLSX, l'enregistrer sous `data/<org>/<domain>/...` et lancer l'orchestrateur medallion.
- Le detail rendu cote admin n'affiche plus tout en meme temps: il repartit le dossier, les taches, les blocages et la timeline par ecrans successifs pour eviter la superposition verticale.
- Quand `POST /api/v1/admin/organizations/:orgId/onboarding/cases` echoue, le workspace affiche maintenant le message backend exact dans un toast plutot qu'un fallback generique.
- Chaque tache expose maintenant un formulaire operateur simplifie, avec brouillon, preuves et lien vers la surface admin reelle a utiliser (`equipe` ou `config`) quand le travail vit deja ailleurs dans le produit.
- L'assistant onboarding peut maintenant operer directement une partie du control plane sources sans quitter la page: choix d'une connexion API existante, activation du premier cycle, depot CSV/TSV/XLSX et lecture du statut `sourceActivations` persiste par tache.
- En developpement local, la lecture des connexions integrations suit le meme gate que `/config`: tant que `NEXT_PUBLIC_ADMIN_INTEGRATIONS_WORKSPACE=1` n'est pas active avec un vrai runtime `app-connectors`, l'onboarding reste fail-close pour les options API et n'emet plus de `500` garantis sur `/integrations/connections`.
- L'etape `access-model` pilote maintenant de vraies invitations securisees via `POST /api/v1/admin/organizations/:orgId/users/invite`, puis persiste l'evidence d'initialisation cote identite (`inviteRecipients`, `invitedAt`, `invitedUserId`, statuts `sent/failed`) dans le brouillon onboarding.
- L'assistant affiche maintenant aussi la preuve provider-side associee a chaque invitation (`en attente`, `accepte`, `livraison prouvee`, `bounce`, `echec`) a partir du dernier event Resend persistant rattache a ce recipient.
- Aucun mot de passe n'est expose cote admin dans ce flux: l'utilisateur client recoit un lien d'activation Keycloak et definit lui-meme son mot de passe.
- L'entete de l'assistant expose aussi les commandes lifecycle `Recalculer`, `Annuler` et `Rouvrir`, pour operer un dossier dans la duree sans sortir du parcours onboarding.
- Les boutons `Completer` n'apparaissent que pour les taches actuellement actionnables cote Camunda; le front ne simule jamais une completion locale hors projection workflow.
- L'assistant ne charge plus `/users` pour un profil depourvu de `admin:users:*`; responsable, responsable metier et envoi d'invitations restent alors explicitement degradés au lieu de remplir la console avec des `403`.
- Quand le detail d'un case est relu alors que Camunda local est indisponible, l'API renvoie maintenant le bundle persistant avec un marqueur `metadataJson.projectionSync.status = "stale"` pour garder le workspace lisible sans `503` initial.
- Les composants formulaire et workspace (`task-action-form-fields.tsx`, `task-action-card.tsx`, `access-model-task-sections.tsx`, `create-case-card.tsx`, `case-list-card.tsx`, `case-workspace-sections.tsx`, `page.tsx`) suivent maintenant les memes conventions Sonar que les autres dossiers admin: props explicites et immuables, labels relies aux controles via `htmlFor/id`, ternaires JSX sensibles extraits en variables, et handlers async relies sans wrapper `void`.
- `page.tsx` derive maintenant `hasPagination` avant le rendu au lieu de porter directement `total > 20` dans le JSX, pour garder une branche de pagination positive et explicite.
