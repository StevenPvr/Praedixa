# Vue Client

## Rôle

Ce dossier matérialise un segment de route Next.js. Les fichiers `page.tsx` définissent le rendu, le layout ou le handler HTTP de ce segment.

## Contenu immédiat

Sous-dossiers :

- `__tests__`

Fichiers :

- `vue-client-page-model.tsx`
- `vue-client-sections.tsx`
- `page.tsx`

## Intégration

Ce dossier est consommé par l'application `app-admin` et s'insère dans son flux runtime, build ou test.

## Contrat runtime

- `page.tsx` est maintenant surtout presentational; l'etat, les fetchs et les actions lifecycle vivent dans `vue-client-page-model.tsx`.
- les surfaces `organisation`, `indicateurs cles`, `facturation` et `actions rapides` sont decoupees dans `vue-client-sections.tsx`.
- La section `Facturation` ne doit lancer `orgBilling` que si l'admin courant a `admin:billing:read`; sinon la page degrade explicitement en lecture interdite au lieu d'emettre un `403` garanti.
- les props des sections locales sont explicitement `Readonly` et les branches `loading/error/content` sont calculees dans des statements dedies pour garder Sonar et le JSX alignes.
- les champs optionnels affiches comme `siteCount` passent par des booleens derives positifs (`hasSiteCount`) plutot que par des tests `!= null`, pour eviter les faux positifs Sonar sur les conditions negatiees.
- les guards de rendu et d'etat interactif passent par des booleens nommes (`hasBilling`, `lifecycleBlocked`, `suspendDisabled`, `reactivateDisabled`) plutot que par des verites implicites ou des negations inline.
- les autres numeriques optionnels affiches (`userCount`, `monthlyAmount`) suivent la meme convention via `hasUserCount` et `hasMonthlyAmount`.
