# Internal Linking Graph (Landing SEO)

## But

Maximiser le flux interne de pertinence vers les pages business-critical
en gardant une structure simple et auditable.

## Graphe cible

1. Home locale (`/fr`, `/en`) -> liens directs vers:
   - hub ressources,
   - 5 piliers,
   - pages BOFU secteur,
   - page pilote.
2. Hub ressources (`/fr/ressources`, `/en/resources`) -> liens vers:
   - tous les piliers,
   - clusters associes,
   - pages BOFU.
3. Chaque pilier -> liens vers:
   - hub ressources,
   - 3 a 6 clusters du meme theme,
   - 1 page BOFU pertinente,
   - page pilote.
4. Chaque cluster -> liens vers:
   - pilier parent,
   - hub ressources,
   - 1 cluster voisin,
   - page pilote.
5. Chaque page BOFU -> liens vers:
   - pilier principal du secteur,
   - 1 a 2 clusters de preuve/methode,
   - page pilote.

## Regles d'ancrage

- Toujours utiliser une ancre descriptive (pas "cliquez ici").
- Inclure le concept cible dans l'ancre (ex: "calculer le cout de la sous-couverture").
- Eviter les ancres identiques sur des destinations differentes.

## Exigences par page

- Bloc "Ressources associees" de 3 a 7 liens contextuels.
- Breadcrumb visible + `BreadcrumbList` JSON-LD aligne.
- Minimum 3 liens internes pertinents par page de contenu.

## Controles QA

- Aucun lien interne vers URL non-canonique.
- Aucun lien vers URL en redirection (`301/302`).
- Aucun lien brise (`404/410/500`).
