# Presentations Clients

Ce dossier regroupe les mini-sites de presentations clients/prospects du repo.

## Contenu

- `skolae/`
- `greekia/`
- `centaurus/`
- `tests/`

## Notes

- les scripts root `pnpm run scw:bootstrap:*`, `pnpm run scw:configure:*` et `pnpm run scw:deploy:*` restent l'interface de deploiement canonique ;
- les builds Scaleway pointent maintenant vers `marketing/presentations-clients/<nom>/` ;
- les tests des mini-sites sont centralises sous `marketing/presentations-clients/tests/<nom>/` ;
- `centaurus/` reste un depot imbrique distinct, simplement range sous ce parent commun.
