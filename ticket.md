# Symphony Ticket Guide

Ce document sert a une personne qui ne connait ni Praedixa, ni le monorepo, ni Symphony, mais qui doit rediger un ticket Linear executable par agent.

L'objectif n'est pas seulement de fournir un template markdown. L'objectif est de donner assez de contexte pour que le ticket soit bien cadre des la creation et qu'un run Symphony puisse travailler seul sans improviser l'architecture, le perimetre ou la verification.

## Ce qu'est Praedixa

Praedixa est une plateforme SaaS multi-tenant de pilotage de capacite. Le produit couvre trois grandes surfaces visibles:

- `app-landing`: site marketing public
- `app-webapp`: application client
- `app-admin`: back-office super-admin

Le backend applicatif expose aux utilisateurs est:

- `app-api-ts`: API TypeScript/Node

Le moteur Python est reserve au data plane:

- `app-api`: ingestion, medallion pipeline, batch jobs, ML, forecasting, qualite data

Le repo contient aussi:

- `packages/shared-types`: contrats/types partages
- `packages/ui`: composants UI partages
- `testing/e2e`: tests Playwright
- `scripts`: gates, deploiement, tooling local
- `docs`: architecture, securite, runbooks, PRD

## Regle d'architecture la plus importante

Quand tu rediges un ticket, suppose que cette regle est absolue:

- TypeScript/Node/Next.js pour tout ce qui parle a un utilisateur, un operateur, une app web, un panneau admin, une API produit, un auth flow ou un connecteur HTTP
- Python uniquement pour le data plane, le batch, la medallion pipeline, la data science et le ML

Donc:

- un ticket UI, webapp, admin, API produit ou auth ne doit pas pousser la logique vers Python
- un ticket pipeline/ML ne doit pas demander de deplacer l'orchestration metier produit dans les apps Node

## Ce qu'est Symphony

Symphony est le service interne d'automation agentique du repo.

Concretement:

1. il lit `WORKFLOW.md`
2. il poll Linear
3. il prend les tickets en etat actif
4. il cree un workspace isole par issue
5. il lance `codex app-server` dans ce workspace
6. il travaille a partir de la description du ticket
7. il s'arrete quand le ticket atteint un handoff sur ou sort des etats actifs

Conclusion:

- un ticket flou produit un run flou
- un ticket trop large ouvre une derive de scope
- un ticket sans verification laisse l'agent deviner le done

Le ticket est donc un contrat d'execution, pas juste un pense-bete humain.

## Comment penser un ticket pour Symphony

Un bon ticket doit permettre a quelqu'un qui ne connait pas le chantier de repondre tout de suite a ces questions:

- quel est le probleme exact
- quel est le resultat attendu
- qu'est-ce qui est inclus
- qu'est-ce qui est exclu
- quelles surfaces du repo sont plausiblement touchees
- quelles contraintes ne doivent jamais etre violees
- comment verifier que le travail est termine

Si l'une de ces reponses manque, Symphony risque de:

- prendre le mauvais sous-systeme
- choisir la mauvaise stack
- etendre le scope
- livrer quelque chose de localement plausible mais pas acceptable pour le repo

## Regles de redaction

- Le titre doit etre imperatif, actionnable et borne.
- Tous les champs `Obligatoire` doivent etre remplis avant passage en etat actif.
- Si une information manque, ecrire `INCONNU` ou `A CONFIRMER`.
- Ne jamais laisser un silence qui oblige l'agent a inventer.
- Le ticket doit decrire un travail executable, pas un theme de reflexion.
- Une verification attendue doit toujours exister.
- Le hors scope doit etre explicite.
- Les references doivent pointer vers de vrais fichiers ou docs du repo quand ils existent.

## Types de tickets acceptables

Symphony est a l'aise sur:

- bug borne avec symptome et comportement attendu
- endpoint/route/page/composant clairement definis
- refactor borne avec but explicite
- industrialisation d'une surface deja partiellement existante
- ajout de tests ou de garde-fous structurels
- documentation technique distribuee alignee sur le code

Symphony est mauvais si le ticket ressemble a:

