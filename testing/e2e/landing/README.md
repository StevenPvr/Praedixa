# testing/e2e/landing

Specs Playwright de la landing publique.

## Ce qui est teste ici

- navigation et liens critiques;
- pages legales;
- overflow et regressions visuelles simples;
- SEO et maillage visible;
- parcours formulaire ou CTA publics.

## Bonnes pratiques

- Privilegier des assertions robustes sur le contenu utile, les roles et les URLs.
- Si un composant est reutilise avec `@praedixa/ui`, verifier aussi si le changement doit etre couvre ailleurs.
- Quand une interaction disparait cote landing, supprimer ou adapter la spec correspondante dans le meme changement.
- Quand les libelles canoniques du formulaire pilote changent (secteurs, roles, horizons), mettre a jour la spec Playwright dans le meme diff pour rester aligne avec les dictionnaires localises.
- Quand la navigation sectorielle de la home change, mettre a jour `hero-industry-links.spec.ts` dans le meme diff pour rester aligne avec les liens et libelles publies.

## Commande ciblee

```bash
pnpm test:e2e:landing
```
