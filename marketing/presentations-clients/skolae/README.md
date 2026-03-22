# Skolae Proposal (`praedixa-skolae`)

Mini-site Vite/React autonome pour une proposition commerciale premium `Praedixa x Skolae`.

Le projet est range sous `marketing/presentations-clients/skolae/` dans le monorepo.

## Intention

- parler a un collectif de decideurs Skolae, pas uniquement a un contact individuel ;
- montrer une proposition de valeur tres simple a comprendre ;
- transformer la recherche commerciale en page de conviction exploitable en call ou en suivi.

## Message canonique

- entree commerciale: `preuve sur historique gratuite en 5 jours ouvres` sur l'existant ;
- premier wedge: `objectiver les arbitrages de capacite et de continuite qui protegent la marge` ;
- benefices a faire lire en premier: `arbitrages prioritaires objectivés`, `couts caches rendus visibles`, `decisions plus defendables`, `ROI relisible` ;
- promesse: `preuve sur historique -> deploiement cible -> boucle DecisionOps -> ROI decision par decision` ;
- extension de valeur premium: `mieux relier formation, entreprises et debouches par cohortes et clusters agreges` ;
- demarrage en lecture seule sur exports ou API ;
- pas un outil de planning, pas un CRM, pas un dashboard supplementaire ;
- deploiement recommande apres preuve: `8 semaines`, `1 a 3 campus`, gouvernance `Ops + Finance + DSI`.

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

## Dependances verrouillees

- `esbuild` est force via `overrides` pour eviter qu'un binaire transitive vulnerable fasse echouer le gate supply-chain du monorepo.

## Structure

- `src/content/skolaeMessaging.ts`: source unique du fond, des preuves et du CTA.
- `src/components/`: sections editoriales et interaction legere.
- `../tests/skolae/`: smoke tests de contenu mutualises au niveau `marketing/presentations-clients/tests/`.
- `public/`: assets statiques minimaux, dont le favicon.
- `docs/`: brief de recherche et cadrage narratif.
- `Dockerfile.scaleway`, `nginx.conf`, `docker-entrypoint.sh`: packaging deploiement protege pour Scaleway.

## Notes de design

- direction visuelle "academic boardroom": base encre/limestone, accent teal unique, typographie sans serif premium ;
- layout asymetrique sur desktop, mono-colonne stricte sur mobile ;
- motion discrete et utile: transitions de reveal, switcher parties prenantes, CTA magnetique ;
- aucune image stock. Le site s'appuie sur des surfaces, preuves et signaux operatoires.