- "refondre toute la console admin"
- "ameliorer l'onboarding"
- "faire le PRD d'un sujet"
- "voir pourquoi c'est lent partout"
- "nettoyer l'architecture"

Dans ces cas, il faut d'abord decouper en tickets plus petits.

## Ce qu'il faut absolument mentionner

Ces points sont les plus importants a fournir, meme si le reste du ticket est court:

- surface principale touchee
- comportement final attendu
- verification exacte
- contraintes de securite ou de droits si pertinentes
- hors scope

Exemples de contraintes critiques dans ce repo:

- fail-close plutot que fallback silencieux
- ne pas rouvrir une surface encore stubbee
- ne pas casser les checks auth/permission existants
- mettre a jour la doc touchee dans le meme changement
- ne pas introduire un alias legacy ou une compatibilite temporaire inutile

## Structure exacte du ticket

Copier-coller exactement cette structure dans la description Linear:

```md
## Contexte

Obligatoire.
Explique le probleme metier ou technique en 3 a 10 lignes maximum.

## Objectif

Obligatoire.
Une phrase claire sur le resultat attendu a la fin du ticket.

## Perimetre

Obligatoire.

- Inclus:
- Inclus:
- Exclu:
- Exclu:

## Livrable attendu

Obligatoire.
Decris concretement ce qui doit exister a la fin.
Exemples: route, composant, page, migration, test, document, script, refactor borne.

## Critères d'acceptation

Obligatoire.

- [ ] Critere 1 observable
- [ ] Critere 2 observable
- [ ] Critere 3 observable

## Contraintes

Obligatoire.

- Contrainte technique:
- Contrainte securite:
- Contrainte produit:
- Contrainte performance:

## Surfaces potentiellement touchees

Obligatoire.

- `app-...`
- `packages/...`
- `docs/...`

## Verification attendue

Obligatoire.

- Commande:
- Commande:
- Test manuel:

## Hors scope explicite

Obligatoire.

- Hors scope 1
- Hors scope 2

## Risques ou dependances

Obligatoire.

- Risque ou dependance 1
- Risque ou dependance 2

## References

Optionnel mais fortement recommande.

- URL / doc / fichier
- URL / doc / fichier
```

## Comment remplir chaque section

### `Contexte`

Dire ce qui casse ou ce qui manque aujourd'hui.

Bon exemple:

- "La page admin `/clients/[orgId]/donnees` appelle encore un endpoint stub et reste en `503` alors qu'une lecture persistante existe deja."

Mauvais exemple:

- "Le module donnees doit etre ameliore."

### `Objectif`

Donner un resultat mesurable, pas une intention vague.

Bon exemple:

- "Rendre le journal d'ingestion admin operable sur persistance reelle sans rouvrir les autres surfaces `donnees` encore en stub."

Mauvais exemple:

- "Faire mieux."

### `Perimetre`

Dire ce que l'agent a le droit de faire et ce qu'il ne doit surtout pas embarquer.

Toujours ecrire au moins:

- deux points inclus
- deux points exclus

### `Livrable attendu`

Dire ce qui doit exister a la fin dans le repo ou dans le comportement.

Exemples:

- un endpoint persistant
- une page qui affiche une vraie lecture SQL
- un garde-fou de typecheck
- une doc distribuee mise a jour

### `Critères d'acceptation`

Les criteres doivent etre observables sans interpretation humaine large.

Bon exemple:

- "[ ] `GET /api/v1/admin/organizations/:orgId/ingestion-log` ne renvoie plus un stub `503`"

Mauvais exemple:

- "[ ] c'est mieux"

### `Contraintes`

Toujours penser a ces quatre axes:

- technique
- securite
- produit
- performance

Si un axe n'a pas de contrainte forte, ecrire quand meme:

- `Contrainte performance: aucune contrainte particuliere connue`

### `Surfaces potentiellement touchees`

Tu n'as pas besoin d'etre exhaustif a 100 %, mais tu dois aider Symphony a partir dans la bonne zone du repo.

Exemples:

