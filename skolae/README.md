# Skolae Proposal (`praedixa-skolae`)

Mini-site Vite/React autonome pour une proposition commerciale premium `Praedixa x Skolae`.

## Intention

- parler a un collectif de decideurs Skolae, pas uniquement a un contact individuel ;
- montrer une proposition de valeur tres simple a comprendre ;
- transformer la recherche commerciale en page de conviction exploitable en call ou en suivi.

## Message canonique

- premier wedge: `couverture pedagogique multi-sites`;
- benefices a faire lire en premier: `plus de capacite securisee`, `moins d'urgences campus`, `moins de couts subis`, `plus de decisions defendables`;
- promesse: `securiser la capacite a 4-12 semaines -> proteger l'execution a 3-14 jours -> comparer 3 a 5 leviers reels -> lancer la meilleure action -> prouver l'impact`;
- extension de valeur premium: `mieux relier modules, entreprises et debouches par programme et par campus`;
- demarrage en lecture seule sur exports ;
- pas un outil de planning, pas un CRM, pas un dashboard supplementaire ;
- pilote recommande: `8 semaines`, `1 a 3 campus`, gouvernance `Ops + Finance + DSI`.

## Commandes

```bash
npm install
npm run dev
npm run build
npm run test
```

## Deploiement Scaleway

Le mini-site suit maintenant la meme methode que `centaurus`, avec un conteneur Nginx protege par identifiant/mot de passe.

Sous-domaine par defaut:

```bash
skolae.praedixa.com
```

Workflow:

```bash
pnpm run scw:bootstrap:skolae
BASIC_AUTH_USERNAME='<identifiant>' BASIC_AUTH_PASSWORD='<mot-de-passe>' pnpm run scw:configure:skolae
pnpm run scw:deploy:skolae
```

Variables utiles:

- `SKOLAE_HOSTNAME` pour changer le sous-domaine cible avant bootstrap.
- `BASIC_AUTH_USERNAME` et `BASIC_AUTH_PASSWORD` pour proteger l'acces.
- `SCW_DEPLOY_ALLOW_DIRTY=1` seulement si vous assumez explicitement un deploy avec workspace non propre.

## Structure

- `src/content/skolaeMessaging.ts`: source unique du fond, des preuves et du CTA.
- `src/components/`: sections editoriales et interaction legere.
- `src/test/`: smoke tests de contenu.
- `public/`: assets statiques minimaux, dont le favicon.
- `docs/`: brief de recherche et cadrage narratif.
- `Dockerfile.scaleway`, `nginx.conf`, `docker-entrypoint.sh`: packaging deploiement protege pour Scaleway.

## Notes de design

- direction visuelle "academic boardroom": base encre/limestone, accent teal unique, typographie sans serif premium ;
- layout asymetrique sur desktop, mono-colonne stricte sur mobile ;
- motion discrete et utile: transitions de reveal, switcher parties prenantes, CTA magnetique ;
- aucune image stock. Le site s'appuie sur des surfaces, preuves et signaux operatoires.
