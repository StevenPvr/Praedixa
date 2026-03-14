# `lib/i18n/`

Infrastructure de localisation du landing.

## Responsabilites

- definir les locales supportees (`fr`, `en`)
- centraliser les slugs traduits
- resoudre la locale d'une requete
- charger et typer les dictionnaires
- fournir des helpers de chemin localise

## Fichiers clefs

- `locale.ts`: contrat neutre des locales supportees (`fr`, `en`) et helpers de validation
- `config.ts`: slugs, redirections legacy, `getLocalizedPath()`, et re-export du contrat de locale
- `request-locale.ts`: resolution de locale depuis pathname/headers
- `get-dictionary.ts`: chargement du dictionnaire
- `types.ts`: contrat du dictionnaire
- `dictionaries/*.ts`: decoupage de la copy par themes et langue

## Conventions

- tout nouveau slug traduit doit etre ajoute dans `config.ts`
- le contrat `Locale` doit vivre dans `locale.ts`, pas dans un module qui importe du contenu ou des redirects
- les routes legacy a rediriger passent aussi par `legacyRedirectMap`
- les anciennes URLs sectorielles sont derivees depuis `lib/content/sector-pages.ts` pour garder une seule source de verite
- les anciennes pages sectorielles ou variantes SEO retirees doivent rediriger vers la page verticale dediee la plus proche, pas vers une page generique
- les composants prennent de preference le `dict` deja charge plutot que de recharger eux-memes des modules
- la copy FR de la homepage doit rester centree sur `arbitrer plus tot -> comparer -> prouver`, sans retomber dans une liste de leviers trop large ni dans une categorie `DecisionOps` posee comme argument principal

## Tests

- `__tests__/request-locale.test.ts`
