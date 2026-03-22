# Legacy Et Surfaces Fermees

- Statut: draft durable
- Owner: platform engineering + product engineering
- Derniere revue: 2026-03-21
- Source de verite:
  - `app-api/app/models/*`
  - `app-api/alembic/versions/*`
  - `app-api-ts/src/routes.ts`
  - `app-api-ts/src/services/*`
  - `app-connectors/src/*`
- Depend de:
  - `docs/cto/03-modele-de-donnees-global.md`
  - `docs/cto/07-connecteurs-et-sync-runs.md`
  - `docs/cto/11-surfaces-http-et-statut.md`
- Voir aussi:
  - `docs/DATABASE.md`
  - `docs/cto/04-schema-public-postgres.md`
  - `docs/cto/06-flux-de-donnees-applicatifs.md`
  - `docs/cto/09-runbook-exploration-bd.md`

## Objectif

Cette page sert a distinguer quatre categories que l'on confond vite dans un monorepo riche:

- `legacy`
- `en convergence`
- `fail-close volontaire`
- `operable`

Pour un CTO, cette distinction est essentielle. Elle evite de:

- surinvestir une surface qui n'est plus la trajectoire;
- croire qu'une route publique versionnee est deja active;
- prendre une cible d'architecture pour la realite runtime du jour;
- traiter une fermeture volontaire comme un bug.

## Definitions

### Legacy

Une surface `legacy` reste visible dans le schema, le code ou la doc, mais n'est plus la trajectoire principale du produit.

Indices typiques:

- coexistence avec une surface plus recente sur le meme domaine;
- references historiques dans les migrations;
- lecture encore possible, mais perimetre en retrait;
- dette de simplification explicite dans les docs ou les services.

### En convergence

Une surface `en convergence` n'est pas un legacy mort. C'est une transition reelle entre:

- une cible d'architecture deja modelisee;
- un runtime encore base sur une implementation differente.

Il faut alors documenter les deux verites en parallele.

### Fail-close volontaire

Une surface `fail-close` est volontairement fermee tant que le backend reel n'est pas industrialise ou suffisamment sur.

Ce n'est pas un stub permissif. C'est un garde-fou produit et securite.

### Operable

Une surface `operable` est active, persistante ou calculable reellement, et reliee a un chemin runtime exploitable de bout en bout.

## Matrice de classification

| Surface                                                                                                                                                                                | Categorie principale                         | Pourquoi                                                                                                                                                                                                                                                                       | Action CTO recommandee                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `decisions`                                                                                                                                                                            | legacy                                       | le domaine runtime recent se concentre sur `operational_decisions`, `decision_approvals`, `action_dispatches`, `decision_ledger_entries`; le modele `Decision` garde encore une reference historique vers `employees.id` alors que `employees` a ete retire en migration `019` | lire avec prudence, documenter comme historique, preparer la simplification                                  |
| `onboarding_states`                                                                                                                                                                    | legacy / coexistence                         | la trajectoire active de l'onboarding est le bloc BPM `onboarding_cases*` avec Camunda; `onboarding_states` reste visible comme surface historique plus simple                                                                                                                 | documenter la coexistence, reduire l'ambiguite dans les docs et requetes                                     |
| `integration_*` cote Python/Alembic                                                                                                                                                    | en convergence                               | la cible relationnelle existe et fait sens metier, mais `app-connectors` persiste encore son etat reel via snapshot/secrets/payload store                                                                                                                                      | garder la cible relationnelle comme reference, mais ne pas la confondre avec la persistence runtime actuelle |
| `connector_runtime_snapshots` / `connector_secret_records`                                                                                                                             | operable mais transitoire architecturalement | ces tables portent aujourd'hui la realite runtime de `app-connectors`                                                                                                                                                                                                          | les traiter comme realite du jour, tout en gardant ouverte la decision de convergence                        |
| routes `app-api-ts` couvertes par `liveFallbackFailure(...)`                                                                                                                           | fail-close volontaire                        | la surface existe contractuellement, mais le runtime ferme l'acces tant que la persistence ou le backend reel manque                                                                                                                                                           | ne pas vendre la route comme live; la classer explicitement dans les inventaires produit                     |
| `service_account` et `sftp` pour certains probes connecteurs                                                                                                                           | fail-close volontaire                        | certaines formes d'auth existent au runtime, mais sans probe live ou validation complete                                                                                                                                                                                       | conserver le fail-close tant que l'extracteur/probe reel n'existe pas                                        |
| `/api/v1/live/dashboard/summary`, `/api/v1/live/gold/*`, `/api/v1/live/canonical*`, `/api/v1/operational-decisions*`, surfaces admin organisations/onboarding/integrations/DecisionOps | operable                                     | routes persistantes ou reliees a un calcul/runtime reel                                                                                                                                                                                                                        | base de lecture prioritaire pour comprendre le produit du jour                                               |

## Heuristiques de decision

### Quand classer `legacy`

Classer `legacy` si:

- une nouvelle surface couvre le meme besoin de maniere plus complete;
- la doc de trajectoire et les services actifs pointent deja ailleurs;
- la surface ne doit plus servir de reference pour de nouveaux chantiers.

### Quand classer `en convergence`

Classer `en convergence` si:

- la cible et le runtime actuel coexistent;
- les deux sont encore necessaires pour comprendre la realite du systeme;
- une decision d'architecture reste ouverte.

### Quand classer `fail-close`

Classer `fail-close` si:

- l'acces est explicitement bloque par le runtime;
- il n'y a pas de fallback permissif ni de mock silencieux;
- la fermeture est un choix de securite, de confiance ou d'integrite produit.

## Cas concrets a retenir

### 1. `decisions` n'est pas la meme chose que `operational_decisions`

- `decisions` appartient au socle historique.
- `operational_decisions` porte la trace operateur actuelle.
- les read models DecisionOps (`decision_approvals`, `action_dispatches`, `decision_ledger_entries`) prolongent cette trajectoire.

Conclusion CTO:

- pour expliquer le runtime actuel, partir d'abord de `operational_decisions` et du bloc DecisionOps.

### 2. `onboarding_states` n'est plus la meilleure porte d'entree

- `onboarding_states` reste utile pour comprendre l'historique.
- `onboarding_cases`, `onboarding_case_tasks`, `onboarding_case_blockers`, `onboarding_case_events` racontent le control plane BPM reel.

Conclusion CTO:

- pour un audit du produit actuel, commencer par `onboarding_cases*`.

### 3. `integration_*` n'est pas encore la seule verite runtime

- le modele relationnel est propre et cible.
- la persistence operable de `app-connectors` reste snapshot-based aujourd'hui.

Conclusion CTO:

- il faut lire ensemble `app-api/app/models/integration.py` et `app-connectors/src/persistent-store.ts`.

### 4. Une route publique peut etre versionnee et pourtant fermee

Le contrat public ne garantit pas a lui seul qu'une surface est active en production ou en local.

Conclusion CTO:

- verifier `app-api-ts/src/routes.ts` et la presence de `liveFallbackFailure(...)` avant de conclure qu'un endpoint est reellement exploitable.

## Comment utiliser cette page

Quand une surface semble confuse:

1. commencer par `docs/cto/11-surfaces-http-et-statut.md`;
2. identifier si elle est `legacy`, `en convergence`, `fail-close` ou `operable`;
3. remonter ensuite vers les modeles, migrations, services et contrats concernes;
4. seulement ensuite ouvrir un chantier de simplification, d'industrialisation ou de convergence.
