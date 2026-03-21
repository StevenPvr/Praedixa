# `app/(admin)/` - Console authentifiee

Groupe de routes protegees du back-office. Le `layout.tsx` ne fait qu'injecter `AdminShell`; le controle d'acces reel est centralise dans `lib/auth/admin-route-policies.ts`.

## Routes presentes

| Route                | Fichier                     | Role reel                                    |
| -------------------- | --------------------------- | -------------------------------------------- |
| `/`                  | `page.tsx`                  | accueil admin                                |
| `/clients`           | `clients/page.tsx`          | liste des organisations                      |
| `/clients/[orgId]/*` | `clients/[orgId]/...`       | workspace detaille par organisation          |
| `/demandes-contact`  | `demandes-contact/page.tsx` | traitement des demandes entrantes            |
| `/journal`           | `journal/page.tsx`          | consultation du journal admin                |
| `/parametres`        | `parametres/page.tsx`       | reglages plateforme visibles dans la console |
| `/coverage-harness`  | `coverage-harness/page.tsx` | route interne de couverture/QA               |

## Shell reel

- `AdminShell` monte `AdminSidebar`, `AdminTopbar`, `CommandPalette` et `RouteProgressBar`
- la sidebar et la palette derivent de la meme registry de policies que les controles d'acces
- le shell affiche un etat de verification de permissions tant que l'utilisateur courant charge
- si la page est connue mais non autorisee, le shell rend un panneau `Acces restreint`
- `/demandes-contact` depend d'une lecture paginee persistante `GET /api/v1/admin/contact-requests` et d'une mutation persistante `PATCH /api/v1/admin/contact-requests/:requestId/status`; aucun payload demo/stub n'est accepte sur cette surface
- `/journal` depend d'une lecture paginee persistante `GET /api/v1/admin/audit-log`, filtree par `action`; aucun payload demo/stub n'est accepte sur cette surface read-only
- `/` depend aussi maintenant d'un `GET /api/v1/admin/conversations/unread-count` persistant; le badge messages/inbox n'appelle plus un stub `503`
- `/parametres` sert maintenant a la fois de supervision cross-org des `onboarding_cases` et de point d'entree operable pour `Nouveau client`: le formulaire cree une organisation persistante via `POST /api/v1/admin/organizations`, provisionne automatiquement le premier acces client sur `contactEmail`, puis redirige vers `/clients/[orgId]/onboarding`

## Lire ensuite

- `clients/README.md`
- `coverage-harness/README.md`
- `demandes-contact/README.md`
- `journal/README.md`
- `parametres/README.md`
