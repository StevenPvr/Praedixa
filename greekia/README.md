# Greekia Proposal (`praedixa-greekia`)

Mini-site Vite/React autonome pour une proposition commerciale premium `Praedixa x Greekia`.

## Intention

- parler a un collectif de decideurs Greekia, pas a un seul contact ;
- formuler une proposition de valeur tres nette sur les douleurs reseau / marge / execution ;
- matcher la direction artistique publique Greekia sans cloner leur site ;
- transformer la recherche commerciale en page de conviction utilisable en call ou en suivi.

## Message canonique

- entree commerciale: `audit sur historique en 5 jours ouvres`, en lecture seule ;
- wedge principal: `objectiver les services et les sites ou Greekia perd le plus entre sur-preparation, sous-effectif, rupture et correction tardive` ;
- benefices a faire lire en premier: `marge protegee`, `fraicheur mieux tenue`, `rushs plus lisibles`, `reseau mieux accompagne`, `ROI defendable` ;
- promesse: `audit 5 jours -> abonnement -> boucle DecisionOps -> preuve mensuelle service apres service` ;
- extension premium: `ouvertures et ramp-up de nouveaux points de vente` ;
- demarrage sur exports existants, sans remplacement caisse / planning / ordering.

## Commandes

```bash
npm install
npm run dev
npm run build
npm run test
```

## Deploiement Scaleway

Le mini-site suit le meme mecanisme que `skolae`, avec un conteneur Nginx protege par identifiant / mot de passe.

Sous-domaine par defaut:

```bash
greekia.praedixa.com
```

Workflow:

```bash
pnpm run scw:bootstrap:greekia
BASIC_AUTH_USERNAME='<identifiant>' BASIC_AUTH_PASSWORD='<mot-de-passe>' pnpm run scw:configure:greekia
pnpm run scw:deploy:greekia
```

Variables utiles:

- `GREEKIA_HOSTNAME` pour changer le sous-domaine cible avant bootstrap.
- `BASIC_AUTH_USERNAME` et `BASIC_AUTH_PASSWORD` pour proteger l'acces.
- `SCW_BOOTSTRAP_DNS_MODE=external-pending` par defaut: le bootstrap fait le binding container et affiche le CNAME attendu si le DNS est gere hors Scaleway.
- `SCW_BOOTSTRAP_DNS_MODE=external-verified` pour exiger qu'un CNAME public existe deja.
- `SCW_BOOTSTRAP_DNS_MODE=scaleway-managed` seulement si la zone DNS est vraiment geree dans Scaleway.
- `SCW_DEPLOY_ALLOW_DIRTY=1` seulement si vous assumez explicitement un deploy avec workspace non propre.

## Structure

- `src/content/greekiaMessaging.ts`: source unique du fond, des preuves et du CTA.
- `src/components/`: sections editoriales et interface.
- `src/components/PraedixaLogo.tsx`: copie synchronisee du logo approuve Praedixa pour garder un build autonome deployable.
- `src/test/`: smoke tests de contenu.
- `docs/`: brief de cadrage narratif et visuel.
- `Dockerfile.scaleway`, `nginx.conf`, `docker-entrypoint.sh`: packaging deploiement protege pour Scaleway.

## Notes de design

- hero bleu cobalt, corps de page creme chaud, accent safran ;
- typographie display condensee pour rester proche de l'energie Greekia ;
- alternance de surfaces creme et bleu pour retrouver l'univers de marque ;
- pas d'actifs Greekia copies localement: la DA est reinterpretée pour un site Praedixa.