- `app-api-ts/src/routes.ts`
- `app-admin/app/(admin)/clients/[orgId]/donnees/page.tsx`
- `packages/shared-types/...`
- `docs/...`

### `Verification attendue`

C'est la partie la plus importante avec l'objectif.

Toujours donner:

- au moins deux commandes
- un test manuel ou un comportement navigateur/API a verifier

Exemples frequents dans ce repo:

- `pnpm --dir app-api-ts exec tsc -p tsconfig.json --noEmit`
- `pnpm --dir app-admin exec tsc -p tsconfig.json --noEmit`
- `pnpm --dir app-api-ts test -- 'src/__tests__/...'`
- `pnpm --dir app-admin test -- 'app/.../__tests__/...'`
- `pnpm test:e2e:admin`
- `cd app-api && pytest -q`

### `Hors scope explicite`

Sans cette section, l'agent peut elargir le chantier.

Exemples:

- "ne pas refaire tout le design"
- "ne pas rouvrir les surfaces voisines encore en stub"
- "ne pas migrer la logique vers Python"

### `Risques ou dependances`

Mentionner ce qui peut bloquer ou obliger a une validation prudente:

- schema de base a verifier
- permission model sensible
- service externe optionnel
- token/credential requis
- doc metier encore incomplete

## Checklist avant de creer le ticket

Avant de passer le ticket en etat actif, verifier:

- [ ] le titre est actionnable
- [ ] l'objectif est unique
- [ ] le perimetre est borne
- [ ] le hors scope est ecrit
- [ ] les criteres d'acceptation sont testables
- [ ] au moins deux verifications sont nommees
- [ ] les surfaces touchees sont plausibles
- [ ] la stack cible respecte la frontiere TypeScript/Node vs Python

## Exemple complet

```md
## Contexte

La page admin `/clients/[orgId]/donnees` appelle encore un endpoint stub pour le journal d'ingestion alors qu'une lecture persistante existe deja en base. Le panneau reste donc ferme en `503` meme quand les donnees sont disponibles.

## Objectif

Rendre le journal d'ingestion admin operable sur persistance reelle sans rouvrir les autres surfaces `donnees` encore en stub.

## Perimetre

- Inclus:
- Brancher `GET /api/v1/admin/organizations/:orgId/ingestion-log` sur la lecture SQL persistante
- Rouvrir uniquement le panneau ingestion cote admin
- Exclu:
- Reindustrialiser datasets
- Reindustrialiser medallion quality report

## Livrable attendu

Un endpoint admin persistant, une page admin qui affiche le journal d'ingestion reel, les tests et la documentation mis a jour.

## Critères d'acceptation

- [ ] `GET /api/v1/admin/organizations/:orgId/ingestion-log` ne renvoie plus un stub `503`
- [ ] la page admin affiche le journal reel quand des lignes existent
- [ ] les autres panneaux non industrialises restent fail-close

## Contraintes

- Contrainte technique: ne pas recoupler le workspace `donnees` entier a des endpoints encore non persistants
- Contrainte securite: lecture org-scopee stricte
- Contrainte produit: ne pas changer le wording approuve sans besoin
- Contrainte performance: pas de N+1 evident sur la lecture du journal

## Surfaces potentiellement touchees

- `app-api-ts/src/services/admin-backoffice.ts`
- `app-api-ts/src/routes.ts`
- `app-admin/app/(admin)/clients/[orgId]/donnees/page.tsx`
- `app-admin/lib/runtime/...`
- `docs/...`

## Verification attendue

- Commande: `pnpm --dir app-api-ts exec tsc -p tsconfig.json --noEmit`
- Commande: `pnpm --dir app-admin exec tsc -p tsconfig.json --noEmit`
- Test manuel: ouvrir la page admin `donnees` d'un org avec historique d'ingestion

## Hors scope explicite

- Refaire le design complet de la page
- Ajouter une edition des runs d'ingestion

## Risques ou dependances

- Risque ou dependance 1: schema reel `ingestion_log` a verifier avant le join
- Risque ou dependance 2: gate runtime admin a scinder proprement

## References

- `tasks/todo.md`
- `docs/ARCHITECTURE.md`
```
