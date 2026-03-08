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

## Commande ciblee

```bash
pnpm test:e2e:landing
```
