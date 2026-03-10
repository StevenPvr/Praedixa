# `lib/i18n/`

Infrastructure de localisation du landing.

## Responsabilites

- definir les locales supportees (`fr`, `en`)
- centraliser les slugs traduits
- resoudre la locale d'une requete
- charger et typer les dictionnaires
- fournir des helpers de chemin localise

## Fichiers clefs

- `config.ts`: locales, slugs, redirections legacy, `getLocalizedPath()`
- `request-locale.ts`: resolution de locale depuis pathname/headers
- `get-dictionary.ts`: chargement du dictionnaire
- `types.ts`: contrat du dictionnaire
- `dictionaries/*.ts`: decoupage de la copy par themes et langue

## Conventions

- tout nouveau slug traduit doit etre ajoute dans `config.ts`
- les routes legacy a rediriger passent aussi par `legacyRedirectMap`
- les anciennes URLs sectorielles sont derivees depuis `lib/content/sector-pages.ts` pour garder une seule source de verite
- les anciennes pages sectorielles ou variantes SEO retirees doivent rediriger vers la page verticale dediee la plus proche, pas vers une page generique
- les composants prennent de preference le `dict` deja charge plutot que de recharger eux-memes des modules

## Tests

- `__tests__/request-locale.test.ts`
