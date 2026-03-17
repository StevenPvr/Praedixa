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
- Quand le parcours public de deploiement change de slug, d'endpoint ou de libelle, mettre a jour la spec Playwright dans le meme diff pour rester aligne avec les dictionnaires localises et l'API publique reelle.
- Le funnel public de deploiement passe maintenant par `/contact?intent=deploiement`; ne pas continuer a tester l'ancien formulaire `deployment-request`.
- Quand la section sectorielle de la home change, mettre a jour `hero-industry-links.spec.ts` dans le meme diff pour rester aligne avec les liens et libelles publies.
- Si cette section passe d'un carousel a une grille ou inversement, faire evoluer la spec vers l'ancre et les hrefs reels du layout courant au lieu de conserver des assertions sur des tabs, regions ou wrappers supprimes.
- Quand le header devient scroll-reactif, couvrir le hide/show dans `navigation.spec.ts` via des attributs stables (`data-scroll-state`, `data-scroll-surface`) plutot que d'asserter un `transform` CSS trop fragile.
- Les pages legales et la preuve d'hebergement doivent suivre le contrat public courant sur Scaleway, pas les anciens libelles Cloudflare.
- Pour les pages francaises, ne pas supposer qu'une regex ASCII matchera les accents visibles; ecrire les assertions de titre avec les caracteres reels ou des classes explicites.

## Commande ciblee

```bash
pnpm test:e2e:landing
```

Cette commande ne doit demarrer que le serveur landing via `PW_SERVER_TARGETS=landing`; ne pas relancer `webapp` ou `admin` pour une suite publique ciblee.
