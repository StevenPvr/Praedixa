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

## Lire ensuite

- `clients/README.md`
- `coverage-harness/README.md`
- `demandes-contact/README.md`
- `journal/README.md`
- `parametres/README.md`
