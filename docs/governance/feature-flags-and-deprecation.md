# Politique Feature Flags et Deprecation

Ce document fixe la discipline minimum a respecter quand une nouvelle feature ou une evolution de contrat doit coexister avec l'existant.

## 1. Feature flags

- Toute feature incomplete, sensible ou reversible doit etre derriere un flag explicite.
- Un flag doit avoir un owner, un scope, une date cible de suppression et un critere de sortie.
- Un flag ne doit pas modifier silencieusement les permissions ou le scoping tenant/site.
- Un flag UI doit etre double d'un garde-fou server-side si la surface a un impact data, auth ou write-back.
- Les flags temporaires ne doivent pas devenir des modes legacy implicites.

## 2. Compatibilite de contrats

- Une route publique ou un payload partage ne doit pas casser les consumers existants sans versioning ou fenetre de transition documentee.
- Tout changement de schema doit indiquer s'il est additive, breaking, ou seulement interne.
- Les types partages, le runtime et la documentation doivent evoluer dans le meme changement.
- Les events internes critiques doivent garder un envelope stable meme si le detail du payload evolue.

## 3. Deprecation

- Toute deprecation doit annoncer la surface impactee, la date cible, le remplaçant et le plan de migration.
- Une surface marquee obsolete doit etre referencee dans la doc la plus proche du code concerne.
- Une suppression ne doit pas partir tant que les tests, runbooks et docs dependants n'ont pas ete mis a jour.
- Les routes, pages ou scripts legacy encore relies a un mode demo ou fallback doivent etre isoles ou explicitement documentes.

## 4. Definition of done

- Le flag est observable, testable et a une sortie planifiee.
- La compatibilite du contrat est documentee et verifiee.
- La suppression de l'ancien chemin est planifiee, pas repoussee sans owner.
