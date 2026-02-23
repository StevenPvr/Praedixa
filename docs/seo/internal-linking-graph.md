# Internal Linking Graph (SERP 30)

## But

Passer d'un maillage "voisinage" à un maillage editorial volontaire:

- chaque page SERP pousse 3 URLs business-critical,
- chaque lien est choisi selon l'intention de recherche,
- le graphe est stable et auditable (pas de selection aleatoire).

Implementation source of truth:

- `app-landing/lib/content/serp-resources-fr.ts`
- constante `SERP_INTERNAL_LINK_GRAPH_BY_ID`

## Graphe cible

Format: `id -> [id, id, id]` (liens internes prioritaires)

- `1 -> [4, 5, 16]`
- `2 -> [6, 10, 20]`
- `3 -> [1, 6, 25]`
- `4 -> [10, 11, 12]`
- `5 -> [1, 6, 16]`
- `6 -> [8, 20, 26]`
- `7 -> [6, 21, 25]`
- `8 -> [6, 25, 26]`
- `9 -> [13, 14, 28]`
- `10 -> [11, 12, 16]`
- `11 -> [10, 20, 24]`
- `12 -> [6, 10, 13]`
- `13 -> [9, 14, 23]`
- `14 -> [15, 26, 23]`
- `15 -> [20, 23, 14]`
- `16 -> [24, 23, 26]`
- `17 -> [21, 22, 20]`
- `18 -> [6, 20, 24]`
- `19 -> [20, 23, 16]`
- `20 -> [18, 19, 15]`
- `21 -> [6, 7, 27]`
- `22 -> [27, 16, 25]`
- `23 -> [26, 24, 30]`
- `24 -> [16, 23, 26]`
- `25 -> [3, 7, 20]`
- `26 -> [27, 24, 6]`
- `27 -> [26, 23, 16]`
- `28 -> [29, 9, 14]`
- `29 -> [28, 26, 6]`
- `30 -> [23, 16, 5]`

## Regles d'ancrage

- Toujours utiliser une ancre descriptive.
- Inclure le concept cible dans l'ancre.
- Interdire les ancres "cliquez ici" / "en savoir plus".

## Regles par page

- Bloc "Maillage interne recommande" visible sur chaque page SERP.
- Minimum 3 liens internes prioritaires.
- Fallback controlle vers une selection proche si la page n'est pas dans la matrice.

## QA

- Aucun lien interne vers URL non canonique.
- Aucun lien en redirection.
- Aucun lien casse.
