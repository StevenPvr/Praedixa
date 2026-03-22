# `@praedixa/api-hooks`

Coeur partage des hooks React de fetch/mutation utilises par `app-admin` et `app-webapp`.

## Rôle

- centraliser la logique commune `useApiGet`, `useApiGetPaginated`, `useApiPost` et `useApiPatch`
- garder les apps responsables de leurs adapters locaux: client HTTP, reauth et eventuelle recuperation de token
- reduire la duplication sans imposer d'import croise entre `app-admin` et `app-webapp`

## Contrat

- le package n'embarque pas de logique produit
- les wrappers locaux dans les apps conservent les signatures publiques attendues par les pages et les tests
- la redirection `401` reste configuree depuis l'app consommatrice, mais les hooks GET partages purgent eux-memes leur state avant cette reauth pour rester fail-close meme en polling silencieux
- les hooks de mutation reset leur etat (`data`, `error`, `loading`) quand l'URL cible change, afin d'eviter qu'une ressource precedente pollue la suivante
